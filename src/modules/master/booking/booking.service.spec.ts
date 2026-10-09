import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingService } from "./booking.service.js";

describe("BookingService", () => {
  let service: BookingService;
  let mockPrisma: any;
  let mockLoader: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      booking: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        restore: vi.fn(),
      },
      productionProcess: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
      productionSlip: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
      },
      waxDefect: {
        create: vi.fn(),
      },
      fabDefect: {
        create: vi.fn(),
      },
      salesOrder: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockLoader = {
      byId: { load: vi.fn() },
      clear: vi.fn(),
    };

    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new BookingService(mockPrisma as any, mockLoader as any, mockAudit as any);
  });

  describe("bookProcessWithDefects", () => {
    it("successfully creates Booking, WaxDefect record, actualParameters JSON, and updates process to Completed", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 101,
        processName: "Wax Injection",
        neededQty: 500,
        status: "In-Progress",
        deleted: false,
        productionSlip: {
          id: 10,
          lotNo: "SO-100-01",
          orderNo: "SO-100",
          salesOrder: {
            id: 1,
            itemId: 50,
            itemCode: "ITEM-A",
            fabricationId: null,
          },
        },
      });

      mockPrisma.booking.create.mockResolvedValue({
        id: 1,
        bookingNo: "BK-12345-SO-100-01",
        passedQty: 480,
        rejectedQty: 20,
        totalInspectedQty: 500,
      });

      const res = await service.bookProcessWithDefects({
        productionProcessId: 101,
        passedQty: 480,
        rejectedQty: 20,
        actualParameters: JSON.stringify([{ parameter: "Die Temp", value: "185C" }]),
        waxDefect: {
          aSoluble: 5,
          eWrinkles: 10,
          aSurfaceShrinkage: 5,
        },
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productionProcessId: 101,
            passedQty: 480,
            rejectedQty: 20,
            totalInspectedQty: 500,
            actualParameters: [{ parameter: "Die Temp", value: "185C" }],
          }),
        }),
      );
      expect(mockPrisma.waxDefect.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 1,
            aSoluble: 5,
            eWrinkles: 10,
            aSurfaceShrinkage: 5,
            totalDefects: 20,
          }),
        }),
      );
      expect(mockPrisma.productionProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101 },
          data: expect.objectContaining({
            status: "Completed",
            isCompleted: true,
            passedQty: 480,
            rejectedQty: 20,
          }),
        }),
      );
    });

    it("rejects booking if total inspected quantity exceeds neededQty", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 101,
        neededQty: 500,
        status: "In-Progress",
        deleted: false,
        productionSlip: {
          salesOrder: { id: 1, itemId: 50 },
        },
      });

      const res = await service.bookProcessWithDefects({
        productionProcessId: 101,
        passedQty: 500,
        rejectedQty: 20, // Total 520 > 500
      });

      expect(res.userErrors).toHaveLength(1);
      expect(res.userErrors[0].message).toContain("exceeds needed quantity");
      expect(mockPrisma.booking.create).not.toHaveBeenCalled();
    });

    it("automatically generates Rework ProductionSlip and clones downstream processes when reworkQty > 0", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 102,
        stepNo: 2,
        processName: "Coating",
        neededQty: 500,
        status: "In-Progress",
        isFabrication: false,
        leadTime: 1.5,
        productionTime: 1.5,
        deleted: false,
        productionSlip: {
          id: 10,
          lotNo: "SO-100-01",
          orderNo: "SO-100",
          chargeNo: "C1",
          salesOrder: { id: 1, itemId: 50, itemCode: "ITEM-A" },
        },
      });

      mockPrisma.productionSlip.count.mockResolvedValue(0); // 0 existing reworks -> creates -R1
      mockPrisma.productionSlip.create.mockResolvedValue({
        id: 20,
        lotNo: "SO-100-01-R1",
        totalQty: 50,
      });

      mockPrisma.productionProcess.create
        .mockResolvedValueOnce({ id: 201, stepNo: 1, processName: "[REWORK] Coating" })
        .mockResolvedValueOnce({ id: 202, stepNo: 2, processName: "Casting" });

      mockPrisma.productionProcess.findMany.mockResolvedValue([
        {
          id: 103,
          stepNo: 3,
          processId: 5,
          processName: "Casting",
          itemCode: "ITEM-A",
          isFabrication: false,
          leadTime: 2,
          productionTime: 2,
        },
      ]);

      mockPrisma.booking.create.mockResolvedValue({
        id: 2,
        bookingNo: "BK-999-SO-100-01",
      });

      const res = await service.bookProcessWithDefects({
        productionProcessId: 102,
        passedQty: 430,
        rejectedQty: 20,
        reworkQty1: 50, // 50 rework qty
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.productionSlip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lotNo: "SO-100-01-R1",
            type: "REWORK",
            totalQty: 50,
          }),
        }),
      );
      // Verify Step 1 is rework step
      expect(mockPrisma.productionProcess.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productionSlipId: 20,
            stepNo: 1,
            isRework: true,
            neededQty: 50,
          }),
        }),
      );
      // Verify Step 2 is cloned downstream step
      expect(mockPrisma.productionProcess.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productionSlipId: 20,
            stepNo: 2,
            processName: "Casting",
            isRework: false,
            neededQty: 50,
            previousProcessId: 201,
          }),
        }),
      );
    });

    it("rejects rework when non-fabrication lot exceeds max 3 reworks limit", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 102,
        stepNo: 2,
        processName: "Coating",
        neededQty: 500,
        status: "In-Progress",
        isFabrication: false,
        deleted: false,
        productionSlip: {
          id: 10,
          lotNo: "SO-100-01",
          salesOrder: { id: 1 },
        },
      });

      mockPrisma.productionSlip.count.mockResolvedValue(3); // already 3 reworks

      const res = await service.bookProcessWithDefects({
        productionProcessId: 102,
        passedQty: 450,
        rejectedQty: 20,
        reworkQty1: 30,
      });

      expect(res.userErrors).toHaveLength(1);
      expect(res.userErrors[0].message).toContain("Maximum rework limit reached (3 reworks");
    });

    it("allows 4th rework bonus on fabrication process", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 104,
        stepNo: 4,
        processName: "CNC Milling",
        neededQty: 100,
        status: "In-Progress",
        isFabrication: true, // Fabrication bonus (+1)
        leadTime: 1,
        productionTime: 1,
        deleted: false,
        productionSlip: {
          id: 10,
          lotNo: "SO-100-01",
          orderNo: "SO-100",
          salesOrder: { id: 1, itemId: 50 },
        },
      });

      mockPrisma.productionSlip.count.mockResolvedValue(3); // 3 existing, allowed up to 4 in fab
      mockPrisma.productionProcess.findMany.mockResolvedValue([]);
      mockPrisma.productionSlip.create.mockResolvedValue({ id: 25, lotNo: "SO-100-01-R4" });
      mockPrisma.productionProcess.create.mockResolvedValue({ id: 251 });
      mockPrisma.booking.create.mockResolvedValue({ id: 3 });

      const res = await service.bookProcessWithDefects({
        productionProcessId: 104,
        passedQty: 90,
        rejectedQty: 0,
        reworkQty1: 10,
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.productionSlip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lotNo: "SO-100-01-R4",
            totalQty: 10,
          }),
        }),
      );
    });
  });

  describe("checkRemakeEligibility", () => {
    it("returns isRemakeEligible = false when cumulative rejects do not exceed scrap buffer", async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: "SO-100",
        orderQty: 1000,
        allocatedQty: 0,
        item: { rejectionRate: 5 },
        productionSlips: [
          {
            id: 10,
            type: "ORIGINAL",
            totalQty: 1050, // Scrap buffer = 1050 - 1000 = 50
            processes: [
              { rejectedQty: 20 },
              { rejectedQty: 15 },
            ], // Cumulative rejects = 35 <= 50
          },
        ],
      });

      const result = await service.checkRemakeEligibility(1);

      expect(result.isRemakeEligible).toBe(false);
      expect(result.totalCumulativeRejects).toBe(35);
      expect(result.scrapBufferQty).toBe(50);
      expect(result.shortfallQty).toBe(0);
      expect(result.suggestedRemakeQty).toBe(0);
    });

    it("returns isRemakeEligible = true with suggestedRemakeQty scaled by rejection rate when rejects exceed scrap buffer", async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: "SO-100",
        orderQty: 1000,
        allocatedQty: 0,
        item: { rejectionRate: 10 }, // 10% scrap rate
        productionSlips: [
          {
            id: 10,
            type: "ORIGINAL",
            totalQty: 1050, // Scrap buffer = 50
            processes: [
              { rejectedQty: 40 },
              { rejectedQty: 30 },
            ], // Cumulative rejects = 70 > 50 -> shortfall = 20
          },
        ],
      });

      const result = await service.checkRemakeEligibility(1);

      expect(result.isRemakeEligible).toBe(true);
      expect(result.totalCumulativeRejects).toBe(70);
      expect(result.scrapBufferQty).toBe(50);
      expect(result.shortfallQty).toBe(20);
      // suggestedRemakeQty = ceil(20 * 1.10) = 22
      expect(result.suggestedRemakeQty).toBe(22);
    });
  });
});
