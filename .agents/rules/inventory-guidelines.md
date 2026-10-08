---
trigger: always_on
description: Material and Finished Goods inventory, lot tracking, transaction ledger, material issuance (MRS), and area category rollups for api-server
---

# Inventory & Material Issuance Architecture Conventions

## 1. Domain Model Architecture: 2-Tier State & Immutable Ledger
Every inventory subsystem (Material Inventory, Finished Goods Inventory) must follow a 2-tier state + immutable ledger architecture:
- **Live State (`<Entity>InventoryLot` / `FinishedGoodsLot`)**: Physical stock bucket identified by compound unique keys. Stores direct decimal status fields:
  - `availableQty`: Unreserved stock ready for production, issuance, or shipment.
  - `allocatedQty`: Reserved for work orders / shipment orders.
  - `pendingQty` / `checkingQty`: Under quarantine or QA inspection.
  - `defectiveQty`: Rejected or damaged items.
  - `totalQty`: Computed resolver (`available + allocated + checking/pending + defective`).
- **Immutable Ledger (`<Entity>InventoryTransaction` / `FinishedGoodsTransaction`)**: Append-only log recording every movement event with `transactionNo`, `transactionType`, `direction` (`INBOUND`, `OUTBOUND`, `INTERNAL`), `quantity`, `balanceAfter`, `fromStatus`/`toStatus`, `fromAreaId`/`toAreaId`, `fromLocationId`/`toLocationId`, `fromBoxId`/`toBoxId`, `invoiceNo`, and `referenceNo`.

## 2. Finished Goods Item & Fabrication Pairing
- **Entity Identity**: Finished goods stock is tracked per `(itemId, fabricationId)`.
- **Formatted Item Code Invariant**:
  - Base Item: `10-00000-000`
  - With Fabrication: If the item code ends with `-000`, `-000` is replaced with the fabrication code suffix (e.g., `10-00000-100`); otherwise, the fabrication code is appended.
- **Packaging (`BoxType`)**: Lots store optional `boxId` (BoxType master), and box changes record `fromBoxId` / `toBoxId` in the transaction ledger.

## 3. Packing Area vs. Stock Area Subtotals
- `Area.category` differentiates `PACKING` vs `STOCK` storage areas.
- Inventory list rollups (`FinishedGoodsSummary`) must calculate distinct subtotals:
  - Packing: `packingAvailableQty`, `packingAllocatedQty`, `packingCheckingQty`, `packingDefectiveQty`, `packingTotalQty`.
  - Stock: `stockAvailableQty`, `stockAllocatedQty`, `stockCheckingQty`, `stockDefectiveQty`, `stockTotalQty`.
  - Grand Totals: `totalAvailableQty`, `totalAllocatedQty`, `totalCheckingQty`, `totalDefectiveQty`, `totalOnHandQty`.
  - Summary Metrics: `noLots`, `stdItemWt`, `totalWeight` (`totalOnHandQty * stdItemWt`), `totalQty`, `unitPrice` (Fabrication or Item price), `totalPrice` (`totalOnHandQty * unitPrice`).

## 4. Status Transition Matrix & Invariants
- `AVAILABLE` <-> `DEFECTIVE` (QA Reject / Rework Pass)
- `AVAILABLE` <-> `CHECKING` / `PENDING` (Quality Hold / QA Inspection Pass)
- `CHECKING` / `PENDING` <-> `DEFECTIVE` (QA Fail / Re-evaluation)
- `AVAILABLE` <-> `ALLOCATED` (Order Reservation / Cancellation)
- **Manual Out Invariant**: Can **ONLY** deduct from `AVAILABLE` quantity (`availableQty >= quantity`).
- **Discard Invariant**: Can **ONLY** deduct from `DEFECTIVE` quantity (`defectiveQty >= quantity`).
- **Movement Invariant**: Atomically decrements source lot and upserts destination lot across different areas/locations.

## 5. Atomic Mutation Execution
- Execute all stock adjustments inside `prisma.$transaction`.
- Always use atomic `{ increment: qty }` and `{ decrement: qty }` rather than manual read-then-write calculations.
- For new/transferred stock, use `upsert` against the compound unique key:
  - Material: `@@unique([materialId, lotNo, receivingReportNo, areaId, locationId])`
  - Finished Goods: `@@unique([itemId, fabricationId, orderNo, lotNo, chargeNo, areaId, locationId, boxId])`
- Invalidate request-scoped DataLoaders (`loader.clear(lotId)`) after every mutation.
- Log every mutation to `AuditTrailService`.

## 6. Material Issuance (MRS) Guidelines
- Material Issuance must use a normalized 2-table model:
  - `MaterialIssuance`: Header record (`mrsNo`, `mrsDate`, `sectionId`, `requestorId`, `remarks`, `totalItems`, `totalQty`).
  - `MaterialIssuanceItem`: Child line items (`materialId`, `materialInventoryLotId`, `lotNo`, `areaId`, `locationId`, `quantity`, `remarks`).
- Issuance can **ONLY** deduct from `AVAILABLE` quantity (`availableQty >= item.quantity`).
- Every issuance atomically logs an `OUTBOUND` `MaterialInventoryTransaction` with `transactionType: "ISSUANCE"`, `fromStatus: "AVAILABLE"`, and `referenceNo: mrsNo`.

## 7. Filtering & Query Conventions
- **Finished Goods Inventory List (`FinishedGoodsSummaryFilterInput`)**: Filter by `search`, `itemCode`, `itemName`, `description`, `itemTypeId`, `rawMaterialId`, `fabCode`.
- **Finished Goods Lot Queries (`FinishedGoodsLotFilterInput`)**: Filter by `orderNo`, `lotNo`, `chargeNo`, `trialLotNo`, `invoiceNo`, `areaId`, `locationId`, `boxId`, `areaCategory`, `stickerPrinted`.
- **Transaction Queries (`FinishedGoodsTransactionFilterInput`)**: Filter by `direction`, `transactionDate` range (`gte`, `lte`), `lotNo`, `orderNo`, `invoiceNo`, `itemCode`, `areaId`, `locationId`, `fromAreaId`/`toAreaId`, `fromLocationId`/`toLocationId`, `fromBoxId`/`toBoxId`, `fromStatus`/`toStatus`, `transactionType`.
