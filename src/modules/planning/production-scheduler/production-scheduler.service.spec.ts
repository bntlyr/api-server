import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductionSchedulerService } from "./production-scheduler.service.js";
import type { PrismaService } from "../../../prisma/prisma.service.js";
import type { JavaService } from "../../../java-service/java-service.service.js";
import type { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import type { NotificationService } from "../../../notification/notification.service.js";

describe("ProductionSchedulerService", () => {
  let service: ProductionSchedulerService;
  let mockPrisma: any;
  let mockJavaService: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockPrisma = {
      salesOrder: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      holiday: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      process: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      section: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      productionProcess: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn(),
      },
      productionSlip: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockJavaService = {
      scheduleProduction: vi.fn(),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      send: vi.fn().mockResolvedValue({ notification: { id: 1 }, userErrors: [] }),
    };

    service = new ProductionSchedulerService(
      mockPrisma as unknown as PrismaService,
      mockJavaService as unknown as JavaService,
      mockAuditService as unknown as AuditTrailService,
      mockNotificationService as unknown as NotificationService,
    );
  });

  it("preview() correctly gathers DB models and calls Java microservice", async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 1,
      orderNo: "SO-TEST-001",
      itemCode: "10-12345-000",
      orderQty: 1000,
      allocatedQty: 100,
      requestedETD: new Date("2026-12-01"),
      status: "Pending",
      item: {
        rejectionRate: 5,
        autoSplitQty: 500,
        stdItemWt: 0.25,
        castingWt: 0.3,
        itemRoutes: [
          {
            steps: [
              {
                sequenceNumber: "1",
                processId: 101,
                name: "Wax Injection",
                leadTime: 60,
                leadTimeUnit: "Minutes",
                durationType: "Batch",
                hasPacking: false,
                maxPcsPerDay: 1000,
              },
            ],
          },
        ],
      },
    });

    mockJavaService.scheduleProduction.mockResolvedValue({
      orderNo: "SO-TEST-001",
      salesOrderId: 1,
      productionId: "PROD-SO-TEST-001",
      netRequiredQty: 900,
      totalProductionQty: 945,
      lotCount: 2,
      requestedEtd: "2026-12-01",
      targetEndDate: "2026-11-15",
      scheduledStartDate: "2026-11-01",
      scheduledEndDate: "2026-11-14",
      totalWorkingDays: 12,
      isDelayed: false,
      delayWorkingDays: 0,
      schedulingMode: "BACKWARD",
      slips: [
        {
          lotNo: "SO-TEST-001-01",
          orderNo: "SO-TEST-001",
          type: "ORIGINAL",
          totalQty: 500,
          startDate: "2026-11-01",
          endDate: "2026-11-07",
          totalDays: 6,
          processes: [
            {
              stepNo: 1,
              processId: 101,
              processName: "Wax Injection",
              itemCode: "10-12345-000",
              isFabrication: false,
              scheduledStartDate: "2026-11-01",
              scheduledEndDate: "2026-11-07",
              leadTime: 60,
              productionTime: 1,
              neededQty: 500,
              nextStepNos: [],
            },
          ],
        },
      ],
      resultingLoads: [],
      capacityWarnings: [],
    });

    const result = await service.preview({ salesOrderId: 1 });

    expect(result).toBeDefined();
    expect(result.orderNo).toBe("SO-TEST-001");
    expect(result.netRequiredQty).toBe(900);
    expect(result.totalProductionQty).toBe(945);
    expect(result.slips).toHaveLength(1);
    expect(mockJavaService.scheduleProduction).toHaveBeenCalled();
  });

  it("createSchedule() persists slips, chained processes, and updates SalesOrder inside a transaction", async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 1,
      orderNo: "SO-TEST-002",
      itemCode: "10-12345-000",
      orderQty: 500,
      allocatedQty: 0,
      requestedETD: new Date("2026-12-01"),
      status: "Pending",
      item: {
        rejectionRate: 0,
        autoSplitQty: 500,
        itemRoutes: [],
      },
    });

    mockJavaService.scheduleProduction.mockResolvedValue({
      orderNo: "SO-TEST-002",
      salesOrderId: 1,
      productionId: "PROD-SO-TEST-002",
      netRequiredQty: 500,
      totalProductionQty: 500,
      lotCount: 1,
      scheduledStartDate: "2026-11-01",
      scheduledEndDate: "2026-11-10",
      totalWorkingDays: 9,
      isDelayed: false,
      delayWorkingDays: 0,
      schedulingMode: "BACKWARD",
      slips: [
        {
          lotNo: "SO-TEST-002-01",
          orderNo: "SO-TEST-002",
          type: "ORIGINAL",
          totalQty: 500,
          startDate: "2026-11-01",
          endDate: "2026-11-10",
          totalDays: 9,
          processes: [
            {
              stepNo: 1,
              processId: 101,
              processName: "Wax",
              itemCode: "10-12345-000",
              isFabrication: false,
              scheduledStartDate: "2026-11-01",
              scheduledEndDate: "2026-11-05",
              leadTime: 60,
              productionTime: 1,
              neededQty: 500,
              nextStepNos: [2],
            },
            {
              stepNo: 2,
              processId: 102,
              processName: "Casting",
              itemCode: "10-12345-000",
              isFabrication: false,
              scheduledStartDate: "2026-11-06",
              scheduledEndDate: "2026-11-10",
              leadTime: 120,
              productionTime: 2,
              neededQty: 500,
              nextStepNos: [],
            },
          ],
        },
      ],
      resultingLoads: [],
      capacityWarnings: [],
    });

    mockPrisma.productionSlip.create.mockResolvedValue({
      id: 10,
      lotNo: "SO-TEST-002-01",
      salesOrderId: 1,
    });

    mockPrisma.productionProcess.create
      .mockResolvedValueOnce({ id: 101, stepNo: 1, previousProcessId: null })
      .mockResolvedValueOnce({ id: 102, stepNo: 2, previousProcessId: 101 });

    mockPrisma.salesOrder.update.mockResolvedValue({
      id: 1,
      orderNo: "SO-TEST-002",
      productionId: "PROD-SO-TEST-002",
      productionPlanningStatus: "Planned",
      status: "Production",
    });

    const payload = await service.createSchedule({ salesOrderId: 1 });

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.productionId).toBe("PROD-SO-TEST-002");
    expect(payload.slips).toHaveLength(1);
    expect(mockPrisma.productionSlip.create).toHaveBeenCalled();
    expect(mockPrisma.productionProcess.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.salesOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          productionId: "PROD-SO-TEST-002",
          productionPlanningStatus: "Planned",
          status: "Production",
        }),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE_PRODUCTION_SCHEDULE",
        tableName: "SalesOrder",
        recordId: "1",
      }),
    );
  });

  it("returns error if Sales Order is cancelled", async () => {
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 99,
      orderNo: "SO-CANCELLED",
      status: "Cancelled",
    });

    const payload = await service.createSchedule({ salesOrderId: 99 });

    expect(payload.userErrors).toHaveLength(1);
    expect(payload.userErrors[0].message).toContain("cancelled");
    expect(mockJavaService.scheduleProduction).not.toHaveBeenCalled();
  });

  describe("Remake Scheduling", () => {
    it("previewRemakeSchedule() formats remake lot numbers with -RM suffix and type REMAKE", async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: "SO-TEST-003",
        itemCode: "10-12345-000",
        orderQty: 1000,
        allocatedQty: 0,
        requestedETD: new Date("2026-12-01"),
        status: "Production",
        item: {
          rejectionRate: 0,
          autoSplitQty: 500,
          itemRoutes: [],
        },
        productionSlips: [
          {
            id: 10,
            type: "ORIGINAL",
            totalQty: 1000,
            processes: [{ rejectedQty: 50 }],
          },
        ],
      });

      mockPrisma.productionSlip.count.mockResolvedValue(1); // 1 existing remake slip -> next is -RM02

      mockJavaService.scheduleProduction.mockResolvedValue({
        orderNo: "SO-TEST-003",
        salesOrderId: 1,
        productionId: "PROD-SO-TEST-003",
        netRequiredQty: 50,
        totalProductionQty: 50,
        lotCount: 1,
        requestedEtd: "2026-12-01",
        targetEndDate: "2026-11-15",
        scheduledStartDate: "2026-11-01",
        scheduledEndDate: "2026-11-05",
        totalWorkingDays: 5,
        isDelayed: false,
        delayWorkingDays: 0,
        schedulingMode: "FORWARD",
        slips: [
          {
            lotNo: "SO-TEST-003-01",
            orderNo: "SO-TEST-003",
            type: "ORIGINAL",
            totalQty: 50,
            startDate: "2026-11-01",
            endDate: "2026-11-05",
            totalDays: 5,
            processes: [],
          },
        ],
        resultingLoads: [],
        capacityWarnings: [],
      });

      const preview = await service.previewRemakeSchedule({ salesOrderId: 1, remakeQty: 50 });

      expect(preview).toBeDefined();
      expect(preview.slips).toHaveLength(1);
      expect(preview.slips[0].lotNo).toBe("RM-2");
      expect(preview.slips[0].type).toBe("REMAKE");
    });

    it("createRemakeSchedule() appends remake slips without deleting existing slips", async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: "SO-TEST-004",
        itemCode: "10-12345-000",
        orderQty: 1000,
        allocatedQty: 0,
        requestedETD: new Date("2026-12-01"),
        status: "Production",
        item: {
          rejectionRate: 0,
          autoSplitQty: 500,
          itemRoutes: [],
        },
      });

      mockPrisma.productionSlip.count.mockResolvedValue(0); // 0 existing remake slips -> first is RM-1

      mockJavaService.scheduleProduction.mockResolvedValue({
        orderNo: "SO-TEST-004",
        salesOrderId: 1,
        productionId: "PROD-SO-TEST-004",
        netRequiredQty: 25,
        totalProductionQty: 25,
        lotCount: 1,
        scheduledStartDate: "2026-11-01",
        scheduledEndDate: "2026-11-05",
        totalWorkingDays: 5,
        isDelayed: false,
        delayWorkingDays: 0,
        schedulingMode: "FORWARD",
        slips: [
          {
            lotNo: "SO-TEST-004-01",
            orderNo: "SO-TEST-004",
            type: "ORIGINAL",
            totalQty: 25,
            startDate: "2026-11-01",
            endDate: "2026-11-05",
            totalDays: 5,
            processes: [
              {
                stepNo: 1,
                processId: 101,
                processName: "Wax Injection",
                itemCode: "10-12345-000",
                isFabrication: false,
                scheduledStartDate: "2026-11-01",
                scheduledEndDate: "2026-11-05",
                leadTime: 60,
                productionTime: 1,
                neededQty: 25,
                nextStepNos: [],
              },
            ],
          },
        ],
        resultingLoads: [],
        capacityWarnings: [],
      });

      mockPrisma.productionSlip.create.mockResolvedValue({
        id: 99,
        lotNo: "RM-1",
        type: "REMAKE",
        salesOrderId: 1,
      });

      mockPrisma.productionProcess.create.mockResolvedValue({
        id: 991,
        stepNo: 1,
        previousProcessId: null,
      });

      mockPrisma.salesOrder.update.mockResolvedValue({
        id: 1,
        orderNo: "SO-TEST-004",
      });

      const payload = await service.createRemakeSchedule({ salesOrderId: 1, remakeQty: 25 });

      expect(payload.userErrors).toHaveLength(0);
      expect(payload.slips).toHaveLength(1);
      // Ensure deleteMany was NOT called (existing slips are preserved)
      expect(mockPrisma.productionSlip.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.productionProcess.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.productionSlip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lotNo: "RM-1",
            type: "REMAKE",
            totalQty: 25,
          }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CREATE_REMAKE_SCHEDULE",
          tableName: "SalesOrder",
          recordId: "1",
        }),
      );
    });

    it("dispatches remake alert notification to workers and supervisors in affected sections", async () => {
      mockPrisma.salesOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: "SO-TEST-005",
        itemCode: "10-12345-000",
        orderQty: 1000,
        allocatedQty: 0,
        requestedETD: new Date("2026-12-01"),
        status: "Production",
        item: {
          rejectionRate: 0,
          autoSplitQty: 500,
          itemRoutes: [],
        },
      });

      mockPrisma.productionSlip.count.mockResolvedValue(0);

      mockJavaService.scheduleProduction.mockResolvedValue({
        orderNo: "SO-TEST-005",
        salesOrderId: 1,
        productionId: "PROD-SO-TEST-005",
        netRequiredQty: 10,
        totalProductionQty: 10,
        lotCount: 1,
        scheduledStartDate: "2026-11-01",
        scheduledEndDate: "2026-11-05",
        totalWorkingDays: 5,
        isDelayed: false,
        delayWorkingDays: 0,
        schedulingMode: "FORWARD",
        slips: [
          {
            lotNo: "RM-1",
            orderNo: "SO-TEST-005",
            type: "REMAKE",
            totalQty: 10,
            startDate: "2026-11-01",
            endDate: "2026-11-05",
            totalDays: 5,
            processes: [
              {
                stepNo: 1,
                processId: 101,
                processName: "Wax Injection",
                itemCode: "10-12345-000",
                isFabrication: false,
                scheduledStartDate: "2026-11-01",
                scheduledEndDate: "2026-11-05",
                leadTime: 60,
                productionTime: 1,
                neededQty: 10,
                nextStepNos: [],
              },
            ],
          },
        ],
        resultingLoads: [],
        capacityWarnings: [],
      });

      mockPrisma.productionSlip.create.mockResolvedValue({
        id: 100,
        lotNo: "RM-1",
        type: "REMAKE",
        salesOrderId: 1,
      });

      mockPrisma.productionProcess.create.mockResolvedValue({ id: 1001 });
      mockPrisma.salesOrder.update.mockResolvedValue({ id: 1, orderNo: "SO-TEST-005" });

      mockPrisma.process.findMany.mockResolvedValue([
        { id: 101, name: "Wax Injection", sectionId: 3 },
      ]);

      mockPrisma.section.findMany.mockResolvedValue([
        { id: 3, name: "Wax Pattern" },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: "worker-wax-01" },
        { id: "supervisor-wax-01" },
      ]);

      const payload = await service.createRemakeSchedule({ salesOrderId: 1, remakeQty: 10 });

      expect(payload.userErrors).toHaveLength(0);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: expect.arrayContaining(["worker-wax-01", "supervisor-wax-01"]),
          title: expect.stringContaining("Remake Alert: Order SO-TEST-005 (RM-1)"),
          message: expect.stringContaining("Affected sections: Wax Pattern"),
        }),
        undefined,
      );
    });
  });
});
