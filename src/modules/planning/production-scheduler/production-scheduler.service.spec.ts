import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductionSchedulerService } from "./production-scheduler.service.js";
import type { PrismaService } from "../../../prisma/prisma.service.js";
import type { JavaService } from "../../../java-service/java-service.service.js";
import type { AuditTrailService } from "../../../auth/services/audit-trail.service.js";

describe("ProductionSchedulerService", () => {
  let service: ProductionSchedulerService;
  let mockPrisma: any;
  let mockJavaService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockPrisma = {
      salesOrder: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      holiday: {
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

    service = new ProductionSchedulerService(
      mockPrisma as unknown as PrismaService,
      mockJavaService as unknown as JavaService,
      mockAuditService as unknown as AuditTrailService,
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
});
