import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShippingNumberGenerator } from "./utils/shipping-number.generator.js";
import { ShippingAllocationHelper } from "./helpers/shipping-allocation.helper.js";
import { PalletContainerService } from "./pallet-container.service.js";
import { ShipmentService } from "./shipment.service.js";

describe("Large-Scale Shipping Simulation & Multi-Pallet Lifecycle", () => {
  let shipmentService: ShipmentService;
  let palletService: PalletContainerService;

  // In-memory mock database to simulate real relational database state
  let dbShipments: any[];
  let dbPallets: any[];
  let dbBoxes: any[];
  let dbSalesOrders: any[];
  let dbFinishedGoodsLots: any[];
  let dbTransactions: any[];
  let dbPalletTypes: any[];

  let mockPrisma: any;
  let mockShipmentLoader: any;
  let mockPalletLoader: any;
  let mockBoxLoader: any;
  let mockAudit: any;

  beforeEach(() => {
    dbShipments = [];
    dbPallets = [];
    dbBoxes = [];
    dbSalesOrders = [];
    dbFinishedGoodsLots = [];
    dbTransactions = [];
    dbPalletTypes = [
      { id: 1, name: "Standard Wooden Pallet", weight: 20.0 },
      { id: 2, name: "Heavy Duty Plastic Pallet", weight: 15.0 },
    ];

    mockPrisma = {
      palletType: {
        findUnique: vi.fn(({ where }) => dbPalletTypes.find((pt) => pt.id === where.id) || null),
      },
      shipment: {
        findUnique: vi.fn(({ where, include }) => {
          const s = dbShipments.find((item) => item.id === where.id && !item.deleted);
          if (!s) return null;
          const result = { ...s };
          if (include?.pallets) {
            result.pallets = dbPallets
              .filter((p) => p.shipmentId === s.id && !p.deleted)
              .map((p) => {
                const pCopy = { ...p };
                if (include.pallets.include?.boxContainers) {
                  pCopy.boxContainers = dbBoxes.filter(
                    (b) => b.palletContainerId === p.id && !b.deleted,
                  );
                }
                return pCopy;
              });
          }
          if (include?.salesOrders) {
            result.salesOrders = dbSalesOrders.filter(
              (so) => so.shipmentId === s.id && !so.deleted,
            );
          }
          return result;
        }),
        count: vi.fn(async ({ where }) => {
          return dbShipments.filter((s) => {
            if (s.deleted) return false;
            if (where?.shipmentDate?.gte && s.shipmentDate < where.shipmentDate.gte) return false;
            if (where?.shipmentDate?.lte && s.shipmentDate > where.shipmentDate.lte) return false;
            return true;
          }).length;
        }),
        create: vi.fn(async ({ data }) => {
          const created = {
            id: dbShipments.length + 1,
            ...data,
            deleted: false,
            createdAt: new Date(),
          };
          dbShipments.push(created);
          return created;
        }),
        update: vi.fn(async ({ where, data }) => {
          const s = dbShipments.find((item) => item.id === where.id);
          if (!s) throw new Error("Shipment not found");
          Object.assign(s, data);
          return s;
        }),
        delete: vi.fn(async ({ where }) => {
          const s = dbShipments.find((item) => item.id === where.id);
          if (s) s.deleted = true;
          return s;
        }),
      },
      palletContainer: {
        findUnique: vi.fn(({ where, include }) => {
          const p = dbPallets.find((item) => item.id === where.id && !item.deleted);
          if (!p) return null;
          const result = { ...p };
          if (include?.shipment) {
            result.shipment = dbShipments.find((s) => s.id === p.shipmentId);
          }
          if (include?.palletType) {
            result.palletType = dbPalletTypes.find((pt) => pt.id === p.palletTypeId);
          }
          if (include?.boxContainers) {
            result.boxContainers = dbBoxes.filter(
              (b) => b.palletContainerId === p.id && !b.deleted,
            );
          }
          return result;
        }),
        findMany: vi.fn(async ({ where }) => {
          return dbPallets.filter((p) => {
            if (p.deleted) return false;
            if (where?.shipmentId && p.shipmentId !== where.shipmentId) return false;
            return true;
          });
        }),
        create: vi.fn(async ({ data }) => {
          const created = {
            id: dbPallets.length + 1,
            ...data,
            deleted: false,
            createdAt: new Date(),
          };
          dbPallets.push(created);
          return created;
        }),
        update: vi.fn(async ({ where, data }) => {
          const p = dbPallets.find((item) => item.id === where.id);
          if (!p) throw new Error("Pallet not found");
          Object.assign(p, data);
          return p;
        }),
        delete: vi.fn(async ({ where }) => {
          const p = dbPallets.find((item) => item.id === where.id);
          if (p) p.deleted = true;
          return p;
        }),
      },
      boxContainer: {
        findUnique: vi.fn(({ where, include }) => {
          const b = dbBoxes.find((item) => item.id === where.id && !item.deleted);
          if (!b) return null;
          const result = { ...b };
          if (include?.palletContainer) {
            const p = dbPallets.find((item) => item.id === b.palletContainerId);
            if (p) {
              result.palletContainer = {
                ...p,
                shipment: dbShipments.find((s) => s.id === p.shipmentId),
              };
            }
          }
          return result;
        }),
        findMany: vi.fn(async ({ where }) => {
          return dbBoxes.filter((b) => {
            if (b.deleted) return false;
            if (where?.id?.in && !where.id.in.includes(b.id)) return false;
            if (where?.salesOrderId?.in && !where.salesOrderId.in.includes(b.salesOrderId)) return false;
            if (where?.palletContainerId === null && b.palletContainerId !== null) return false;
            if (where?.palletContainerId && b.palletContainerId !== where.palletContainerId) return false;
            if (where?.id?.not && b.id === where.id.not) return false;
            return true;
          });
        }),
        update: vi.fn(async ({ where, data }) => {
          const b = dbBoxes.find((item) => item.id === where.id);
          if (!b) throw new Error("Box not found");
          Object.assign(b, data);
          return b;
        }),
      },
      salesOrder: {
        findUnique: vi.fn(({ where }) => dbSalesOrders.find((so) => so.id === where.id) || null),
        updateMany: vi.fn(async ({ where, data }) => {
          const matches = dbSalesOrders.filter((so) => where.id?.in?.includes(so.id));
          matches.forEach((so) => Object.assign(so, data));
          return { count: matches.length };
        }),
        update: vi.fn(async ({ where, data }) => {
          const so = dbSalesOrders.find((item) => item.id === where.id);
          if (!so) throw new Error("SalesOrder not found");
          Object.assign(so, data);
          return so;
        }),
      },
      finishedGoodsLot: {
        findFirst: vi.fn(async ({ where }) => {
          return (
            dbFinishedGoodsLots.find(
              (lot) =>
                lot.itemId === where.itemId &&
                lot.fabricationId === where.fabricationId &&
                lot.orderNo === where.orderNo &&
                lot.lotNo === where.lotNo,
            ) || null
          );
        }),
        update: vi.fn(async ({ where, data }) => {
          const lot = dbFinishedGoodsLots.find((l) => l.id === where.id);
          if (!lot) throw new Error("Lot not found");
          Object.assign(lot, data);
          return lot;
        }),
      },
      finishedGoodsTransaction: {
        create: vi.fn(async ({ data }) => {
          const tx = { id: dbTransactions.length + 1, ...data };
          dbTransactions.push(tx);
          return tx;
        }),
      },
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    };

    mockShipmentLoader = { byId: { load: vi.fn() }, clear: vi.fn() };
    mockPalletLoader = {
      byId: { load: vi.fn() },
      byShipmentId: { load: vi.fn() },
      clear: vi.fn(),
    };
    mockBoxLoader = { clear: vi.fn() };
    mockAudit = { log: vi.fn().mockResolvedValue(undefined) };

    palletService = new PalletContainerService(
      mockPrisma as any,
      mockPalletLoader as any,
      mockShipmentLoader as any,
      mockBoxLoader as any,
      mockAudit as any,
    );

    shipmentService = new ShipmentService(
      mockPrisma as any,
      mockShipmentLoader as any,
      mockPalletLoader as any,
      mockBoxLoader as any,
      mockAudit as any,
    );
  });

  it("Scenario 1: Full lifecycle of a shipment housing 100 boxes across 3 pallets", async () => {
    // 1. Seed 1 Sales Order with 100 boxes (total 2,500 pcs)
    const salesOrder = {
      id: 10,
      orderNo: "SO-EXPORT-001",
      salesOrderNo: "ORD-2026-001",
      orderQty: 2500,
      shippedQty: 0,
      shippingStatus: "For-Shipment",
      status: "Production",
      deleted: false,
    };
    dbSalesOrders.push(salesOrder);

    // Seed matching Finished Goods stock
    const fgLot = {
      id: 50,
      itemId: 100,
      fabricationId: 10,
      orderNo: "SO-EXPORT-001",
      lotNo: "LOT-A1",
      chargeNo: "CHG-99",
      availableQty: 500,
      allocatedQty: 2500,
      checkingQty: 0,
      defectiveQty: 0,
      areaId: 1,
      locationId: 2,
      boxId: 1,
      deleted: false,
    };
    dbFinishedGoodsLots.push(fgLot);

    // Create 100 packed Box Containers (25 pcs each, 12kg gross, 10kg net)
    for (let i = 1; i <= 100; i++) {
      dbBoxes.push({
        id: i,
        boxNo: `BOX-${String(i).padStart(4, "0")}`,
        salesOrderId: 10,
        orderNo: "SO-EXPORT-001",
        palletContainerId: null,
        sequenceInPallet: null,
        shippingBoxNo: null,
        totalQty: 25,
        netWeight: 10.0,
        grossWeight: 12.0,
        status: "CLOSED",
        deleted: false,
        items: [
          {
            id: 1000 + i,
            salesOrderId: 10,
            itemId: 100,
            fabricationId: 10,
            orderNo: "SO-EXPORT-001",
            lotNo: "LOT-A1",
            chargeNo: "CHG-99",
            quantity: 25,
            deleted: false,
          },
        ],
      });
    }

    // 2. Create Shipment with auto-allocation of all 100 boxes
    const shipmentDate = new Date(2026, 9, 9); // Oct 9, 2026
    console.log("\n========================================================");
    console.log("🚢 STEP 1: Creating Shipment & Auto-Allocating 100 Boxes");
    console.log("========================================================");
    const createRes = await shipmentService.create({
      shipmentDate,
      freightType: "SEA",
      courier: "Maersk Line",
      containerNo: "MSKU9876543",
      sealNo: "SEAL-554433",
      portOfDestination: "Tokyo, Japan",
      defaultPalletTypeId: 1, // Wooden Pallet (20kg tare)
      salesOrderIds: [10],
    });

    expect(createRes.userErrors).toHaveLength(0);
    const shipment = createRes.shipment!;
    console.log(`✅ Created Shipment: ${shipment.shipmentNo} | Status: ${shipment.status}`);
    console.log(`   Invoice No: ${shipment.invoiceNo} | Freight: ${shipment.freightType} | Courier: ${shipment.courier}`);
    console.log(`   Container: ${shipment.containerNo} | Seal: ${shipment.sealNo} | Destination: ${shipment.portOfDestination}`);

    // 3. Verify Pallet Chunking & Allocation
    expect(dbPallets).toHaveLength(3);

    const pallet1 = dbPallets[0];
    const pallet2 = dbPallets[1];
    const pallet3 = dbPallets[2];

    console.log("\n📦 Generated Pallets Breakdown:");
    dbPallets.forEach((p) => {
      const bCount = dbBoxes.filter((b) => b.palletContainerId === p.id).length;
      console.log(`   ├─ Pallet #${p.sequenceNo} [${p.palletNo}]: ${bCount} boxes | Tare: ${p.tareWeight}kg | Net: ${p.netWeight}kg | Gross: ${p.grossWeight}kg | Seal: ${p.sealStatus}`);
    });

    const p1Boxes = dbBoxes.filter((b) => b.palletContainerId === pallet1.id);
    const p2Boxes = dbBoxes.filter((b) => b.palletContainerId === pallet2.id);
    const p3Boxes = dbBoxes.filter((b) => b.palletContainerId === pallet3.id);

    console.log(`   └─ Box 12-Digit Sample Codes:`);
    console.log(`      • Pallet 1 Box 1: ${p1Boxes[0].shippingBoxNo} | Box 40: ${p1Boxes[39].shippingBoxNo}`);
    console.log(`      • Pallet 2 Box 1: ${p2Boxes[0].shippingBoxNo} | Box 40: ${p2Boxes[39].shippingBoxNo}`);
    console.log(`      • Pallet 3 Box 1: ${p3Boxes[0].shippingBoxNo} | Box 20: ${p3Boxes[19].shippingBoxNo}`);

    expect(p1Boxes).toHaveLength(40);
    expect(p2Boxes).toHaveLength(40);
    expect(p3Boxes).toHaveLength(20);
    expect(p1Boxes[0].shippingBoxNo).toBe("P26J09010001");
    expect(p1Boxes[39].shippingBoxNo).toBe("P26J09010040");
    expect(p2Boxes[0].shippingBoxNo).toBe("P26J09010041");
    expect(p3Boxes[19].shippingBoxNo).toBe("P26J09010100");

    // 4. Test Adding More Boxes later (Add 25 more boxes)
    console.log("\n========================================================");
    console.log("➕ STEP 2: Adding 25 More Boxes to Shipment");
    console.log("========================================================");
    for (let i = 101; i <= 125; i++) {
      dbBoxes.push({
        id: i,
        boxNo: `BOX-${String(i).padStart(4, "0")}`,
        salesOrderId: 10,
        orderNo: "SO-EXPORT-001",
        palletContainerId: null,
        sequenceInPallet: null,
        shippingBoxNo: null,
        totalQty: 25,
        netWeight: 10.0,
        grossWeight: 12.0,
        status: "CLOSED",
        deleted: false,
        items: [
          {
            id: 1000 + i,
            salesOrderId: 10,
            itemId: 100,
            fabricationId: 10,
            orderNo: "SO-EXPORT-001",
            lotNo: "LOT-A1",
            chargeNo: "CHG-99",
            quantity: 25,
            deleted: false,
          },
        ],
      });
    }

    const addBoxesRes = await shipmentService.addBoxes({
      shipmentId: String(shipment.id),
      boxContainerIds: Array.from({ length: 25 }, (_, i) => 101 + i),
    });

    expect(addBoxesRes.userErrors).toHaveLength(0);
    expect(dbPallets).toHaveLength(4);

    const updatedP3Boxes = dbBoxes.filter((b) => b.palletContainerId === pallet3.id);
    const pallet4 = dbPallets[3];
    const p4Boxes = dbBoxes.filter((b) => b.palletContainerId === pallet4.id);

    console.log(`✅ Pallet #3 filled to: ${updatedP3Boxes.length} boxes (Max 40)`);
    console.log(`✅ New Pallet #4 created [${pallet4.palletNo}] holding remainder: ${p4Boxes.length} boxes`);

    // 5. Test Moving a box between unsealed pallets
    console.log("\n========================================================");
    console.log("🔄 STEP 3: Moving Box & Testing Capacity / Force Override");
    console.log("========================================================");
    const boxToMove = p4Boxes[0];
    const moveFailRes = await palletService.moveBox({
      boxContainerId: boxToMove.id,
      targetPalletContainerId: pallet1.id,
      force: false,
    });
    console.log(`ℹ️  Move without force on full pallet (40 boxes): Blocked with message -> "${moveFailRes.userErrors[0].message}"`);
    expect(moveFailRes.userErrors).toHaveLength(1);

    const moveForceRes = await palletService.moveBox({
      boxContainerId: boxToMove.id,
      targetPalletContainerId: pallet1.id,
      force: true,
    });
    console.log(`✅ Move with force=true: Succeeded! Box placed at sequence #${boxToMove.sequenceInPallet} on Pallet #1`);
    expect(moveForceRes.userErrors).toHaveLength(0);

    // 6. Seal All Pallets and Finalize
    console.log("\n========================================================");
    console.log("🔒 STEP 4: Pallet Sealing & Finalizing Shipment");
    console.log("========================================================");
    const prematureFinalize = await shipmentService.finalize(shipment.id);
    console.log(`ℹ️  Finalizing with unsealed pallets: Blocked with message -> "${prematureFinalize.userErrors[0].message}"`);
    expect(prematureFinalize.userErrors).toHaveLength(1);

    for (const p of dbPallets) {
      const sealRes = await palletService.toggleSeal(p.id, true);
      expect(sealRes.userErrors).toHaveLength(0);
    }
    console.log(`✅ All ${dbPallets.length} Pallets SEALED`);

    const finalizeRes = await shipmentService.finalize(shipment.id);
    expect(finalizeRes.userErrors).toHaveLength(0);
    console.log(`✅ Shipment Finalized! Status: ${finalizeRes.shipment!.status}`);

    // 7. Dispatch via shipOut
    console.log("\n========================================================");
    console.log("🚀 STEP 5: Ship Out (Inventory Deduction & Completion)");
    console.log("========================================================");
    const shipOutRes = await shipmentService.shipOut(shipment.id);
    expect(shipOutRes.userErrors).toHaveLength(0);
    console.log(`✅ Shipment Dispatched! Status: ${shipOutRes.shipment!.status}`);
    console.log(`   • FG Lot Allocated Qty after deduction: ${fgLot.allocatedQty}`);
    console.log(`   • Outbound FG Transactions recorded: ${dbTransactions.length}`);
    console.log(`   • Sales Order Shipped Qty: ${salesOrder.shippedQty}/${salesOrder.orderQty} | Status: ${salesOrder.status}`);
    console.log("========================================================\n");
  });

  it("Scenario 2: Continuous Annual Invoice Numbers across multiple air, sea, and local shipments", async () => {
    const shipmentDate = new Date(2026, 9, 9);

    // Create Shipment 1: Sea Freight
    const s1 = await shipmentService.create({
      shipmentDate,
      freightType: "SEA",
      courier: "Evergreen",
    });
    expect(s1.shipment!.invoiceNo).toBe("CE-26-S-0001");
    expect(s1.shipment!.shipmentNo).toBe("SHP-20261009-001");

    // Create Shipment 2: Air Freight
    const s2 = await shipmentService.create({
      shipmentDate,
      freightType: "AIR",
      courier: "DHL Express",
    });
    expect(s2.shipment!.invoiceNo).toBe("CE-26-A-0002");
    expect(s2.shipment!.shipmentNo).toBe("SHP-20261009-002");

    // Create Shipment 3: Local Freight
    const s3 = await shipmentService.create({
      shipmentDate,
      freightType: "LOCAL",
      courier: "LBC Express",
    });
    expect(s3.shipment!.invoiceNo).toBe("CE-26-L-0003");
    expect(s3.shipment!.shipmentNo).toBe("SHP-20261009-003");
  });

  it("Scenario 3: Max 30 Pallet Limit & Force Override for large container export", async () => {
    // Generate 1,201 boxes
    const massiveBoxPool = Array.from({ length: 1201 }, (_, i) => ({
      id: i + 1,
      boxNo: `BOX-${i + 1}`,
      grossWeight: 10,
      netWeight: 8,
      totalQty: 100,
    }));

    // Standard allocation of > 1,200 boxes throws unless forced
    expect(() =>
      ShippingAllocationHelper.chunkAndAllocateBoxes({
        boxes: massiveBoxPool,
        shipmentDate: new Date(2026, 9, 9),
        shipmentDailySeries: 1,
        force: false,
      }),
    ).toThrow(/exceeds shipment limit of 1200 boxes/);

    // With force: true, allocates into 31 pallets successfully
    const forcedPallets = ShippingAllocationHelper.chunkAndAllocateBoxes({
      boxes: massiveBoxPool,
      shipmentDate: new Date(2026, 9, 9),
      shipmentDailySeries: 1,
      force: true,
    });

    expect(forcedPallets).toHaveLength(31);
    expect(forcedPallets[30].sequenceNo).toBe(31);
    expect(forcedPallets[30].palletNo).toBe("P31");
    expect(forcedPallets[30].boxes).toHaveLength(1);
    expect(forcedPallets[30].boxes[0].shippingBoxNo).toBe("P26J09011201");
  });
});
