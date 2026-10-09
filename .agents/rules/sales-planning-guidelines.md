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
- **Net Demand & Buffer Calculation**:
  $$\text{Remaining Demand} = \max(0, \text{orderQty} - \text{allocatedQty})$$
  $$\text{Required Buffer Qty} = \text{Remaining Demand} \times \left(1 + \frac{\text{item.rejectionRate}}{100}\right)$$
- **Working Days & Deadlines**:
  - Baseline deadline = `requestedETD`.
  - $\text{expectedShippingDate} = \text{requestedETD} - 6 \text{ working days}$ (excluding `Holiday` calendar and weekends).
  - $\text{Target Completion Deadline} = \text{expectedShippingDate} - 5 \text{ working days}$ (1 week buffer).
- **Routing & Lot Constraints**:
  - $1 \text{ Slip} = 1 \text{ Lot}$ (`ProductionSlip`), chained with `ProductionProcess` (`previousProcessId` $\leftrightarrow$ `nextProcesses`).
  - Stagger lots of the same base item across sequential working days unless allowed by `maxConcurrentLotsPerDay`.
  - Section & process capacity limits: $\sum \text{pcs on date } D \text{ for process } P \le P.\text{maxPcsPerDay}$.
