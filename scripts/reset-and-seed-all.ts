import "dotenv/config";
import pg from "pg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment");
  }

  console.log("🧹 ======================================================");
  console.log("🧹 STEP 1: Clearing / Truncating ALL Database Tables...");
  console.log("🧹 ======================================================");

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    // Fetch all user tables in public schema
    const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')
    `);

    const tableNames = tablesRes.rows.map((r) => `"${r.tablename}"`);

    if (tableNames.length > 0) {
      console.log(`-> Truncating ${tableNames.length} tables with CASCADE...`);
      await client.query(`TRUNCATE TABLE ${tableNames.join(", ")} CASCADE;`);
      console.log("✓ All tables truncated successfully.");
    } else {
      console.log("-> No tables found in public schema to truncate.");
    }

    // Reset all sequences
    console.log("-> Resetting all sequences to 1...");
    const seqRes = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    for (const seq of seqRes.rows) {
      await client.query(`ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1;`);
    }
    console.log("✓ All sequences reset to 1.");
  } finally {
    client.release();
  }

  console.log("\n🌱 ======================================================");
  console.log("🌱 STEP 2: Seeding All Master Data & Personas (Loki pass)...");
  console.log("🌱 ======================================================");

  // Execute master seed script
  execSync("npx tsx scripts/seed-masters.ts", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });

  console.log("\n📦 ======================================================");
  console.log("📦 STEP 3: Seeding Material Inventory...");
  console.log("📦 ======================================================");

  execSync("npx tsx scripts/seed-material-inventory.ts", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });

  console.log("\n🏷️ ======================================================");
  console.log("🏷️ STEP 4: Seeding Finished Goods Inventory (Lots & Tx)...");
  console.log("🏷️ ======================================================");

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Fetch seeded items and fabrications
    const valveItem = await prisma.item.findFirst({
      where: { itemCode: "10-10001-000" },
    });
    const fab100 = await prisma.fabrication.findFirst({
      where: { code: "100" },
    });

    if (valveItem && fab100) {
      console.log(`-> Seeding Finished Goods Lots for ${valveItem.itemName}...`);

      // Lot 1: In Stock Area (Area 1, Location 1, no boxId) - Available stock
      const fgLot1 = await prisma.finishedGoodsLot.create({
        data: {
          itemId: valveItem.id,
          fabricationId: fab100.id,
          orderNo: "SO-2026-0001",
          lotNo: "LOT-FG-001",
          chargeNo: "CHG-9901",
          trialLotNo: "",
          invoiceNo: "INV-FG-001",
          areaId: 1, // Main Stock Warehouse Area (STOCK)
          locationId: 1, // BIN-A1-01
          boxId: null,
          availableQty: 250,
          allocatedQty: 50,
          checkingQty: 0,
          defectiveQty: 0,
          reason: "Initial warehouse stock-in",
          remarks: "Unboxed standard production batch",
          stickerPrinted: true,
          stickerPrintedAt: new Date(),
          stickerPrintedBy: "loki",
          createdBy: "loki",
          incomingDate: new Date("2026-10-01"),
          manufactureDate: new Date("2026-09-28"),
        },
      });

      await prisma.finishedGoodsTransaction.create({
        data: {
          transactionNo: "FGTX-20261001-0001",
          transactionType: "MANUAL_IN",
          direction: "INBOUND",
          transactionDate: new Date("2026-10-01T09:00:00Z"),
          itemId: valveItem.id,
          fabricationId: fab100.id,
          lotNo: fgLot1.lotNo,
          orderNo: fgLot1.orderNo,
          chargeNo: fgLot1.chargeNo,
          toStatus: "AVAILABLE",
          toAreaId: fgLot1.areaId,
          toLocationId: fgLot1.locationId,
          toBoxId: null,
          quantity: 300,
          balanceAfter: 300,
          reason: "Initial warehouse stock-in",
          createdBy: "loki",
        },
      });

      // Lot 2: In Packing Area (Area 2, Location 4, Box 1: Standard 20-Piece Box) - Packaged & Checking
      const fgLot2 = await prisma.finishedGoodsLot.create({
        data: {
          itemId: valveItem.id,
          fabricationId: fab100.id,
          orderNo: "SO-2026-0002",
          lotNo: "LOT-FG-002",
          chargeNo: "CHG-9902",
          trialLotNo: "",
          invoiceNo: null,
          areaId: 2, // Packing & Staging Area (PACKING)
          locationId: 4, // PACK-LANE-01
          boxId: 1, // Standard 20-Piece Box
          availableQty: 40,
          allocatedQty: 0,
          checkingQty: 20,
          defectiveQty: 5,
          reason: "Shop floor packed lot",
          remarks: "Boxed lot staged in packaging",
          stickerPrinted: true,
          stickerPrintedAt: new Date(),
          stickerPrintedBy: "packer",
          createdBy: "packer",
          incomingDate: new Date("2026-10-05"),
          manufactureDate: new Date("2026-10-04"),
        },
      });

      await prisma.finishedGoodsTransaction.create({
        data: {
          transactionNo: "FGTX-20261005-0002",
          transactionType: "MANUAL_IN",
          direction: "INBOUND",
          transactionDate: new Date("2026-10-05T14:30:00Z"),
          itemId: valveItem.id,
          fabricationId: fab100.id,
          lotNo: fgLot2.lotNo,
          orderNo: fgLot2.orderNo,
          chargeNo: fgLot2.chargeNo,
          toStatus: "AVAILABLE",
          toAreaId: fgLot2.areaId,
          toLocationId: fgLot2.locationId,
          toBoxId: 1,
          quantity: 65,
          balanceAfter: 65,
          reason: "Packing staging receipt",
          createdBy: "packer",
        },
      });

      // Lot 3: Additional Stock Lot for high-volume inquiries
      const fgLot3 = await prisma.finishedGoodsLot.create({
        data: {
          itemId: valveItem.id,
          fabricationId: fab100.id,
          orderNo: "SO-2026-0003",
          lotNo: "LOT-FG-003",
          chargeNo: "CHG-9903",
          trialLotNo: "",
          invoiceNo: null,
          areaId: 1,
          locationId: 2, // BIN-A1-02
          boxId: null,
          availableQty: 180,
          allocatedQty: 0,
          checkingQty: 0,
          defectiveQty: 12,
          reason: "Secondary casting batch",
          remarks: "Awaiting QA clearance on defective subset",
          stickerPrinted: false,
          createdBy: "loki",
          incomingDate: new Date("2026-10-08"),
          manufactureDate: new Date("2026-10-07"),
        },
      });

      await prisma.finishedGoodsTransaction.create({
        data: {
          transactionNo: "FGTX-20261008-0003",
          transactionType: "MANUAL_IN",
          direction: "INBOUND",
          transactionDate: new Date("2026-10-08T10:15:00Z"),
          itemId: valveItem.id,
          fabricationId: fab100.id,
          lotNo: fgLot3.lotNo,
          orderNo: fgLot3.orderNo,
          chargeNo: fgLot3.chargeNo,
          toStatus: "AVAILABLE",
          toAreaId: fgLot3.areaId,
          toLocationId: fgLot3.locationId,
          toBoxId: null,
          quantity: 192,
          balanceAfter: 192,
          reason: "Secondary batch manual in",
          createdBy: "loki",
        },
      });

      console.log("✓ Finished Goods lots & transactions seeded successfully.");
    } else {
      console.warn("⚠️ Could not find valveItem or fab100 to seed FinishedGoodsLot.");
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n⚡ ======================================================");
  console.log("⚡ STEP 5: Re-applying DB Cache Triggers & Sequences...");
  console.log("⚡ ======================================================");

  const clientFinal = await pool.connect();
  try {
    const triggerSqlPath = path.resolve(__dirname, "setup-db-triggers.sql");
    if (fs.existsSync(triggerSqlPath)) {
      const triggerSql = fs.readFileSync(triggerSqlPath, "utf-8");
      await clientFinal.query(triggerSql);
      console.log("✓ Cache triggers re-applied.");
    }

    // Fix sequences
    execSync("npx tsx scripts/fix-sequences.ts", {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    });
  } finally {
    clientFinal.release();
    await pool.end();
  }

  console.log("\n========================================================");
  console.log("🎉 DATABASE RESET AND SEEDING COMPLETED SUCCESSFULLY! 🎉");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ Reset & Seed Failed:", err);
  process.exit(1);
});
