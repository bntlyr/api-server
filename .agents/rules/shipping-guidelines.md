# Shipping, Palletization & Logistics Architecture Conventions

## 1. Domain Model Hierarchy & Entity Architecture
The shipping subsystem follows a hierarchical container model:
- **`Shipment`**: Header entity containing logistics information (`shipmentNo`, `invoiceNo`, `shipmentDate`, `freightType`, `courier`, `containerNo`, `sealNo`, `portOfDestination`, `customerId`, `shippingAddress`, `defaultPalletTypeId`, `maxPalletLimit`).
- **`PalletContainer`**: Intermediate aggregation container (`palletNo`, `sequenceNo`, `palletTypeId`, `sealStatus`, `tareWeight`, `netWeight`, `grossWeight`, `maxCapacity`). Max default capacity is **40 boxes** and max limit is **30 pallets** per shipment (can be forced).
- **`BoxContainer`**: Reuses existing packing containers by linking `palletContainerId`, `sequenceInPallet` ($1..40$), and `shippingBoxNo`.
- **`SalesOrder`**: Associated directly via `shipmentId`, with tracking updates on dispatch.

## 2. Capacity Limits & Soft Rule Invariants
| Entity / Scope | Default Limit | Behavior | Force Override |
|---|---|---|---|
| **Pallet Capacity** | 40 Boxes | Blocks additions/moves $> 40$ | Allowed via `force: true` |
| **Shipment Capacity** | 30 Pallets | Blocks allocation $> 30$ | Allowed via `force: true` |
| **Shipment Total Boxes** | 1,200 Boxes ($30 \times 40$) | Blocks allocation $> 1,200$ | Allowed via `force: true` |
| **Pallet Seal Status** | `UNSEALED` | Blocks box move/removal if `SEALED` | Requires explicit unseal |
| **Shipment Finalize** | 100% `SEALED` | Blocks finalization if any pallet is `UNSEALED` | Strict invariant |

## 3. Numbering Regulations & Pure Generators
- **12-Digit Box Number (`generateBoxNo`)**:
  $$\mathbf{P\ \{YY\}\ \{MonthCode\ A\text{-}L\}\ \{DD\}\ \{DailySeries\}\ \{BoxSeries\}}$$
  - Example: `P26J09010001` (Country `P`, Year `26`, Month `J` for October, Day `09`, DailySeries `01`, Box `0001`).
  - Resets per shipment starting from `0001` to `1200`.
- **Continuous Annual Invoice Number (`generateInvoiceNo`)**:
  $$\mathbf{CE\text{-}\{YY\}\text{-}\{FreightType\}\text{-}\{AnnualSeries\}[Suffix]}$$
  - Sea Freight: `CE-26-S-0001`
  - Air Freight: `CE-26-A-0001`
  - Local Shipment: `CE-26-L-0001S`
- **Pallet Number (`generatePalletNo`)**:
  $$\mathbf{P\{SequenceNo\}}\quad (\text{or plain sequence: } \mathbf{\{SequenceNo\}})$$
  - Example: `P1`, `P2`, `P3` (up to `P30`).
- **Shipment Number (`generateShipmentNo`)**:
  $$\mathbf{SHP\text{-}\{YYYYMMDD\}\text{-}\{DailySeries\}}$$
  - Example: `SHP-20261009-001`.

## 4. Shipping Lifecycle & State Machine
1. **`PREPARING`**:
   - Initial state. Header, customer, orders, pallets, and box assignments are fully editable.
   - Operations: `addBoxesToShipment`, `moveBoxContainer`, `removeBoxFromPallet`, `reallocateShipmentBoxes`, `togglePalletSeal`.
   - Adding boxes fills partially full `UNSEALED` pallets first before creating new `PalletContainer` records.
2. **`FINALIZED`**:
   - Requires all pallets in the shipment to be in `SEALED` status.
   - Locks the shipment against modifications.
   - Allows document exports (Packing List, Sales Invoice, Shipout Checklist).
   - Reversible via `undoFinalizeShipment`.
3. **`SHIPPED` (Irreversible)**:
   - Dispatches the shipment from the warehouse.
   - Atomically deducts `allocatedQty` / `availableQty` from matching `FinishedGoodsLot` records.
   - Records outbound `FinishedGoodsTransaction` with `direction: "OUTBOUND"` and `transactionType: "SHIPMENT"`.
   - Marks `BoxContainer.status = "SHIPPED"`.
   - Updates `SalesOrder.shippedQty` and marks `shippingStatus = "Shipped"` (`status = "Completed"` if fully fulfilled).
