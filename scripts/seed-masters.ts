import "dotenv/config";
import bcrypt from "bcrypt";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("🌱 Starting Master Data Seeding...");
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Status Codes
    console.log("-> Seeding StatusCodes...");
    const activeStatus = await prisma.statusCode.upsert({
      where: { id: 1 },
      update: { title: "ACTIVE", content: "Active Status" },
      create: { id: 1, title: "ACTIVE", content: "Active Status" },
    });

    await prisma.statusCode.upsert({
      where: { id: 2 },
      update: { title: "INACTIVE", content: "Inactive Status" },
      create: { id: 2, title: "INACTIVE", content: "Inactive Status" },
    });

    await prisma.statusCode.upsert({
      where: { id: 3 },
      update: { title: "SUSPENDED", content: "Suspended Status" },
      create: { id: 3, title: "SUSPENDED", content: "Suspended Status" },
    });

    // 2. Pages
    console.log("-> Seeding Pages...");
    const pageDefs = [
      { name: "Sales Orders", url: "/sales-orders" },
      { name: "Production Planning", url: "/production-planning" },
      { name: "Production Execution", url: "/production-execution" },
      { name: "Finished Goods Inventory", url: "/finished-goods" },
      { name: "Material Inventory", url: "/material-inventory" },
      { name: "Shipping Logistics", url: "/shipping" },
      { name: "Master Data Management", url: "/master-data" },
    ];

    const pages: any[] = [];
    for (const p of pageDefs) {
      const page = await prisma.page.upsert({
        where: { url: p.url },
        update: { name: p.name },
        create: { name: p.name, url: p.url },
      });
      pages.push(page);
    }

    // 3. Sections
    console.log("-> Seeding Sections...");
    const sectionDefs = [
      { id: 1, name: "Management & Administration", code: "MGT", description: "Executive & System Admin" },
      { id: 2, name: "Production Control", code: "PC", description: "Sales Order entry, FG allocation, Scheduling" },
      { id: 3, name: "Wax Injection Section", code: "WAX", description: "Wax pattern molding & tree assembly" },
      { id: 4, name: "Casting & Melting Section", code: "CAST", description: "Metal melting, pouring & knockout" },
      { id: 5, name: "Machining Section", code: "MACH", description: "CNC precision turning & milling" },
      { id: 6, name: "Quality Assurance Section", code: "QA", description: "Inspection, measurement & testing" },
      { id: 7, name: "Packing Section", code: "PACK", description: "Final inspection, boxing & packing" },
      { id: 8, name: "Shipping & Logistics Section", code: "SHIP", description: "Shipment planning, pallets & dispatch" },
      { id: 9, name: "Finished Goods Warehouse", code: "WH", description: "Finished goods inventory storage" },
    ];

    const sections: Record<string, any> = {};
    for (const s of sectionDefs) {
      const sec = await prisma.section.upsert({
        where: { id: s.id },
        update: { name: s.name, code: s.code, description: s.description },
        create: { id: s.id, name: s.name, code: s.code, description: s.description },
      });
      sections[s.code] = sec;
    }

    // 4. Positions
    console.log("-> Seeding Positions...");
    const positionDefs = [
      { id: 1, name: "Super Administrator", sectionId: sections["MGT"].id },
      { id: 2, name: "Production Controller", sectionId: sections["PC"].id },
      { id: 3, name: "Wax Operator", sectionId: sections["WAX"].id },
      { id: 4, name: "Casting Operator", sectionId: sections["CAST"].id },
      { id: 5, name: "Machining Operator", sectionId: sections["MACH"].id },
      { id: 6, name: "QA Inspector", sectionId: sections["QA"].id },
      { id: 7, name: "Packaging Specialist", sectionId: sections["PACK"].id },
      { id: 8, name: "Logistics Shipper", sectionId: sections["SHIP"].id },
      { id: 9, name: "Warehouse Palleter", sectionId: sections["SHIP"].id },
    ];

    const positions: Record<string, any> = {};
    for (const pos of positionDefs) {
      const p = await prisma.position.upsert({
        where: { id: pos.id },
        update: { name: pos.name, sectionId: pos.sectionId },
        create: { id: pos.id, name: pos.name, sectionId: pos.sectionId },
      });
      positions[pos.name] = p;
    }

    // 5. User Personas (Bcrypt 12 salt rounds)
    console.log("-> Seeding User Personas...");
    const defaultPasswordHash = await bcrypt.hash("pass", 12);

    const userPersonas = [
      {
        username: "loki",
        email: "loki@bently.local",
        name: "Loki (Super Admin)",
        superAdmin: true,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["MGT"].id,
        positionId: positions["Super Administrator"].id,
      },
      {
        username: "pc1",
        email: "pc1@bently.local",
        name: "PC1 - Sales & FG Allocator",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["PC"].id,
        positionId: positions["Production Controller"].id,
      },
      {
        username: "pc2",
        email: "pc2@bently.local",
        name: "PC2 - Production Planner",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["PC"].id,
        positionId: positions["Production Controller"].id,
      },
      {
        username: "user_wax",
        email: "user_wax@bently.local",
        name: "Wax Injection Operator",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["WAX"].id,
        positionId: positions["Wax Operator"].id,
      },
      {
        username: "user_cast",
        email: "user_cast@bently.local",
        name: "Casting & Melting Operator",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["CAST"].id,
        positionId: positions["Casting Operator"].id,
      },
      {
        username: "user_mach",
        email: "user_mach@bently.local",
        name: "CNC Machining Operator",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["MACH"].id,
        positionId: positions["Machining Operator"].id,
      },
      {
        username: "user_qa",
        email: "user_qa@bently.local",
        name: "Quality Assurance Inspector",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["QA"].id,
        positionId: positions["QA Inspector"].id,
      },
      {
        username: "packer",
        email: "packer@bently.local",
        name: "Packer & Boxing Specialist",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["PACK"].id,
        positionId: positions["Packaging Specialist"].id,
      },
      {
        username: "shipper",
        email: "shipper@bently.local",
        name: "Logistics Shipper",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["SHIP"].id,
        positionId: positions["Logistics Shipper"].id,
      },
      {
        username: "palleter",
        email: "palleter@bently.local",
        name: "Warehouse Palleter",
        superAdmin: false,
        password: defaultPasswordHash,
        statusCodeId: activeStatus.id,
        sectionId: sections["SHIP"].id,
        positionId: positions["Warehouse Palleter"].id,
      },
    ];

    for (const u of userPersonas) {
      const user = await prisma.user.upsert({
        where: { username: u.username },
        update: {
          email: u.email,
          name: u.name,
          superAdmin: u.superAdmin,
          password: u.password,
          statusCodeId: u.statusCodeId,
          sectionId: u.sectionId,
          positionId: u.positionId,
          deletedAt: null,
        },
        create: u,
      });

      // Grant permissions for all pages
      for (const page of pages) {
        await prisma.userPage.upsert({
          where: {
            userId_pageId: {
              userId: user.id,
              pageId: page.id,
            },
          },
          update: {
            canView: true,
            canModify: true,
            canUnassign: true,
          },
          create: {
            userId: user.id,
            pageId: page.id,
            canView: true,
            canModify: true,
            canUnassign: true,
          },
        });
      }
    }

    // 6. Unit of Measurement
    console.log("-> Seeding UnitOfMeasurement...");
    const uomDefs = [
      { id: 1, name: "Piece", code: "PCS", type: "Count" },
      { id: 2, name: "Kilogram", code: "KGS", type: "Weight" },
      { id: 3, name: "Box", code: "BOX", type: "Count" },
      { id: 4, name: "Pallet", code: "PALLET", type: "Count" },
      { id: 5, name: "Production Lot", code: "LOT", type: "Count" },
    ];

    for (const u of uomDefs) {
      await prisma.unitOfMeasurement.upsert({
        where: { id: u.id },
        update: { name: u.name, code: u.code, type: u.type },
        create: u,
      });
    }

    // 7. Item Types
    console.log("-> Seeding ItemTypes...");
    const fgItemType = await prisma.itemType.upsert({
      where: { id: 1 },
      update: { name: "Finished Goods", code: "FG", cycleType: "Tree", routeSetUp: true },
      create: { id: 1, name: "Finished Goods", code: "FG", cycleType: "Tree", routeSetUp: true },
    });

    await prisma.itemType.upsert({
      where: { id: 2 },
      update: { name: "Semi-Finished Goods", code: "SFG", cycleType: "Tree", routeSetUp: true },
      create: { id: 2, name: "Semi-Finished Goods", code: "SFG", cycleType: "Tree", routeSetUp: true },
    });

    await prisma.itemType.upsert({
      where: { id: 3 },
      update: { name: "Raw Material", code: "RAW", cycleType: "Piece", routeSetUp: false },
      create: { id: 3, name: "Raw Material", code: "RAW", cycleType: "Piece", routeSetUp: false },
    });

    // 8. Raw Materials
    console.log("-> Seeding RawMaterials...");
    await prisma.rawMaterial.upsert({
      where: { id: 1 },
      update: { name: "Stainless Steel 316L", code: "SS316L", class: "Steel", itemTypeId: fgItemType.id },
      create: { id: 1, name: "Stainless Steel 316L", code: "SS316L", class: "Steel", itemTypeId: fgItemType.id },
    });

    await prisma.rawMaterial.upsert({
      where: { id: 2 },
      update: { name: "Titanium Grade 5", code: "TI6AL4V", class: "Titanium", itemTypeId: fgItemType.id },
      create: { id: 2, name: "Titanium Grade 5", code: "TI6AL4V", class: "Titanium", itemTypeId: fgItemType.id },
    });

    // 9. Customers
    console.log("-> Seeding Customers...");
    const starkCustomer = await prisma.customer.upsert({
      where: { id: 1 },
      update: {
        name: "Stark Industries Aerospace",
        code: "CUST-STARK",
        type: "International",
        contactPerson: "Pepper Potts",
        contactNumber: "+1-555-0100",
        telephoneNumber: "+1-555-0101",
        faxNumber: "+1-555-0102",
        emailAddress: "procurement@starkindustries.com",
        address: "10880 Malibu Point, Malibu, CA 90265",
        country: "USA",
        taxId: "US-99283410",
        paymentTerms: "Net 30",
        shippingAddress: "Stark Logistics Hangar 4, Los Angeles, CA",
        shippingContactPerson: "Happy Hogan",
        shippingContactNumber: "+1-555-0105",
        shippingEmailAddress: "logistics@starkindustries.com",
        currency: "USD",
        statusCodeId: activeStatus.id,
      },
      create: {
        id: 1,
        name: "Stark Industries Aerospace",
        code: "CUST-STARK",
        type: "International",
        contactPerson: "Pepper Potts",
        contactNumber: "+1-555-0100",
        telephoneNumber: "+1-555-0101",
        faxNumber: "+1-555-0102",
        emailAddress: "procurement@starkindustries.com",
        address: "10880 Malibu Point, Malibu, CA 90265",
        country: "USA",
        taxId: "US-99283410",
        paymentTerms: "Net 30",
        shippingAddress: "Stark Logistics Hangar 4, Los Angeles, CA",
        shippingContactPerson: "Happy Hogan",
        shippingContactNumber: "+1-555-0105",
        shippingEmailAddress: "logistics@starkindustries.com",
        currency: "USD",
        statusCodeId: activeStatus.id,
      },
    });

    await prisma.customer.upsert({
      where: { id: 2 },
      update: {
        name: "Wayne Advanced Technologies",
        code: "CUST-WAYNE",
        type: "International",
        contactPerson: "Lucius Fox",
        contactNumber: "+1-555-0200",
        telephoneNumber: "+1-555-0201",
        faxNumber: "+1-555-0202",
        emailAddress: "appliedsciences@wayneenterprises.com",
        address: "1007 Mountain Drive, Gotham City",
        country: "USA",
        taxId: "US-44829103",
        paymentTerms: "Net 45",
        shippingAddress: "Wayne Enterprises Distribution Dock B, Gotham Port",
        shippingContactPerson: "Alfred Pennyworth",
        shippingContactNumber: "+1-555-0205",
        shippingEmailAddress: "shipping@wayneenterprises.com",
        currency: "USD",
        statusCodeId: activeStatus.id,
      },
      create: {
        id: 2,
        name: "Wayne Advanced Technologies",
        code: "CUST-WAYNE",
        type: "International",
        contactPerson: "Lucius Fox",
        contactNumber: "+1-555-0200",
        telephoneNumber: "+1-555-0201",
        faxNumber: "+1-555-0202",
        emailAddress: "appliedsciences@wayneenterprises.com",
        address: "1007 Mountain Drive, Gotham City",
        country: "USA",
        taxId: "US-44829103",
        paymentTerms: "Net 45",
        shippingAddress: "Wayne Enterprises Distribution Dock B, Gotham Port",
        shippingContactPerson: "Alfred Pennyworth",
        shippingContactNumber: "+1-555-0205",
        shippingEmailAddress: "shipping@wayneenterprises.com",
        currency: "USD",
        statusCodeId: activeStatus.id,
      },
    });

    // 10. Areas & Locations
    console.log("-> Seeding Areas & Locations...");
    const stockArea = await prisma.area.upsert({
      where: { id: 1 },
      update: { name: "Main Stock Warehouse Area", category: "STOCK" },
      create: { id: 1, name: "Main Stock Warehouse Area", category: "STOCK" },
    });

    const packingArea = await prisma.area.upsert({
      where: { id: 2 },
      update: { name: "Packing & Staging Area", category: "PACKING" },
      create: { id: 2, name: "Packing & Staging Area", category: "PACKING" },
    });

    const floorArea = await prisma.area.upsert({
      where: { id: 3 },
      update: { name: "Factory Floor WIP Area", category: "WIP" },
      create: { id: 3, name: "Factory Floor WIP Area", category: "WIP" },
    });

    const locDefs = [
      { id: 1, name: "BIN-A1-01", areaId: stockArea.id },
      { id: 2, name: "BIN-A1-02", areaId: stockArea.id },
      { id: 3, name: "BIN-B2-01", areaId: stockArea.id },
      { id: 4, name: "PACK-LANE-01", areaId: packingArea.id },
      { id: 5, name: "PACK-LANE-02", areaId: packingArea.id },
      { id: 6, name: "FLOOR-STAGING-01", areaId: floorArea.id },
    ];

    for (const loc of locDefs) {
      await prisma.location.upsert({
        where: { id: loc.id },
        update: { name: loc.name, areaId: loc.areaId },
        create: loc,
      });
    }

    // 11. Box Types
    console.log("-> Seeding BoxTypes...");
    const boxType20 = await prisma.boxType.upsert({
      where: { id: 1 },
      update: { name: "Standard 20-Piece Box", code: "BOX-STD-20", weight: 0.50, description: "Cardboard Box (Capacity ~20 pcs)" },
      create: { id: 1, name: "Standard 20-Piece Box", code: "BOX-STD-20", weight: 0.50, description: "Cardboard Box (Capacity ~20 pcs)" },
    });

    await prisma.boxType.upsert({
      where: { id: 2 },
      update: { name: "Standard 50-Piece Box", code: "BOX-STD-50", weight: 1.00, description: "Heavy Duty Box (Capacity ~50 pcs)" },
      create: { id: 2, name: "Standard 50-Piece Box", code: "BOX-STD-50", weight: 1.00, description: "Heavy Duty Box (Capacity ~50 pcs)" },
    });

    // 12. Pallet Types
    console.log("-> Seeding PalletTypes...");
    const existingPallet1 = await prisma.palletType.findFirst({ where: { name: "Standard Euro Wooden Pallet" } });
    if (existingPallet1) {
      await prisma.palletType.update({
        where: { id: existingPallet1.id },
        data: { description: "1200x800mm Wooden Pallet", weight: 20.0, unitPrice: 25.0 },
      });
    } else {
      await prisma.palletType.create({
        data: { name: "Standard Euro Wooden Pallet", description: "1200x800mm Wooden Pallet", weight: 20.0, unitPrice: 25.0 },
      });
    }

    const existingPallet2 = await prisma.palletType.findFirst({ where: { name: "Heavy Duty Plastic Pallet" } });
    if (existingPallet2) {
      await prisma.palletType.update({
        where: { id: existingPallet2.id },
        data: { description: "1200x1000mm Plastic Pallet", weight: 15.0, unitPrice: 45.0 },
      });
    } else {
      await prisma.palletType.create({
        data: { name: "Heavy Duty Plastic Pallet", description: "1200x1000mm Plastic Pallet", weight: 15.0, unitPrice: 45.0 },
      });
    }

    // 13. Shipment Types
    console.log("-> Seeding ShipmentTypes...");
    await prisma.shipmentType.upsert({
      where: { id: 1 },
      update: { name: "AIR_FREIGHT", description: "International Air Courier / Cargo" },
      create: { id: 1, name: "AIR_FREIGHT", description: "International Air Courier / Cargo" },
    });

    await prisma.shipmentType.upsert({
      where: { id: 2 },
      update: { name: "SEA_FREIGHT", description: "Containerized Ocean Transport" },
      create: { id: 2, name: "SEA_FREIGHT", description: "Containerized Ocean Transport" },
    });

    await prisma.shipmentType.upsert({
      where: { id: 3 },
      update: { name: "LAND_EXPRESS", description: "Truck / Ground Courier Logistics" },
      create: { id: 3, name: "LAND_EXPRESS", description: "Truck / Ground Courier Logistics" },
    });

    // 14. Master Processes (Linked to Sections)
    console.log("-> Seeding Process Masters...");
    const procWax = await prisma.process.upsert({
      where: { id: 1 },
      update: {
        name: "Wax Injection & Tree Assembly",
        durationType: "Piece",
        leadTime: 30.0,
        prepTime: 5.0,
        cureTime: 0.0,
        sectionId: sections["WAX"].id,
        hasMachining: false,
        hasChecking: false,
        hasPacking: false,
      },
      create: {
        id: 1,
        name: "Wax Injection & Tree Assembly",
        durationType: "Piece",
        leadTime: 30.0,
        prepTime: 5.0,
        cureTime: 0.0,
        sectionId: sections["WAX"].id,
        hasMachining: false,
        hasChecking: false,
        hasPacking: false,
      },
    });

    const procCast = await prisma.process.upsert({
      where: { id: 2 },
      update: {
        name: "Casting & Metal Melting",
        durationType: "Batch",
        leadTime: 60.0,
        prepTime: 15.0,
        cureTime: 2.0,
        sectionId: sections["CAST"].id,
        hasMachining: false,
        hasChecking: false,
        hasPacking: false,
      },
      create: {
        id: 2,
        name: "Casting & Metal Melting",
        durationType: "Batch",
        leadTime: 60.0,
        prepTime: 15.0,
        cureTime: 2.0,
        sectionId: sections["CAST"].id,
        hasMachining: false,
        hasChecking: false,
        hasPacking: false,
      },
    });

    const procMach = await prisma.process.upsert({
      where: { id: 3 },
      update: {
        name: "CNC Precision Machining",
        durationType: "Piece",
        leadTime: 45.0,
        prepTime: 10.0,
        cureTime: 0.0,
        sectionId: sections["MACH"].id,
        hasMachining: true,
        hasChecking: false,
        hasPacking: false,
      },
      create: {
        id: 3,
        name: "CNC Precision Machining",
        durationType: "Piece",
        leadTime: 45.0,
        prepTime: 10.0,
        cureTime: 0.0,
        sectionId: sections["MACH"].id,
        hasMachining: true,
        hasChecking: false,
        hasPacking: false,
      },
    });

    const procQa = await prisma.process.upsert({
      where: { id: 4 },
      update: {
        name: "QA & CMM Inspection",
        durationType: "Piece",
        leadTime: 20.0,
        prepTime: 5.0,
        cureTime: 0.0,
        sectionId: sections["QA"].id,
        hasMachining: false,
        hasChecking: true,
        hasPacking: false,
      },
      create: {
        id: 4,
        name: "QA & CMM Inspection",
        durationType: "Piece",
        leadTime: 20.0,
        prepTime: 5.0,
        cureTime: 0.0,
        sectionId: sections["QA"].id,
        hasMachining: false,
        hasChecking: true,
        hasPacking: false,
      },
    });

    const procPack = await prisma.process.upsert({
      where: { id: 5 },
      update: {
        name: "Final Packaging & Boxing",
        durationType: "Piece",
        leadTime: 15.0,
        prepTime: 5.0,
        cureTime: 0.0,
        sectionId: sections["PACK"].id,
        hasMachining: false,
        hasChecking: false,
        hasPacking: true,
      },
      create: {
        id: 5,
        name: "Final Packaging & Boxing",
        durationType: "Piece",
        leadTime: 15.0,
        prepTime: 5.0,
        cureTime: 0.0,
        sectionId: sections["PACK"].id,
        hasMachining: false,
        hasChecking: false,
        hasPacking: true,
      },
    });

    // 15. Default Route & Steps
    console.log("-> Seeding Default Route & Steps...");
    const defaultRoute = await prisma.defaultRoute.upsert({
      where: { itemTypeId: fgItemType.id },
      update: {
        name: "Standard 5-Step Precision Investment Casting Route",
        description: "Standard flow: Wax -> Casting -> Machining -> QA -> Packing",
      },
      create: {
        name: "Standard 5-Step Precision Investment Casting Route",
        description: "Standard flow: Wax -> Casting -> Machining -> QA -> Packing",
        itemTypeId: fgItemType.id,
      },
    });

    const defaultRouteStepsData = [
      { sequenceNumber: "10", name: "Wax Injection", processId: procWax.id, sectionId: sections["WAX"].id, leadTime: 30, durationType: "Piece", hasPacking: false },
      { sequenceNumber: "20", name: "Casting & Pouring", processId: procCast.id, sectionId: sections["CAST"].id, leadTime: 60, durationType: "Batch", hasPacking: false },
      { sequenceNumber: "30", name: "CNC Machining", processId: procMach.id, sectionId: sections["MACH"].id, leadTime: 45, durationType: "Piece", hasMachining: true, hasPacking: false },
      { sequenceNumber: "40", name: "QA & Inspection", processId: procQa.id, sectionId: sections["QA"].id, leadTime: 20, durationType: "Piece", hasChecking: true, hasPacking: false },
      { sequenceNumber: "50", name: "Final Boxing & Packing", processId: procPack.id, sectionId: sections["PACK"].id, leadTime: 15, durationType: "Piece", hasPacking: true },
    ];

    for (const st of defaultRouteStepsData) {
      const existing = await prisma.defaultRouteStep.findFirst({
        where: { defaultRouteId: defaultRoute.id, sequenceNumber: st.sequenceNumber },
      });
      if (existing) {
        await prisma.defaultRouteStep.update({
          where: { id: existing.id },
          data: { ...st, deletedAt: null, deleted: false },
        });
      } else {
        await prisma.defaultRouteStep.create({
          data: {
            defaultRouteId: defaultRoute.id,
            ...st,
          },
        });
      }
    }

    // 16. Sample Products (Items) & Item Routes
    console.log("-> Seeding Products (Items) & Routings...");
    const valveItem = await prisma.item.upsert({
      where: { id: 1 },
      update: {
        itemCode: "10-10001-000",
        itemName: "Precision High-Pressure Stainless Valve Body",
        japaneseName: "高圧バルブボディ",
        colorCode: "SLV",
        color: "Silver",
        specification: "2-Inch Flanged Valve Body SS316L",
        endUser: "Aviation & Petrochemical",
        drawingProductNo: "DWG-10001",
        drawingRevisionNo: "A",
        stdItemWt: 0.45,
        castingWt: 0.58,
        cost: 45.0,
        sellingPrice: 125.0,
        unitPrice: 125.0,
        customerId: starkCustomer.id,
        itemTypeId: fgItemType.id,
        rawMaterialId: 1,
        boxTypeId: boxType20.id,
        deleted: false,
        deletedAt: null,
      },
      create: {
        id: 1,
        itemCode: "10-10001-000",
        itemName: "Precision High-Pressure Stainless Valve Body",
        japaneseName: "高圧バルブボディ",
        colorCode: "SLV",
        color: "Silver",
        specification: "2-Inch Flanged Valve Body SS316L",
        endUser: "Aviation & Petrochemical",
        drawingProductNo: "DWG-10001",
        drawingRevisionNo: "A",
        stdItemWt: 0.45,
        castingWt: 0.58,
        cost: 45.0,
        sellingPrice: 125.0,
        unitPrice: 125.0,
        customerId: starkCustomer.id,
        itemTypeId: fgItemType.id,
        rawMaterialId: 1,
        boxTypeId: boxType20.id,
      },
    });

    // Item Revision
    const existingRev = await prisma.itemRevision.findFirst({
      where: { itemId: valveItem.id },
    });
    if (!existingRev) {
      await prisma.itemRevision.create({
        data: {
          itemId: valveItem.id,
          ecnNo: "ECN-2026-001",
          details: "Initial Production Release Rev A",
        },
      });
    }

    // Item Route & Steps
    let itemRoute = await prisma.itemRoute.findFirst({
      where: { itemId: valveItem.id, type: "Default" },
    });
    if (!itemRoute) {
      itemRoute = await prisma.itemRoute.create({
        data: {
          itemId: valveItem.id,
          name: "Standard Valve Route",
          type: "Default",
        },
      });
    }

    for (const st of defaultRouteStepsData) {
      const existingStep = await prisma.itemRouteStep.findFirst({
        where: { itemRouteId: itemRoute.id, sequenceNumber: st.sequenceNumber },
      });
      if (existingStep) {
        await prisma.itemRouteStep.update({
          where: { id: existingStep.id },
          data: { ...st, deletedAt: null, deleted: false },
        });
      } else {
        await prisma.itemRouteStep.create({
          data: {
            itemRouteId: itemRoute.id,
            ...st,
          },
        });
      }
    }

    // 17. Fabrication & Fab Route
    console.log("-> Seeding Fabrication...");
    const fabrication = await prisma.fabrication.upsert({
      where: { itemId_code: { itemId: valveItem.id, code: "100" } },
      update: {
        sellingPrice: 15.0,
        unitPrice: 15.0,
        deleted: false,
        deletedAt: null,
      },
      create: {
        itemId: valveItem.id,
        code: "100",
        sellingPrice: 15.0,
        unitPrice: 15.0,
      },
    });

    console.log("✅ Master Data Seeding Completed Successfully!");
  } catch (error) {
    console.error("❌ Master Data Seeding Failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
