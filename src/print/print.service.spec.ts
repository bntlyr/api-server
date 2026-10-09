import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrintService } from "./print.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { JavaService } from "../java-service/java-service.service.js";

describe("PrintService", () => {
  let printService: PrintService;
  let mockPrisma: any;
  let mockJavaService: any;

  beforeEach(() => {
    mockPrisma = {
      productionSlip: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockJavaService = {
      printProductionSlip: vi.fn(),
      printProductionSlipBatch: vi.fn(),
      printTrialCard: vi.fn(),
    };

    printService = new PrintService(
      mockPrisma as unknown as PrismaService,
      mockJavaService as unknown as JavaService,
    );
  });

  it("should successfully print a single production slip", async () => {
    const mockSlip = {
      id: 101,
      orderNo: "SO-2026-001",
      lotNo: "1/2",
      type: "ORIGINAL",
      totalQty: 500,
      chargeNo: "CHG-99",
      salesOrder: {
        orderNo: "SO-2026-001",
        itemCode: "10-12345-000",
        requestedETD: new Date("2026-11-20"),
        orderQty: 1000,
        item: {
          itemCode: "10-12345-000",
          specification: "SUS316L",
          qtyPerTree: 50,
          coatingPattern: "E5.5D3A",
          drawingProductNo: "TM-01",
          castingTemp: 1550,
          mouldTemp: 1050,
        },
      },
      processes: [
        {
          id: 1,
          stepNo: 1,
          processName: "Wax Injection",
          scheduledStartDate: new Date("2026-10-15"),
          scheduledEndDate: new Date("2026-10-16"),
        },
      ],
    };

    mockPrisma.productionSlip.findUnique.mockResolvedValue(mockSlip);
    mockJavaService.printProductionSlip.mockResolvedValue({
      success: true,
      filename: "slip_101.pdf",
      downloadUrl: "/api/v1/print/download/production-slip?slipId=101",
      relativePath: "private/exports/production-slips/slip_101.pdf",
      fileSize: 150000,
      durationMs: 45,
    });

    const result = await printService.printProductionSlip({ slipId: 101 });

    expect(result.success).toBe(true);
    expect(result.filename).toBe("slip_101.pdf");
    expect(result.downloadUrl).toBe("/api/v1/print/download/production-slip?slipId=101");
    expect(mockJavaService.printProductionSlip).toHaveBeenCalled();
  });

  it("should return userError if production slip is not found", async () => {
    mockPrisma.productionSlip.findUnique.mockResolvedValue(null);

    const result = await printService.printProductionSlip({ slipId: 999 });

    expect(result.success).toBe(false);
    expect(result.userErrors).toHaveLength(1);
    expect(result.userErrors[0].message).toBe("Production slip not found");
  });

  it("should successfully print batch production slips", async () => {
    const mockSlips = [
      {
        id: 101,
        orderNo: "SO-BATCH-01",
        lotNo: "1/2",
        type: "ORIGINAL",
        totalQty: 500,
        salesOrder: { item: { itemCode: "10-001" } },
        processes: [],
      },
      {
        id: 102,
        orderNo: "SO-BATCH-01",
        lotNo: "2/2",
        type: "ORIGINAL",
        totalQty: 500,
        salesOrder: { item: { itemCode: "10-001" } },
        processes: [],
      },
    ];

    mockPrisma.productionSlip.findMany.mockResolvedValue(mockSlips);
    mockJavaService.printProductionSlipBatch.mockResolvedValue({
      success: true,
      filename: "SO-BATCH-01-slips.pdf",
      downloadUrl: "/api/v1/print/download/batch-production-slips?orderNo=SO-BATCH-01",
      relativePath: "private/exports/production-slips/batch/SO-BATCH-01-slips.pdf",
      fileSize: 300000,
      durationMs: 90,
    });

    const result = await printService.printProductionSlipBatch({ orderNo: "SO-BATCH-01" });

    expect(result.success).toBe(true);
    expect(result.filename).toBe("SO-BATCH-01-slips.pdf");
    expect(mockJavaService.printProductionSlipBatch).toHaveBeenCalledTimes(1);
  });

  it("should successfully print a trial card", async () => {
    const mockSlip = {
      id: 201,
      orderNo: "SO-TRIAL-01",
      lotNo: "LOT-01",
      trialLotNo: "T-2026-01",
      type: "ORIGINAL",
      remarks: "Trial evaluation",
      salesOrder: {
        item: {
          id: 55,
          itemCode: "10-99999-000",
          specification: "SCM440",
        },
      },
    };

    mockPrisma.productionSlip.findUnique.mockResolvedValue(mockSlip);
    mockJavaService.printTrialCard.mockResolvedValue({
      success: true,
      filename: "trial_card_55_201.pdf",
      downloadUrl: "/api/v1/print/download/trial-card?itemId=55&slipId=201",
      relativePath: "private/exports/trial-cards/trial_card_55_201.pdf",
      fileSize: 120000,
      durationMs: 30,
    });

    const result = await printService.printTrialCard({ slipId: 201 });

    expect(result.success).toBe(true);
    expect(result.filename).toBe("trial_card_55_201.pdf");
    expect(mockJavaService.printTrialCard).toHaveBeenCalled();
  });
});
