import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding Material Inventory sample data...");

  try {
    // 0. Ensure MaterialGroup and Supplier exist
    await prisma.materialGroup.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "General Metals & Raw Stocks",
        code: "GRP-RAW",
      },
    });

    await prisma.supplier.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "Apex Precision Alloys Co.",
        code: "SUP-APX-01",
        serviceType: "Raw Material Supplier",
        contactPerson: "Harold Smith",
        contactNumber: "+1-555-8901",
        telephoneNumber: "+1-555-8900",
        faxNumber: "+1-555-8902",
        emailAddress: "sales@apexalloys.example.com",
        address: "100 Industrial Parkway, Detroit, MI",
        country: "USA",
        paymentTerms: "Net 30",
        currency: "USD",
      },
    });

    // 1. Ensure Materials exist
    const mat1 = await prisma.material.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "High Precision CNC Shaft 25mm",
        stockKeepingUnit: "SKU-SFT-001",
        oldCode: "OLD-SFT-25",
        description: "25mm diameter precision turned steel shaft",
        category: "Mechanical Components",
        type: "Finished Good",
        unitOfMeasurement: "PCS",
        weight: 450.5,
        weightUom: "G",
        cost: 18.75,
        minStock: 50,
        shelfLife: 365,
        modelNo: "MOD-SFT-2026",
        note: "Requires induction hardening",
        materialGroupId: 1,
        rawMaterialId: 1,
        sectionId: 1,
      },
    });

    const mat2 = await prisma.material.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: "Stainless Steel Ingot Grade 316L",
        stockKeepingUnit: "SKU-ING-316L",
        oldCode: "ING-316L-01",
        description: "High-purity vacuum induction melted casting ingot",
        category: "Raw Material",
        type: "Metal Ingot",
        unitOfMeasurement: "KG",
        weight: 1000,
        weightUom: "G",
        cost: 42.50,
        minStock: 100,
        shelfLife: 730,
        modelNo: "ING-SPEC-2026",
        note: "Store in dry environment",
        materialGroupId: 1,
        rawMaterialId: 1,
        sectionId: 1,
      },
    });

    const mat3 = await prisma.material.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        name: "Industrial Ceramic Casting Core 15mm",
        stockKeepingUnit: "SKU-COR-015",
        oldCode: "CER-CORE-15",
        description: "Silica-based precision soluble core for hollow blades",
        category: "Consumables",
        type: "Ceramic Core",
        unitOfMeasurement: "PCS",
        weight: 85.0,
        weightUom: "G",
        cost: 6.20,
        minStock: 200,
        shelfLife: 180,
        modelNo: "CORE-SIL-15",
        note: "Handle with extreme care, fragile",
        materialGroupId: 1,
        rawMaterialId: 1,
        sectionId: 1,
      },
    });

    console.log("-> Materials verified.");

    // 2. Clear previous inventory sample lots if necessary or insert lots
    const existingLots = await prisma.materialInventoryLot.findMany({
      where: { materialId: { in: [mat1.id, mat2.id, mat3.id] } },
    });

    if (existingLots.length === 0) {
      console.log("-> Inserting sample inventory lots...");

      // Lot 1 for Material 1
      const lot1 = await prisma.materialInventoryLot.create({
        data: {
          materialId: mat1.id,
          lotNo: "LOT-202610-001",
          receivingReportNo: "RR-202610-01",
          purchaseOrderNo: "PO-2026-9001",
          invoiceNo: "INV-APX-8801",
          availableQty: 150,
          allocatedQty: 25,
          pendingQty: 10,
          defectiveQty: 5,
          areaId: 1,
          locationId: 1,
          supplierId: 1,
          incomingDate: new Date("2026-10-01"),
          manufactureDate: new Date("2026-09-15"),
          expirationDate: new Date("2027-09-15"),
          reason: "Initial production replenishment batch",
        },
      });

      // Lot 2 for Material 1
      const lot2 = await prisma.materialInventoryLot.create({
        data: {
          materialId: mat1.id,
          lotNo: "LOT-202610-002",
          receivingReportNo: "RR-202610-02",
          purchaseOrderNo: "PO-2026-9002",
          invoiceNo: "INV-APX-8802",
          availableQty: 80,
          allocatedQty: 0,
          pendingQty: 0,
          defectiveQty: 2,
          areaId: 1,
          locationId: 2,
          supplierId: 1,
          incomingDate: new Date("2026-10-05"),
          manufactureDate: new Date("2026-09-20"),
          expirationDate: new Date("2027-09-20"),
          reason: "Secondary stock in batch",
        },
      });

      // Lot 3 for Material 2
      const lot3 = await prisma.materialInventoryLot.create({
        data: {
          materialId: mat2.id,
          lotNo: "LOT-INGOT-001",
          receivingReportNo: "RR-202610-03",
          purchaseOrderNo: "PO-2026-9003",
          invoiceNo: "INV-APX-8803",
          availableQty: 500,
          allocatedQty: 100,
          pendingQty: 50,
          defectiveQty: 0,
          areaId: 1,
          locationId: 3,
          supplierId: 1,
          incomingDate: new Date("2026-10-08"),
          manufactureDate: new Date("2026-09-01"),
          expirationDate: new Date("2028-09-01"),
          reason: "Primary raw alloy delivery",
        },
      });

      // Lot 4 for Material 3
      const lot4 = await prisma.materialInventoryLot.create({
        data: {
          materialId: mat3.id,
          lotNo: "LOT-CERAMIC-001",
          receivingReportNo: "RR-202610-04",
          purchaseOrderNo: "PO-2026-9004",
          invoiceNo: "INV-APX-8804",
          availableQty: 300,
          allocatedQty: 50,
          pendingQty: 0,
          defectiveQty: 15,
          areaId: 2,
          locationId: 4,
          supplierId: 1,
          incomingDate: new Date("2026-10-09"),
          manufactureDate: new Date("2026-08-15"),
          expirationDate: new Date("2027-02-15"),
          reason: "Casting core consumables batch",
        },
      });

      console.log("-> Inserting sample inventory transactions...");

      // Inbound Transactions
      await prisma.materialInventoryTransaction.create({
        data: {
          transactionNo: "MTX-20261001-0001",
          transactionType: "MANUAL_IN",
          direction: "INBOUND",
          materialId: mat1.id,
          materialInventoryLotId: lot1.id,
          lotNo: lot1.lotNo,
          quantity: 190,
          balanceAfter: 190,
          toStatus: "AVAILABLE",
          toAreaId: 1,
          toLocationId: 1,
          reason: "Initial warehouse stock-in",
          referenceNo: lot1.receivingReportNo,
          transactionDate: new Date("2026-10-01T08:30:00Z"),
        },
      });

      await prisma.materialInventoryTransaction.create({
        data: {
          transactionNo: "MTX-20261005-0002",
          transactionType: "MANUAL_IN",
          direction: "INBOUND",
          materialId: mat1.id,
          materialInventoryLotId: lot2.id,
          lotNo: lot2.lotNo,
          quantity: 82,
          balanceAfter: 82,
          toStatus: "AVAILABLE",
          toAreaId: 1,
          toLocationId: 2,
          reason: "Replenishment receiving",
          referenceNo: lot2.receivingReportNo,
          transactionDate: new Date("2026-10-05T09:15:00Z"),
        },
      });

      await prisma.materialInventoryTransaction.create({
        data: {
          transactionNo: "MTX-20261006-0003",
          transactionType: "STATUS_CHANGE",
          direction: "INTERNAL",
          materialId: mat1.id,
          materialInventoryLotId: lot1.id,
          lotNo: lot1.lotNo,
          quantity: 5,
          balanceAfter: 185,
          fromStatus: "AVAILABLE",
          toStatus: "DEFECTIVE",
          fromAreaId: 1,
          fromLocationId: 1,
          toAreaId: 1,
          toLocationId: 1,
          reason: "QA visual check surface scratch",
          transactionDate: new Date("2026-10-06T14:20:00Z"),
        },
      });

      await prisma.materialInventoryTransaction.create({
        data: {
          transactionNo: "MTX-20261008-0004",
          transactionType: "MANUAL_IN",
          direction: "INBOUND",
          materialId: mat2.id,
          materialInventoryLotId: lot3.id,
          lotNo: lot3.lotNo,
          quantity: 650,
          balanceAfter: 650,
          toStatus: "AVAILABLE",
          toAreaId: 1,
          toLocationId: 3,
          reason: "Inbound melt alloy delivery",
          referenceNo: lot3.receivingReportNo,
          transactionDate: new Date("2026-10-08T10:00:00Z"),
        },
      });

      console.log("-> Inserting sample Material Issuance (MRS)...");

      const mrs = await prisma.materialIssuance.create({
        data: {
          mrsNo: "MRS-20261010-001",
          mrsDate: new Date("2026-10-10"),
          sectionId: 1,
          remarks: "Production batch 26-A material issuance request",
          totalItems: 2,
          totalQty: 30,
          items: {
            create: [
              {
                materialId: mat1.id,
                materialInventoryLotId: lot1.id,
                lotNo: lot1.lotNo,
                areaId: 1,
                locationId: 1,
                quantity: 20,
                remarks: "Shaft machining staging",
              },
              {
                materialId: mat3.id,
                materialInventoryLotId: lot4.id,
                lotNo: lot4.lotNo,
                areaId: 2,
                locationId: 4,
                quantity: 10,
                remarks: "Wax assembly mold cores",
              },
            ],
          },
        },
      });

      // Issuance Transaction
      await prisma.materialInventoryTransaction.create({
        data: {
          transactionNo: "MTX-20261010-0005",
          transactionType: "ISSUANCE",
          direction: "OUTBOUND",
          materialId: mat1.id,
          materialInventoryLotId: lot1.id,
          lotNo: lot1.lotNo,
          quantity: 20,
          balanceAfter: 165,
          fromStatus: "AVAILABLE",
          fromAreaId: 1,
          fromLocationId: 1,
          reason: `Issuance for MRS ${mrs.mrsNo}`,
          referenceNo: mrs.mrsNo,
          transactionDate: new Date("2026-10-10T16:00:00Z"),
        },
      });

      console.log("✅ Successfully seeded Material Inventory sample data!");
    } else {
      console.log("ℹ️ Inventory lots already exist, skipping lot creation.");
    }
  } catch (error) {
    console.error("❌ Error seeding inventory:", error);
  } finally {
    await pool.end();
  }
}

main();
