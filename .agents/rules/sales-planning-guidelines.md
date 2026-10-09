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
