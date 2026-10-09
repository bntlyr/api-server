import { describe, it, expect, vi, beforeEach } from "vitest";
import { FinishedGoodsAllocationService } from "./fg-allocation.service.js";

describe("FinishedGoodsAllocationService", () => {
  let service: FinishedGoodsAllocationService;
  let mockPrisma: any;
  let mockLoader: any;
  let mockFgLotLoader: any;
  let mockSalesOrderLoader: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockPrisma = {
      salesOrder: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      finishedGoodsLot: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      finishedGoodsAllocationRequest: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
      finishedGoodsTransaction: {
        create: vi.fn(),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockLoader = {
      byId: { load: vi.fn() },
      bySalesOrderId: { load: vi.fn() },
      clear: vi.fn(),
    };

    mockFgLotLoader = { clear: vi.fn() };
    mockSalesOrderLoader = { clear: vi.fn() };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      send: vi.fn().mockResolvedValue({ notification: { id: 1 }, userErrors: [] }),
    };

    service = new FinishedGoodsAllocationService(
      mockPrisma as any,
      mockLoader as any,
      mockFgLotLoader as any,
      mockSalesOrderLoader as any,
      mockAuditService as any,
      mockNotificationService as any,
    );
  });

  describe("submitAllocations", () => {
    it("creates allocation requests and sends notification to warehouse approvers", async () => {
      mockPrisma.finishedGoodsLot.findFirst.mockResolvedValue({
        id: 10,
        lotNo: "FG-LOT-100",
        availableQty: 500,
      });

      mockPrisma.finishedGoodsAllocationRequest.findFirst.mockResolvedValue(null);
      mockPrisma.finishedGoodsAllocationRequest.create.mockResolvedValue({
        id: 1,
        salesOrderId: 5,
        finishedGoodsLotId: 10,
        allocationQty: 100,
        status: "Pending",
      });

      mockPrisma.user.findMany.mockResolvedValue([
        { id: "warehouse-mgr-01" },
      ]);

      mockPrisma.salesOrder.findFirst.mockResolvedValue({
        id: 5,
        orderNo: "SO-500",
      });

      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 5,
        orderNo: "SO-500",
      });

      const payload = await service.submitFgAllocations(
        {
          salesOrderId: 5,
          allocations: [{ lotId: 10, allocationQty: 100, remarks: "Need 100 pcs" }],
        },
        { user: { id: "planner-01" } },
      );

      expect(payload.success).toBe(true);
      expect(payload.requests).toHaveLength(1);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: ["warehouse-mgr-01"],
          title: expect.stringContaining("New FG Allocation Request: SO-500"),
        }),
        expect.anything(),
      );
    });
  });

  describe("approveFinishedGoodsAllocationRequest", () => {
    it("approves request, decrements availableQty, creates FG transaction, and notifies requestor", async () => {
      mockPrisma.finishedGoodsAllocationRequest.findFirst.mockResolvedValue({
        id: 1,
        salesOrderId: 5,
        finishedGoodsLotId: 10,
        allocationQty: 50,
        status: "Pending",
        createdById: "planner-01",
      });

      mockPrisma.finishedGoodsLot.findFirst.mockResolvedValue({
        id: 10,
        lotNo: "FG-LOT-100",
        availableQty: 500,
        allocatedQty: 0,
        areaId: 1,
        locationId: 2,
        boxId: 3,
        itemId: 20,
        fabricationId: null,
      });

      mockPrisma.salesOrder.findFirst.mockResolvedValue({
        id: 5,
        orderNo: "SO-500",
        orderQty: 50,
        allocatedQty: 0,
        createdBy: "sales-pic-01",
      });

      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 5,
        orderNo: "SO-500",
        createdBy: "sales-pic-01",
      });

      mockPrisma.finishedGoodsAllocationRequest.update.mockResolvedValue({
        id: 1,
        status: "Accepted",
        allocationQty: 50,
        salesOrderId: 5,
        createdById: "planner-01",
      });

      const res = await service.approveFinishedGoodsAllocationRequest(
        1,
        2, // destinationAreaId
        3, // destinationLocationId
        "Approved for shipping",
        { user: { id: "warehouse-mgr-01" } },
      );

      expect(res.userErrors).toHaveLength(0);
      expect(mockPrisma.finishedGoodsLot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({
            availableQty: { decrement: 50 },
            allocatedQty: { increment: 50 },
          }),
        }),
      );
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: expect.arrayContaining(["planner-01", "sales-pic-01"]),
          title: expect.stringContaining("FG Allocation Approved: SO-500"),
        }),
        expect.anything(),
      );
    });
  });

  describe("rejectFinishedGoodsAllocationRequest", () => {
    it("rejects request and sends notification to requestor with reason", async () => {
      mockPrisma.finishedGoodsAllocationRequest.findFirst.mockResolvedValue({
        id: 2,
        salesOrderId: 5,
        finishedGoodsLotId: 10,
        allocationQty: 50,
        status: "Pending",
        createdById: "planner-01",
      });

      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 5,
        orderNo: "SO-500",
      });

      mockPrisma.finishedGoodsAllocationRequest.update.mockResolvedValue({
        id: 2,
        status: "Rejected",
        rejectionReason: "Stock reserved for urgent order",
      });

      const res = await service.rejectFinishedGoodsAllocationRequest(
        2,
        "Stock reserved for urgent order",
        { user: { id: "warehouse-mgr-01" } },
      );

      expect(res.userErrors).toHaveLength(0);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: "planner-01",
          title: expect.stringContaining("FG Allocation Rejected: SO-500"),
          message: expect.stringContaining("Stock reserved for urgent order"),
        }),
        expect.anything(),
      );
    });
  });
});
