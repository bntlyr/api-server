import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExcelService } from "./excel.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/services/storage.service.js";

describe("ExcelService", () => {
  let service: ExcelService;
  let prisma: any;
  let storageService: any;

  beforeEach(() => {
    prisma = {
      salesOrder: {
        findMany: vi.fn(),
      },
    };

    storageService = {
      saveBuffer: vi.fn().mockImplementation(async (subPath, filename, buffer) => {
        return {
          absolutePath: `/tmp/uploads/${subPath}/${filename}`,
          relativePath: `${subPath}/${filename}`,
        };
      }),
    };

    service = new ExcelService(
      prisma as unknown as PrismaService,
      storageService as unknown as StorageService,
    );
  });

  it("should successfully export tabular direct data (dataJson)", async () => {
    const rawData = [
      { orderNo: "SO-2026-001", customer: "Toyota", qty: 500, price: 12.5 },
      { orderNo: "SO-2026-002", customer: "Honda", qty: 250, price: 8.75 },
    ];

    const input = {
      title: "Sales Orders Export",
      filename: "sales_orders",
      sheetName: "Sales Orders",
      columns: [
        { header: "Order #", key: "orderNo" },
        { header: "Customer Name", key: "customer" },
        { header: "Order Quantity", key: "qty" },
        { header: "Unit Price", key: "price" },
      ],
      dataJson: JSON.stringify(rawData),
    };

    const result = await service.exportToExcel(input);

    expect(result.success).toBe(true);
    expect(result.totalRows).toBe(2);
    expect(result.filename).toMatch(/^sales_orders.*\.xlsx$/);
    expect(result.filePath).toContain("exports/excel/");
    expect(result.downloadUrl).toContain("/api/storage/private/exports/excel/");
    expect(result.fileSizeBytes).toBeGreaterThan(0);
    expect(result.userErrors).toHaveLength(0);
    expect(storageService.saveBuffer).toHaveBeenCalled();
  });

  it("should stream and chunk entity data from Prisma into a single unified worksheet", async () => {
    // Generate mock records for 2 chunks
    const chunk1 = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      orderNo: `SO-${i + 1}`,
      customer: "Client A",
    }));
    const chunk2 = Array.from({ length: 300 }, (_, i) => ({
      id: 1000 + i + 1,
      orderNo: `SO-${1000 + i + 1}`,
      customer: "Client B",
    }));

    prisma.salesOrder.findMany
      .mockResolvedValueOnce(chunk1)
      .mockResolvedValueOnce(chunk2);

    const input = {
      title: "All Sales Orders",
      entityName: "SalesOrder",
      columns: [
        { header: "ID", key: "id" },
        { header: "Order #", key: "orderNo" },
        { header: "Customer", key: "customer" },
      ],
    };

    const result = await service.exportToExcel(input);

    expect(result.success).toBe(true);
    expect(result.totalRows).toBe(1300);
    expect(prisma.salesOrder.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.salesOrder.findMany).toHaveBeenNthCalledWith(1, {
      take: 1000,
      skip: 0,
    });
    expect(prisma.salesOrder.findMany).toHaveBeenNthCalledWith(2, {
      take: 1000,
      skip: 1000,
    });
    expect(storageService.saveBuffer).toHaveBeenCalled();
  });

  it("should infer columns automatically when none are provided", async () => {
    const rawData = [
      { id: 1, lotNo: "LOT-001", availableQty: 100 },
    ];

    const input = {
      title: "Lot Inventory",
      columns: [],
      dataJson: JSON.stringify(rawData),
    };

    const result = await service.exportToExcel(input);

    expect(result.success).toBe(true);
    expect(result.totalRows).toBe(1);
    expect(storageService.saveBuffer).toHaveBeenCalled();
  });

  it("should return a validation error if dataJson is invalid JSON", async () => {
    const input = {
      title: "Invalid Data Test",
      columns: [],
      dataJson: "{not-valid-json}",
    };

    const result = await service.exportToExcel(input);

    expect(result.success).toBe(false);
    expect(result.totalRows).toBe(0);
    expect(result.userErrors[0].code).toBe("JSON_PARSE_ERROR");
  });

  it("should return an error if unknown entityName is provided", async () => {
    const input = {
      title: "Unknown Entity Test",
      entityName: "NonExistentModel",
      columns: [],
    };

    const result = await service.exportToExcel(input);

    expect(result.success).toBe(false);
    expect(result.userErrors[0].code).toBe("ENTITY_NOT_FOUND");
  });
});
