import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductionExecutionService } from "./production-execution.service.js";
import type { PrismaService } from "../../../prisma/prisma.service.js";
import type { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import type { NotificationService } from "../../../notification/notification.service.js";

describe("ProductionExecutionService", () => {
  let service: ProductionExecutionService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockPrisma = {
      productionProcess: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      productionSlip: {
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      productionDtr: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
      salesOrder: {
        update: vi.fn(),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      boxContainer: {
        upsert: vi.fn().mockResolvedValue({ id: 1 }),
      },
      boxContainerItem: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
      },
      fabrication: {
        findFirst: vi.fn().mockResolvedValue({ id: 0 }),
        create: vi.fn().mockResolvedValue({ id: 0 }),
      },
      finishedGoodsLot: {
        upsert: vi.fn(),
      },
      finishedGoodsTransaction: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      send: vi.fn().mockResolvedValue({ notification: { id: 1 }, userErrors: [] }),
    };

    service = new ProductionExecutionService(
      mockPrisma as unknown as PrismaService,
      mockAuditService as unknown as AuditTrailService,
      mockNotificationService as unknown as NotificationService,
    );
  });

  describe("1. IN: Receive Process", () => {
    it("successfully receives Step 1 without previous process and transitions status to 'Received'", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 101,
        processName: "Wax Injection",
        status: "Pending",
        previousProcessId: null,
        productionSlipId: 10,
        productionSlip: { id: 10, lotNo: "SO-01-01", status: "Pending" },
      });

      mockPrisma.productionProcess.update.mockResolvedValue({
        id: 101,
        status: "Received",
        isReceived: true,
      });

      const res = await service.receive({ processId: 101 });

      expect(res.userErrors).toHaveLength(0);
      expect(res.productionProcess?.status).toBe("Received");
      expect(mockPrisma.productionProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "Received", isReceived: true }),
        }),
      );
      expect(mockPrisma.productionSlip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "In Progress" }),
        }),
      );
    });

    it("rejects receiving Step 2 if Step 1 is not yet Transferred", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 102,
        processName: "Casting",
        status: "Pending",
        previousProcessId: 101,
        previousProcess: { id: 101, processName: "Wax Injection", status: "Completed" }, // not Transferred
        productionSlip: { id: 10, lotNo: "SO-01-01", status: "In Progress" },
      });

      const res = await service.receive({ processId: 102 });

      expect(res.userErrors).toHaveLength(1);
      expect(res.userErrors[0].message).toContain("must be 'Transferred' (OUT)");
      expect(mockPrisma.productionProcess.update).not.toHaveBeenCalled();
    });
  });

  describe("2. DTR Start & Stop", () => {
    it("starts DTR, creates Started record, and transitions process from 'Received' to 'In-Progress'", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 101,
        processName: "Wax Injection",
        status: "Received",
        productionSlipId: 10,
        productionSlip: { lotNo: "SO-01-01" },
      });

      mockPrisma.productionDtr.findFirst.mockResolvedValue(null);
      mockPrisma.productionDtr.create.mockResolvedValue({
        id: 1,
        status: "Started",
        currentProcessName: "Wax Injection",
        userId: "WORKER_1",
      });

      const res = await service.startDtr({ processId: 101 }, { req: { user: { id: "WORKER_1" } } });

      expect(res.userErrors).toHaveLength(0);
      expect(res.productionDtr?.status).toBe("Started");
      expect(mockPrisma.productionProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "In-Progress" }),
        }),
      );
    });

    it("stops DTR, sets status 'Stopped', and calculates output without exceeding neededQty", async () => {
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      mockPrisma.productionDtr.findUnique.mockResolvedValue({
        id: 1,
        status: "Started",
        startTime,
        productionProcessId: 101,
        currentProcessName: "Wax",
        productionProcess: { id: 101, neededQty: 500 },
      });

      mockPrisma.productionDtr.findMany.mockResolvedValue([
        { passedQty: 200, rejectedQty: 10, reworkQty: 0 },
      ]);

      mockPrisma.productionDtr.update.mockResolvedValue({
        id: 1,
        status: "Stopped",
        passedQty: 250,
        rejectedQty: 10,
        durationMinutes: 60,
      });

      const res = await service.stopDtr(
        { dtrId: 1, passedQty: 250, rejectedQty: 10 },
        { req: { user: { id: "WORKER_1" } } },
      );

      expect(res.userErrors).toHaveLength(0);
      expect(res.productionDtr?.status).toBe("Stopped");
      expect(mockPrisma.productionProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passedQty: { increment: 250 },
            rejectedQty: { increment: 10 },
          }),
        }),
      );
    });

    it("fails to stop DTR if cumulative quantity exceeds process neededQty", async () => {
      mockPrisma.productionDtr.findUnique.mockResolvedValue({
        id: 2,
        status: "Started",
        startTime: new Date(),
        productionProcessId: 101,
        productionProcess: { id: 101, neededQty: 500 },
      });

      mockPrisma.productionDtr.findMany.mockResolvedValue([
        { passedQty: 450, rejectedQty: 0, reworkQty: 0 },
      ]);

      // Attempting to log 100 more when 450 is already logged and neededQty is 500 (450 + 100 = 550 > 500)
      const res = await service.stopDtr({ dtrId: 2, passedQty: 100, rejectedQty: 0 });

      expect(res.userErrors).toHaveLength(1);
      expect(res.userErrors[0].message).toContain("exceeds process needed quantity");
    });
  });

  describe("3. BOOK: QA Booking", () => {
    it("transitions process to 'Completed' and sets inspected tallies", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 101,
        processName: "Wax",
        status: "In-Progress",
        neededQty: 500,
        actualStartDate: new Date(Date.now() - 7200000),
      });

      mockPrisma.productionProcess.update.mockResolvedValue({
        id: 101,
        status: "Completed",
        isCompleted: true,
        passedQty: 480,
        rejectedQty: 20,
      });

      const res = await service.book({ processId: 101, passedQty: 480, rejectedQty: 20 });

      expect(res.userErrors).toHaveLength(0);
      expect(res.productionProcess?.status).toBe("Completed");
    });
  });

  describe("4. OUT: Transfer / Dispatch with Shrinkage Propagation", () => {
    it("transitions process to 'Transferred' and shrinks next process neededQty", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 101,
        processName: "Wax",
        status: "Completed",
        passedQty: 480,
        productionSlipId: 10,
        productionSlip: {
          id: 10,
          salesOrderId: 1,
          processes: [
            { id: 101, stepNo: 1, passedQty: 480 },
            { id: 102, stepNo: 2, neededQty: 500 }, // Next process
          ],
        },
      });

      mockPrisma.productionProcess.update.mockResolvedValue({
        id: 101,
        status: "Transferred",
        isTransferred: true,
      });

      const res = await service.transfer({ processId: 101 });

      expect(res.userErrors).toHaveLength(0);
      expect(res.productionProcess?.status).toBe("Transferred");
      // Verify next process neededQty was shrunk to 480 (from 500)
      expect(mockPrisma.productionProcess.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 102 },
          data: expect.objectContaining({ neededQty: 480 }),
        }),
      );
    });

    it("completes ProductionSlip and updates SalesOrder when final process is Transferred", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 103,
        processName: "Packing",
        status: "Completed",
        passedQty: 480,
        productionSlipId: 10,
        productionSlip: {
          id: 10,
          salesOrderId: 1,
          processes: [{ id: 103, stepNo: 3, passedQty: 480 }], // Only step or final step
        },
      });

      mockPrisma.productionProcess.update.mockResolvedValue({
        id: 103,
        status: "Transferred",
      });

      mockPrisma.productionSlip.count.mockResolvedValue(0); // all slips completed

      const res = await service.transfer({ processId: 103 });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.productionSlip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({ status: "Completed" }),
        }),
      );
      expect(mockPrisma.salesOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            producedQty: { increment: 480 },
            productionStatus: "Completed",
            status: "Shipping",
          }),
        }),
      );
    });

    it("upserts FinishedGoodsLot and FinishedGoodsTransaction when BoxContainer items are present on final Transfer", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 103,
        processName: "Packing",
        status: "Completed",
        passedQty: 480,
        productionSlipId: 10,
        productionSlip: {
          id: 10,
          salesOrderId: 1,
          processes: [{ id: 103, stepNo: 3, passedQty: 480 }],
        },
      });

      mockPrisma.productionProcess.update.mockResolvedValue({
        id: 103,
        status: "Transferred",
      });

      mockPrisma.boxContainerItem.findMany.mockResolvedValue([
        {
          id: 501,
          itemId: 50,
          fabricationId: null,
          orderNo: "SO-100",
          lotNo: "SO-100-01",
          chargeNo: "C1",
          quantity: 480,
          boxContainer: {
            boxNo: "BOX-202610-0001",
            boxTypeId: 2,
            areaId: 30,
            locationId: 40,
          },
        },
      ]);

      mockPrisma.finishedGoodsLot.upsert.mockResolvedValue({
        id: 99,
        availableQty: 480,
      });

      mockPrisma.productionSlip.count.mockResolvedValue(0);

      const res = await service.transfer({ processId: 103 });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.finishedGoodsLot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            itemId_fabricationId_orderNo_lotNo_chargeNo_areaId_locationId_boxId: {
              itemId: 50,
              fabricationId: 0,
              orderNo: "SO-100",
              lotNo: "SO-100-01",
              chargeNo: "C1",
              areaId: 30,
              locationId: 40,
              boxId: 2,
            },
          },
        }),
      );
      expect(mockPrisma.finishedGoodsTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: "PRODUCTION",
            direction: "INBOUND",
            referenceNo: "BOX-202610-0001",
            invoiceNo: "SO-100-01",
            quantity: 480,
            toAreaId: 30,
            toLocationId: 40,
          }),
        }),
      );
    });
  });

  describe("5. ASSIGN BOX: Packaging & Handover", () => {
    it("creates FinishedGoodsLot and FinishedGoodsTransaction when CLOSED box is assigned", async () => {
      mockPrisma.productionProcess.findUnique.mockResolvedValue({
        id: 103,
        passedQty: 480,
        productionSlipId: 10,
        productionSlip: {
          id: 10,
          orderNo: "SO-100",
          lotNo: "SO-100-01",
          chargeNo: "C1",
          salesOrder: { id: 1, itemId: 50, fabricationId: null },
        },
      });

      mockPrisma.finishedGoodsLot.upsert.mockResolvedValue({
        id: 500,
        availableQty: 480,
      });

      mockPrisma.productionProcess.update.mockResolvedValue({
        id: 103,
        boxId: 1,
        boxStatus: "CLOSED",
      });

      mockPrisma.productionSlip.update.mockResolvedValue({
        id: 10,
        boxId: 1,
        boxStatus: "CLOSED",
      });

      const res = await service.assignBox({
        processId: 103,
        boxId: 1,
        boxStatus: "CLOSED",
        areaId: 2,
        locationId: 5,
      });

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.finishedGoodsLot.upsert).toHaveBeenCalled();
      expect(mockPrisma.finishedGoodsTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: "PRODUCTION",
            direction: "INBOUND",
            quantity: 480,
          }),
        }),
      );
      expect(mockPrisma.salesOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            packedQty: { increment: 480 },
          }),
        }),
      );
    });
  });

  describe("Floor Monitoring: notifyLeftRunningDtrs", () => {
    it("identifies stale DTRs running longer than threshold and dispatches notifications", async () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

      mockPrisma.productionDtr.findMany.mockResolvedValue([
        {
          id: 501,
          userId: "worker-01",
          currentProcessName: "Wax Injection",
          productionProcessId: 101,
          startTime: fiveHoursAgo,
          productionProcess: {
            processName: "Wax Injection",
            productionSlip: { lotNo: "SO-100-01" },
            process: { sectionId: 10 },
          },
        },
      ]);

      const result = await service.notifyLeftRunningDtrs(4.0);

      expect(result.userErrors).toHaveLength(0);
      expect(result.notifiedCount).toBe(1);
      expect(result.dtrIds).toEqual([501]);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: "worker-01",
          title: expect.stringContaining("Active DTR Left Running"),
          message: expect.stringContaining("running for 5.0 hours"),
        }),
        undefined,
      );
    });
  });
});
