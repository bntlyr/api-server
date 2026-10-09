# Sales Order & Production Planning Architecture Conventions

## 1. Multi-Phase Status Architecture
Every Sales Order must track lifecycle progress using separated, phase-specific statuses alongside the overarching system status:
- **`status`**: Overall lifecycle status (`"Pending"`, `"Planning"`, `"Production"`, `"Shipping"`, `"Shipped"`, `"Completed"`, `"Cancelled"`).
- **`productionPlanningStatus`**: Planning stage status (`"Locked"`, `"Planned"`, `"Cancelled"`).
- **`productionStatus`**: Shop floor execution status (`"Pending"`, `"Delay"`, `"On-Time"`, `"Completed"`, `"Incomplete"`, `"Short"`, `"Advanced"`, `"Cancelled"`).
- **`shippingStatus`**: Packaging & dispatch status (`"For-Shipment"`, `"Preparing"`, `"Finalized"`, `"Shipped"`, `"Completed"`, `"Cancelled"`).

### Cancellation Cascade Invariant
When a Sales Order is cancelled (`cancelSalesOrder`):
- All 4 status fields (`status`, `productionPlanningStatus`, `productionStatus`, `shippingStatus`) are atomically set to `"Cancelled"`.
- Any linked pending `FinishedGoodsAllocationRequest` records are automatically cancelled and soft-deleted.

---

## 2. Sales Order Numbering & Ingestion Pipeline
- **Numbering Scheme**:
  - Customer codes `CJC` and `CAC`: Preserve the uploaded Excel `order_no`.
  - Other customer codes: Auto-generate sequential numbers using atomic counter `OrderSequence` (e.g., `SATO-0000001`).
- **Extensible Validation Pipeline**:
  - Implement validation and data sanitization using modular rule classes implementing `SalesOrderValidationRule` and `SalesOrderTransformRule`.
  - Registered rules: `RequiredFieldsRule`, `FreightTypeRule` (`"Sea"`, `"Land"`, `"Air"`), `ItemResolutionRule` (base item vs. fabrication suffix), `PriceVerificationRule` (strict comparison against master DB prices), and `OrderExistenceAndDuplicateRule`.

---

## 3. Finished Goods (FG) Allocation Subsystem
- **Available Stock Query Invariants (`availableFgStockForOrder`)**:
  - Restricted to lots in `Area.category = 'STOCK'` with `availableQty > 0`.
  - Fabrication orders: Query exact fabrication lots **and** base item lots (`code = '000'`).
  - Base item orders: Query base item lots only.
  - Return a merged shape combining physical lot information with existing allocation request state (`"Pending"`, `"Accepted"`, `"Rejected"`, `"Canceled"`).
- **Warehouse Approval Workflow (SIV-23)**:
  - Approval requires specifying `destinationAreaId` and `destinationLocationId`.
  - Atomically inside `prisma.$transaction`:
    1. Decrement `FinishedGoodsLot.availableQty` and increment `FinishedGoodsLot.allocatedQty`.
    2. Write immutable ledger `FinishedGoodsTransaction` with `direction: "INTERNAL"`, `transactionType: "ALLOCATION"`, `referenceNo: salesOrder.orderNo`.
    3. Increment `SalesOrder.allocatedQty`.
    4. Set `FinishedGoodsAllocationRequest.status = "Accepted"`.
- **Auto-Transition to `"Planned"`**:
  - When `salesOrder.allocatedQty >= salesOrder.orderQty`, automatically transition `productionPlanningStatus = "Planned"`, `status = "Shipping"`, and `shippingStatus = "For-Shipment"`.

---

## 4. Production Planning & Scheduling Invariants
- **3-Tier Hierarchy (No `ProductionPlan` table)**:
  - Hierarchy: `SalesOrder` $\rightarrow$ `ProductionSlip` (1 Slip = 1 Lot) $\rightarrow$ `ProductionProcess` (Chained Work Orders with `previousProcessId`).
  - `SalesOrder` holds `productionId: String?`, `scheduledStartDate: DateTime?`, `scheduledEndDate: DateTime?`, `scheduledTotalDays: Decimal?`.
- **Net Demand & Scrap Multiplier Calculation**:
  $$\text{Net Required Qty} = \max(0, \text{orderQty} - \text{allocatedQty})$$
  $$\text{Total Production Qty} = \left\lceil \text{Net Required Qty} \times \left(1 + \frac{\text{item.rejectionRate}}{100}\right) \right\rceil$$
  $$\text{Lot Count} = \left\lceil \frac{\text{Total Production Qty}}{\text{item.autoSplitQty}} \right\rceil$$
  - Split $\text{Total Production Qty}$ across lots: Lot $1 \dots N-1 = \text{autoSplitQty}$, Lot $N = \text{remainder}$.
  - Lot numbering: `${orderNo}-01`, `${orderNo}-02`, ..., `${orderNo}-0N`.
- **Working Days Calendar & Buffers**:
  - Baseline target completion = $\text{requestedETD} - 6 \text{ working days (shipping buffer)} - 6 \text{ working days (planning buffer)} = \text{subtractWorkingDays}(\text{requestedETD}, 12)$.
  - Working days calculation excludes Sundays and `Holiday` table dates. Saturdays are included as working days by default (`includeSaturday = true`).
  - Max working hours per day = 14h (`maxWorkingHoursPerDay = 14.0`).
- **Backward vs. Forward Scheduling**:
  - Execute Backward scheduling from `targetEndDate`.
  - If calculated start date is before today, automatically switch to Forward scheduling starting tomorrow (`today + 1 working day`) and flag `isDelayed = true` with `delayWorkingDays`.
  - When user provides `startDateOverride`, execute Forward scheduling starting from that date.
- **Multi-Lot Batch Clustering (`maxConcurrentLots`)**:
  - `maxConcurrentLots` dictates how many lots can start on the same working day.
  - Base lots are offset into batches by $\lfloor \text{lotIndex} / \text{maxConcurrentLots} \rfloor$ working days.
- **Fabrication Synchronization Barrier**:
  - Base Item Stage: `ItemRoute` steps *excluding* steps where `hasPacking = true`.
  - Synchronization Barrier: **All lots start their fabrication phase on the EXACT SAME common start date** ($\text{fabCommonStartDate} = \text{maxEndDate of all base lots} + 1 \text{ working day}$).
  - Fabrication Stage: `FabRoute` steps in sequence (including final inspection & packing step).
- **Daily Capacity & Load Tracking**:
  - On date $D$ for process $P$, if $\sum \text{scheduledPcs} + \text{lotQty} > P.\text{maxPcsPerDay}$ (or $\text{weight} > P.\text{maxWeightPerDay}$), shift process date by 1 working day and record `CapacityWarning`.
- **Java Microservice Architecture**:
  - Heavy algorithmic computation is delegated to `java-server` (`POST /api/v1/scheduler/schedule`).
  - `api-server` orchestrates DB retrieval, prepares DTOs, calls Java service, and executes atomic transaction to persist `ProductionSlip` and `ProductionProcess` rows.

---

## 5. Production Execution & Shop Floor Operations

### Process Lifecycle State Machine
Every chained `ProductionProcess` work order follows a strictly enforced linear transition model:
$$\text{Pending} \xrightarrow{\text{IN (Receive)}} \text{Received} \xrightarrow{\text{DTR Start}} \text{In-Progress} \xrightarrow{\text{BOOK / ASSIGN BOX}} \text{Completed} \xrightarrow{\text{OUT (Transfer)}} \mathbf{Transferred}$$

- **`Pending`**: Default state awaiting upstream dispatch.
- **`Received` (`IN`)**: Step received physically at the workstation. **Invariant**: Cannot be received unless the previous process in the chain is in `Transferred` status (Step 1 is exempt).
- **`In-Progress` (`DTR Start`)**: Worker commences job session. Automatically transitions process from `Received` $\rightarrow$ `In-Progress`.
- **`Completed` (`BOOK` / `ASSIGN BOX`)**: Final output and scrap tallies recorded (`passedQty`, `rejectedQty`, `reworkQty1..3`).
- **`Transferred` (`OUT`)**: **The terminal status for every process**. Parts dispatched to the next station or finished goods packaging.

### Worker DTR (Daily Time Record) History
- **Append-Only Tracking (`ProductionDtr`)**:
  - Each `startDtr` creates a new record with `status: "Started"`, `startTime: now()`, `currentProcessName: process.processName`, and `userId`.
  - Each `stopDtr` sets `status: "Stopped"`, `endTime: now()`, and calculates `durationMinutes`.
  - Active worker monitoring (`activeWorkerDtrs` query) retrieves non-stopped DTR sessions across sections.
- **Cumulative Quantity Cap Invariant**:
  $$\sum_{\text{all stopped DTRs}} (\text{passedQty} + \text{rejectedQty} + \text{reworkQty}) \le \text{ProductionProcess.neededQty}$$
  No worker session can record quantities exceeding the remaining unproduced balance for that process step.

### Reject Shrinkage & Upstream Handover (`OUT`)
- On `transfer` (`OUT`), the next downstream process step automatically inherits the passed quantity:
  $$\text{NextProcess.neededQty} = \text{CurrentProcess.passedQty}$$
- If the current step is the final process of the lot, `ProductionSlip.status` transitions to `Completed`.
- When all slips for a `SalesOrder` complete, `SalesOrder.productionStatus` transitions to `Completed`, `status` to `Shipping`, and `shippingStatus` to `For-Shipment`.

### Booking Transaction Ledger & Section Defect Analysis
- **`Booking` Model**: Immutable ledger recording inspection tallies (`passedQty`, `rejectedQty`, `reworkQty1..3`), `totalInspectedQty`, and `actualParameters: Json?` (for runtime temperatures, pressures, cycle times, CMM GD&T dimensions).
- **Process-Specific Defect Tracking**:
  - `WaxDefect`: Soluble core, wrinkles, burrs, parting line offset, shrinkage, mould defects, droplets, deformation, injection damage.
  - `CoatingDefect`: Sand inclusion, swelling, fin run, pimple, projection, rough surface, broken shell, coating defect.
  - `CastingDefect`: Runout, misrun, shrinkage, pinhole, slag inclusion, oxide, crack/break, broken casting.
  - `PrefinDefect`: Over-cut, over-shot, sandblast, ceramics, gate burr, over-grind, TIG weld, machine damage, strain marks, wax residue.
  - `FabDefect`: GD&T (position, parallelism, perpendicularity, concentricity, flatness, symmetry, runout), dimensional tolerances (hole diameter, thickness, pitch, thread, depth, chamfer), tool marks, deburring.
  - `MimDefect`: Crack, cavity, rough surface, spatter, sticking, chipping, deformation, size, evaporation, gate, weldline, jetting, sintering.
- **Defect Sum Invariant**:
  $$\sum \text{Defect Counts} \le \text{rejectedQty} + \sum \text{reworkQty}$$

### BoxContainer Packaging & Deferred Inventory Handover
- **2-Tier Box Model (`BoxContainer` & `BoxContainerItem`)**:
  - `BoxContainer` acts as the physical packaging unit allocated to a `salesOrderId` / `orderNo`.
  - `BoxContainerItem` preserves full lot traceability (`orderNo`, `lotNo`, `chargeNo`, `itemId`, `fabricationId`, `productionSlipId`).
  - Container tracks physical storage via `areaId` (Area FK) and `locationId` (Location FK).
- **Staging vs. Transfer Inventory Invariant**:
  - **Pre-Transfer (Staging)**: While the packing step is active/booked, workers can create containers (`status: "OPEN"` in Packing Area), add/remove pieces, edit weights, or mark `status: "CLOSED"`. **No `FinishedGoodsLot` or `FinishedGoodsTransaction` is created at this stage.**
  - **Official Handover on `OUT` (`transferProductionProcess`)**: When the final packing process is **`Transferred`**:
    1. Locks all associated `BoxContainer` records.
    2. Atomically upserts `FinishedGoodsLot` physical stock in the container's designated `areaId` and `locationId`.
    3. Writes immutable inbound `FinishedGoodsTransaction` (`transactionType: "PRODUCTION"`, `direction: "INBOUND"`, `referenceNo: boxContainer.boxNo`).
    4. Increments `SalesOrder.packedQty` and `SalesOrder.producedQty`.
    5. Completes `ProductionSlip.status = "Completed"`. If all slips complete, transitions `SalesOrder` to `"Shipping"`.

### In-Process Rework Lot Generation & Rework Limits
- **Automatic Rework Trigger**: When booking a process with $Q_{\text{rework}} = \text{reworkQty1} + \text{reworkQty2} + \text{reworkQty3} > 0$:
  1. Spawns an independent `ProductionSlip` (`type: "REWORK"`, `lotNo: ${parentLotNo}-R${index}`).
  2. Natively schedules Step 1 (the rework corrective step with `isRework: true`, `scheduledStartDate: today`, `scheduledEndDate: today`).
  3. Clones all downstream processes from the parent slip ($P_{k+1} \dots P_n$) with `neededQty = Q_rework`, `scheduledStartDate: today`, and chains them via `previousProcessId`.
- **Rework Limits & Fabrication Bonus**:
  - **Base Limit**: Max **3 reworks** per parent lot (`-R1`, `-R2`, `-R3`).
  - **Fabrication Bonus (+1)**: Reworks occurring during a **Fabrication process** (`process.isFabrication = true`) gain **+1 additional rework bonus**, allowing up to **4 total reworks** (`-R4`).
  - **Cap Enforcement**: If `existingReworkCount >= maxLimit` (4 for fab, 3 otherwise), booking with `reworkQty > 0` is rejected with `UserError` requiring remaining defective parts to be logged as scrap (`rejectedQty`).

### Production Remake Eligibility & Remake Scheduling
- **Remake Eligibility Evaluation (`checkRemakeEligibility`)**:
  - Scrap buffer is calculated against the net demand:
    $$\text{Net Demand} = \max(0, \text{orderQty} - \text{allocatedQty})$$
    $$\text{Total Original Scheduled Qty} = \sum \text{ProductionSlip(ORIGINAL).totalQty}$$
    $$\text{Scrap Buffer} = \max(0, \text{Total Original Scheduled Qty} - \text{Net Demand})$$
  - Remake is triggered when cumulative rejects across all slip processes exceed the planned scrap buffer:
    $$\text{isRemakeEligible} = (\sum \text{rejectedQty} > \text{Scrap Buffer})$$
    $$\text{Shortfall Qty} = \sum \text{rejectedQty} - \text{Scrap Buffer}$$
    $$\text{Suggested Remake Qty} = \left\lceil \text{Shortfall Qty} \times \left(1 + \frac{\text{item.rejectionRate}}{100}\right) \right\rceil$$
- **Remake Scheduling Invariants (`previewRemakeSchedule` & `createRemakeSchedule`)**:
  - Reuses the Java scheduling engine (`POST /api/v1/scheduler/schedule`) with all committed shop-floor load included.
  - **Preservation of Existing Slips**: Remake scheduling **never deletes** existing slips or processes; it appends new slips with `type: "REMAKE"` and lot numbering `RM-1`, `RM-2`, etc.
  - All `ProductionProcess` work orders on the remake slip start with `status: "Pending"`, `isCompleted: false`, `isReceived: false`.


