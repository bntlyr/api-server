import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { JavaService } from "../../../java-service/java-service.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { NotificationService } from "../../../notification/notification.service.js";
import type {
  CreateProductionScheduleInput,
  CreateProductionSchedulePayload,
  CreateRemakeScheduleInput,
  ProductionSchedulePreview,
  ValidateProductionScheduleInput,
} from "../../../generated/graphql/types.js";
import type {
  DailyLoadDto,
  RouteStepDto,
  ScheduleRequest,
  ScheduleResponse,
} from "../../../java-service/interfaces/java-service.interface.js";

@Injectable()
export class ProductionSchedulerService {
  private readonly logger = new Logger(ProductionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly javaService: JavaService,
    private readonly auditService: AuditTrailService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Prepares the full schedule request from DB models to send to the Java microservice.
   */
  private async buildScheduleRequest(
    salesOrderId: number,
    options?: {
      startDateOverride?: Date | string | null;
      maxConcurrentLots?: number | null;
      includeSaturday?: boolean | null;
      maxWorkingHoursPerDay?: number | null;
      isRemake?: boolean;
      remakeQty?: number | null;
    },
  ): Promise<ScheduleRequest> {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        item: {
          include: {
            itemRoutes: {
              where: { deletedAt: null },
              include: {
                steps: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
        fabrication: {
          include: {
            fabRoutes: {
              where: { deletedAt: null },
              include: {
                steps: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Sales Order with ID ${salesOrderId} not found.`);
    }

    if (order.status === "Cancelled") {
      throw new Error(`Sales Order ${order.orderNo} is cancelled.`);
    }

    // 1. Holidays
    const holidays = await this.prisma.holiday.findMany({
      where: { deletedAt: null },
      select: { date: true },
    });
    const holidayStrings = holidays.map((h) => h.date.toISOString().slice(0, 10));

    // 2. Existing committed load from active production processes
    const activeProcesses = await this.prisma.productionProcess.findMany({
      where: {
        scheduledStartDate: { not: null },
        deleted: false,
        ...(options?.isRemake
          ? {}
          : {
              productionSlip: {
                salesOrderId: { not: salesOrderId }, // exclude current order if re-scheduling
              },
            }),
      },
      select: {
        processId: true,
        processName: true,
        scheduledStartDate: true,
        neededQty: true,
      },
    });

    const existingLoadsMap = new Map<string, DailyLoadDto>();
    for (const p of activeProcesses) {
      if (p.processId && p.scheduledStartDate) {
        const dateStr = p.scheduledStartDate.toISOString().slice(0, 10);
        const key = `${dateStr}_${p.processId}`;
        const existing = existingLoadsMap.get(key);
        const pcs = Number(p.neededQty) || 0;
        if (existing) {
          existing.scheduledPcs += pcs;
        } else {
          existingLoadsMap.set(key, {
            date: dateStr,
            processId: p.processId,
            processName: p.processName,
            scheduledPcs: pcs,
            scheduledWeight: 0,
          });
        }
      }
    }
    const existingLoads = Array.from(existingLoadsMap.values());

    // 3. Item route steps
    let itemRoutes: RouteStepDto[] = [];
    const defaultItemRoute = order.item?.itemRoutes?.[0];
    if (defaultItemRoute?.steps?.length) {
      itemRoutes = defaultItemRoute.steps
        .sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber))
        .map((s, idx) => ({
          stepNo: idx + 1,
          processId: s.processId ?? undefined,
          processName: s.name,
          leadTime: Number(s.leadTime) || 0,
          leadTimeUnit: s.leadTimeUnit,
          prepTime: Number(s.prepTime) || 0,
          prepTimeUnit: s.prepTimeUnit ?? undefined,
          cureTime: Number(s.cureTime) || 0,
          cureTimeUnit: s.cureTimeUnit ?? undefined,
          durationType: s.durationType,
          hasPacking: s.hasPacking,
          maxPcsPerDay: Number(s.maxPcsPerDay) || 0,
          maxWeightPerDay: Number(s.maxWeightPerDay) || 0,
          qtyPerTree: Number(s.qtyPerTree) || 0,
          qtyPerShot: Number(s.qtyPerShot) || 0,
        }));
    }

    // 4. Fab route steps
    let fabRoutes: RouteStepDto[] = [];
    const hasFabrication = Boolean(order.fabricationId && order.fabrication);
    if (hasFabrication) {
      const defaultFabRoute = order.fabrication?.fabRoutes?.[0];
      if (defaultFabRoute?.steps?.length) {
        fabRoutes = defaultFabRoute.steps
          .sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber))
          .map((s, idx) => ({
            stepNo: idx + 1,
            processId: s.processId ?? undefined,
            processName: s.name,
            leadTime: Number(s.leadTime) || 0,
            leadTimeUnit: s.leadTimeUnit,
            prepTime: Number(s.prepTime) || 0,
            prepTimeUnit: s.prepTimeUnit ?? undefined,
            cureTime: Number(s.cureTime) || 0,
            cureTimeUnit: s.cureTimeUnit ?? undefined,
            durationType: s.durationType,
            hasPacking: s.hasPacking,
            maxPcsPerDay: Number(s.maxPcsPerDay) || 0,
            maxWeightPerDay: Number(s.maxWeightPerDay) || 0,
            qtyPerTree: Number(s.qtyPerTree) || 0,
            qtyPerShot: Number(s.qtyPerShot) || 0,
          }));
      }
    }

    const startDateOverride = options?.startDateOverride
      ? typeof options.startDateOverride === "string"
        ? options.startDateOverride.slice(0, 10)
        : options.startDateOverride.toISOString().slice(0, 10)
      : undefined;

    const orderQty = options?.isRemake
      ? Number(options.remakeQty) || 0
      : Number(order.orderQty) || 0;
    const allocatedQty = options?.isRemake ? 0 : Number(order.allocatedQty) || 0;
    const rejectionRate = options?.isRemake ? 0 : Number(order.item?.rejectionRate) || 0;

    return {
      orderNo: order.orderNo,
      salesOrderId: order.id,
      itemCode: order.itemCode,
      orderQty,
      allocatedQty,
      rejectionRate,
      autoSplitQty: Number(order.item?.autoSplitQty) || 500,
      stdItemWt: Number(order.item?.stdItemWt) || 0,
      castingWt: Number(order.item?.castingWt) || 0,
      requestedEtd: order.requestedETD.toISOString().slice(0, 10),
      startDateOverride,
      maxConcurrentLots: options?.maxConcurrentLots ?? undefined,
      includeSaturday: options?.includeSaturday ?? true,
      maxWorkingHoursPerDay: options?.maxWorkingHoursPerDay ?? 14.0,
      holidays: holidayStrings,
      existingLoads,
      itemRoutes,
      hasFabrication,
      fabCode: order.fabrication?.code,
      fabRoutes,
    };
  }

  /**
   * Preview calculation without saving to database.
   */
  async preview(input: ValidateProductionScheduleInput): Promise<ProductionSchedulePreview> {
    const request = await this.buildScheduleRequest(input.salesOrderId, {
      startDateOverride: input.startDateOverride,
      maxConcurrentLots: input.maxConcurrentLots,
      includeSaturday: input.includeSaturday,
      maxWorkingHoursPerDay: input.maxWorkingHoursPerDay,
    });

    const response = await this.javaService.scheduleProduction(request);

    return {
      orderNo: response.orderNo,
      salesOrderId: response.salesOrderId,
      productionId: response.productionId,
      netRequiredQty: response.netRequiredQty,
      totalProductionQty: response.totalProductionQty,
      lotCount: response.lotCount,
      requestedETD: response.requestedEtd ? new Date(response.requestedEtd) : null,
      targetEndDate: response.targetEndDate ? new Date(response.targetEndDate) : null,
      scheduledStartDate: new Date(response.scheduledStartDate),
      scheduledEndDate: new Date(response.scheduledEndDate),
      totalWorkingDays: response.totalWorkingDays,
      isDelayed: response.isDelayed,
      delayWorkingDays: response.delayWorkingDays,
      schedulingMode: response.schedulingMode,
      slips: response.slips.map((slip) => ({
        lotNo: slip.lotNo,
        orderNo: slip.orderNo,
        type: slip.type,
        totalQty: slip.totalQty,
        startDate: new Date(slip.startDate),
        endDate: new Date(slip.endDate),
        totalDays: slip.totalDays,
        fabStartDate: slip.fabStartDate ? new Date(slip.fabStartDate) : null,
        fabEndDate: slip.fabEndDate ? new Date(slip.fabEndDate) : null,
        fabTotalDays: slip.fabTotalDays ?? null,
        processes: slip.processes.map((p) => ({
          stepNo: p.stepNo,
          processId: p.processId,
          processName: p.processName,
          itemCode: p.itemCode ?? null,
          isFabrication: p.isFabrication,
          scheduledStartDate: new Date(p.scheduledStartDate),
          scheduledEndDate: new Date(p.scheduledEndDate),
          leadTime: p.leadTime,
          productionTime: p.productionTime,
          neededQty: p.neededQty,
          previousStepNo: p.previousStepNo ?? null,
          nextStepNos: p.nextStepNos,
        })),
      })),
      resultingLoads: response.resultingLoads,
      capacityWarnings: response.capacityWarnings,
    };
  }

  /**
   * Generates and commits production schedule to database in an atomic transaction.
   */
  async createSchedule(
    input: CreateProductionScheduleInput,
    context?: any,
  ): Promise<CreateProductionSchedulePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const request = await this.buildScheduleRequest(input.salesOrderId, {
        startDateOverride: input.startDateOverride,
        maxConcurrentLots: input.maxConcurrentLots,
        includeSaturday: input.includeSaturday,
        maxWorkingHoursPerDay: input.maxWorkingHoursPerDay,
      });

      const response = await this.javaService.scheduleProduction(request);

      const result = await this.prisma.$transaction(async (tx) => {
        // Clean up any existing slips/processes for this sales order if re-scheduling
        const existingSlips = await tx.productionSlip.findMany({
          where: { salesOrderId: input.salesOrderId },
          select: { id: true },
        });

        if (existingSlips.length > 0) {
          const slipIds = existingSlips.map((s) => s.id);
          await tx.productionProcess.deleteMany({
            where: { productionSlipId: { in: slipIds } },
          });
          await tx.productionSlip.deleteMany({
            where: { salesOrderId: input.salesOrderId },
          });
        }

        // Insert new production slips and chained processes
        const createdSlips = [];
        for (const slipDto of response.slips) {
          const slip = await tx.productionSlip.create({
            data: {
              salesOrderId: input.salesOrderId,
              orderNo: slipDto.orderNo,
              lotNo: slipDto.lotNo,
              type: slipDto.type || "ORIGINAL",
              totalQty: slipDto.totalQty,
              startDate: new Date(slipDto.startDate),
              endDate: new Date(slipDto.endDate),
              totalDays: slipDto.totalDays,
              fabStartDate: slipDto.fabStartDate ? new Date(slipDto.fabStartDate) : null,
              fabEndDate: slipDto.fabEndDate ? new Date(slipDto.fabEndDate) : null,
              fabTotalDays: slipDto.fabTotalDays ?? null,
              status: "Pending",
              createdBy: userId ?? "SYSTEM",
            },
          });

          // Insert processes sequentially to link previousProcessId
          let previousProcessId: number | null = null;
          for (const procDto of slipDto.processes) {
            const createdProc: { id: number } = await tx.productionProcess.create({
              data: {
                productionSlipId: slip.id,
                stepNo: procDto.stepNo,
                processId: procDto.processId,
                processName: procDto.processName,
                itemCode: procDto.itemCode,
                isFabrication: procDto.isFabrication,
                scheduledStartDate: new Date(procDto.scheduledStartDate),
                scheduledEndDate: new Date(procDto.scheduledEndDate),
                leadTime: procDto.leadTime,
                productionTime: procDto.productionTime,
                neededQty: procDto.neededQty,
                previousProcessId,
                status: "Pending",
                createdBy: userId ?? "SYSTEM",
              },
            });
            previousProcessId = createdProc.id;
          }

          createdSlips.push(slip);
        }

        // Update SalesOrder master status
        const updatedOrder = await tx.salesOrder.update({
          where: { id: input.salesOrderId },
          data: {
            productionId: response.productionId,
            scheduledStartDate: new Date(response.scheduledStartDate),
            scheduledEndDate: new Date(response.scheduledEndDate),
            scheduledTotalDays: response.totalWorkingDays,
            productionPlanningStatus: "Planned",
            status: "Production",
            updatedBy: userId ?? "SYSTEM",
          },
        });

        // Log audit trail
        await this.auditService.log({
          userId: userId ?? "SYSTEM",
          action: "CREATE_PRODUCTION_SCHEDULE",
          method: "GRAPHQL_MUTATION",
          tableName: "SalesOrder",
          recordId: String(input.salesOrderId),
          description: `Scheduled production [${response.productionId}] for Order ${request.orderNo} with ${response.lotCount} lots`,
          values: {
            productionId: response.productionId,
            lots: response.lotCount,
            scheduledStartDate: response.scheduledStartDate,
            scheduledEndDate: response.scheduledEndDate,
            isDelayed: response.isDelayed,
          },
          ipAddress,
          userAgent,
        });

        return {
          order: updatedOrder,
          slips: createdSlips,
        };
      });

      return {
        salesOrder: result.order as any,
        slips: result.slips as any,
        productionId: response.productionId,
        scheduledStartDate: new Date(response.scheduledStartDate),
        scheduledEndDate: new Date(response.scheduledEndDate),
        scheduledTotalDays: response.totalWorkingDays,
        isDelayed: response.isDelayed,
        delayWorkingDays: response.delayWorkingDays,
        capacityWarnings: response.capacityWarnings,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error creating production schedule: ${(error as Error).message}`, (error as Error).stack);
      return {
        salesOrder: null,
        slips: [],
        productionId: null,
        scheduledStartDate: null,
        scheduledEndDate: null,
        scheduledTotalDays: null,
        isDelayed: null,
        delayWorkingDays: null,
        capacityWarnings: [],
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Calculates suggested remake quantity based on cumulative rejects exceeding planned scrap buffer.
   */
  async calculateRemakeQuantity(salesOrderId: number): Promise<number> {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        item: true,
        productionSlips: {
          where: { deleted: false },
          include: {
            processes: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Sales Order with ID ${salesOrderId} not found.`);
    }

    const orderQty = Number(order.orderQty);
    const allocatedQty = Number(order.allocatedQty ?? 0);
    const netDemand = Math.max(0, orderQty - allocatedQty);

    const originalSlips = order.productionSlips.filter((s) => s.type === "ORIGINAL");
    const totalOriginalScheduledQty = originalSlips.reduce((sum, s) => sum + Number(s.totalQty), 0);
    const scrapBufferQty = Math.max(0, totalOriginalScheduledQty - netDemand);

    let totalCumulativeRejects = 0;
    for (const slip of order.productionSlips) {
      for (const proc of slip.processes) {
        totalCumulativeRejects += Number(proc.rejectedQty ?? 0);
      }
    }

    const isRemakeEligible = totalCumulativeRejects > scrapBufferQty;
    const shortfallQty = Math.max(0, totalCumulativeRejects - scrapBufferQty);

    const scrapRate = Number(order.item?.rejectionRate ?? 0);
    const suggestedRemakeQty = isRemakeEligible
      ? Math.ceil(shortfallQty * (1 + scrapRate / 100))
      : 0;

    return suggestedRemakeQty;
  }

  /**
   * Preview remake production schedule without writing to database.
   */
  async previewRemakeSchedule(input: CreateRemakeScheduleInput): Promise<ProductionSchedulePreview> {
    const targetRemakeQty = input.remakeQty && input.remakeQty > 0
      ? input.remakeQty
      : await this.calculateRemakeQuantity(input.salesOrderId);

    if (targetRemakeQty <= 0) {
      throw new Error(
        `No remake quantity required for Sales Order (ID: ${input.salesOrderId}). Cumulative rejects do not exceed scrap buffer.`
      );
    }

    const request = await this.buildScheduleRequest(input.salesOrderId, {
      startDateOverride: input.startDateOverride,
      maxConcurrentLots: input.maxConcurrentLots,
      includeSaturday: input.includeSaturday,
      maxWorkingHoursPerDay: input.maxWorkingHoursPerDay,
      isRemake: true,
      remakeQty: targetRemakeQty,
    });

    const response = await this.javaService.scheduleProduction(request);

    const existingRemakeCount = await this.prisma.productionSlip.count({
      where: { salesOrderId: input.salesOrderId, type: "REMAKE", deleted: false },
    });

    return {
      orderNo: response.orderNo,
      salesOrderId: response.salesOrderId,
      productionId: response.productionId,
      netRequiredQty: response.netRequiredQty,
      totalProductionQty: response.totalProductionQty,
      lotCount: response.lotCount,
      requestedETD: response.requestedEtd ? new Date(response.requestedEtd) : null,
      targetEndDate: response.targetEndDate ? new Date(response.targetEndDate) : null,
      scheduledStartDate: new Date(response.scheduledStartDate),
      scheduledEndDate: new Date(response.scheduledEndDate),
      totalWorkingDays: response.totalWorkingDays,
      isDelayed: response.isDelayed,
      delayWorkingDays: response.delayWorkingDays,
      schedulingMode: response.schedulingMode,
      slips: response.slips.map((slip, idx) => {
        const remakeLotNum = existingRemakeCount + idx + 1;
        const remakeLotNo = `RM-${remakeLotNum}`;
        return {
          lotNo: remakeLotNo,
          orderNo: slip.orderNo,
          type: "REMAKE",
          totalQty: slip.totalQty,
          startDate: new Date(slip.startDate),
          endDate: new Date(slip.endDate),
          totalDays: slip.totalDays,
          fabStartDate: slip.fabStartDate ? new Date(slip.fabStartDate) : null,
          fabEndDate: slip.fabEndDate ? new Date(slip.fabEndDate) : null,
          fabTotalDays: slip.fabTotalDays ?? null,
          processes: slip.processes.map((p) => ({
            stepNo: p.stepNo,
            processId: p.processId,
            processName: p.processName,
            itemCode: p.itemCode ?? null,
            isFabrication: p.isFabrication,
            scheduledStartDate: new Date(p.scheduledStartDate),
            scheduledEndDate: new Date(p.scheduledEndDate),
            leadTime: p.leadTime,
            productionTime: p.productionTime,
            neededQty: p.neededQty,
            previousStepNo: p.previousStepNo ?? null,
            nextStepNos: p.nextStepNos,
          })),
        };
      }),
      resultingLoads: response.resultingLoads,
      capacityWarnings: response.capacityWarnings,
    };
  }

  /**
   * Generates and commits a remake production schedule to database, preserving existing slips.
   */
  async createRemakeSchedule(
    input: CreateRemakeScheduleInput,
    context?: any,
  ): Promise<CreateProductionSchedulePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const targetRemakeQty = input.remakeQty && input.remakeQty > 0
        ? input.remakeQty
        : await this.calculateRemakeQuantity(input.salesOrderId);

      if (targetRemakeQty <= 0) {
        throw new Error(
          `No remake quantity required for Sales Order (ID: ${input.salesOrderId}). Cumulative rejects do not exceed scrap buffer.`
        );
      }

      const request = await this.buildScheduleRequest(input.salesOrderId, {
        startDateOverride: input.startDateOverride,
        maxConcurrentLots: input.maxConcurrentLots,
        includeSaturday: input.includeSaturday,
        maxWorkingHoursPerDay: input.maxWorkingHoursPerDay,
        isRemake: true,
        remakeQty: targetRemakeQty,
      });

      const response = await this.javaService.scheduleProduction(request);

      const result = await this.prisma.$transaction(async (tx) => {
        const existingRemakeCount = await tx.productionSlip.count({
          where: { salesOrderId: input.salesOrderId, type: "REMAKE", deleted: false },
        });

        const createdSlips = [];
        for (let idx = 0; idx < response.slips.length; idx++) {
          const slipDto = response.slips[idx];
          const remakeLotNum = existingRemakeCount + idx + 1;
          const remakeLotNo = `RM-${remakeLotNum}`;

          const slip = await tx.productionSlip.create({
            data: {
              salesOrderId: input.salesOrderId,
              orderNo: slipDto.orderNo,
              lotNo: remakeLotNo,
              type: "REMAKE",
              totalQty: slipDto.totalQty,
              startDate: new Date(slipDto.startDate),
              endDate: new Date(slipDto.endDate),
              totalDays: slipDto.totalDays,
              fabStartDate: slipDto.fabStartDate ? new Date(slipDto.fabStartDate) : null,
              fabEndDate: slipDto.fabEndDate ? new Date(slipDto.fabEndDate) : null,
              fabTotalDays: slipDto.fabTotalDays ?? null,
              status: "Pending",
              createdBy: userId ?? "SYSTEM",
            },
          });

          let previousProcessId: number | null = null;
          for (const procDto of slipDto.processes) {
            const createdProc: { id: number } = await tx.productionProcess.create({
              data: {
                productionSlipId: slip.id,
                stepNo: procDto.stepNo,
                processId: procDto.processId,
                processName: procDto.processName,
                itemCode: procDto.itemCode,
                isFabrication: procDto.isFabrication,
                scheduledStartDate: new Date(procDto.scheduledStartDate),
                scheduledEndDate: new Date(procDto.scheduledEndDate),
                leadTime: procDto.leadTime,
                productionTime: procDto.productionTime,
                neededQty: procDto.neededQty,
                previousProcessId,
                status: "Pending",
                createdBy: userId ?? "SYSTEM",
              },
            });
            previousProcessId = createdProc.id;
          }

          createdSlips.push(slip);
        }

        const updatedOrder = await tx.salesOrder.update({
          where: { id: input.salesOrderId },
          data: {
            updatedBy: userId ?? "SYSTEM",
          },
        });

        await this.auditService.log({
          userId: userId ?? "SYSTEM",
          action: "CREATE_REMAKE_SCHEDULE",
          method: "GRAPHQL_MUTATION",
          tableName: "SalesOrder",
          recordId: String(input.salesOrderId),
          description: `Created remake schedule for Order ${request.orderNo} with ${createdSlips.length} remake lots (${targetRemakeQty} pcs)`,
          values: {
            salesOrderId: input.salesOrderId,
            remakeQty: targetRemakeQty,
            remakeLots: createdSlips.map((s) => s.lotNo),
            scheduledStartDate: response.scheduledStartDate,
            scheduledEndDate: response.scheduledEndDate,
          },
          ipAddress,
          userAgent,
        });

        return {
          order: updatedOrder,
          slips: createdSlips,
        };
      });

      // Dispatch Remake Alert to workers and supervisors in affected sections
      try {
        const processIds = [
          ...new Set(
            response.slips
              .flatMap((s) => s.processes)
              .map((p) => p.processId)
              .filter((id): id is number => typeof id === "number" && !Number.isNaN(id)),
          ),
        ];

        const processes = await this.prisma.process.findMany({
          where: { id: { in: processIds }, deleted: false },
          select: { id: true, name: true, sectionId: true },
        });

        const sectionIds = [
          ...new Set(
            processes
              .map((p) => p.sectionId)
              .filter((id): id is number => typeof id === "number" && !Number.isNaN(id)),
          ),
        ];

        const sections = sectionIds.length > 0
          ? await this.prisma.section.findMany({
              where: { id: { in: sectionIds }, deletedAt: null },
              select: { id: true, name: true },
            })
          : [];

        const sectionNames = sections.map((s) => s.name);

        const targetUsers = await this.prisma.user.findMany({
          where: {
            deletedAt: null,
            OR: [
              { sectionId: { in: sectionIds } },
              { superAdmin: true },
            ],
          },
          select: { id: true },
        });

        if (targetUsers.length > 0) {
          const remakeLotNos = result.slips.map((s: any) => s.lotNo).join(", ");
          const affectedSectionsStr = sectionNames.length > 0 ? ` Affected sections: ${sectionNames.join(", ")}.` : "";

          await this.notificationService.send(
            {
              userIds: targetUsers.map((u) => u.id),
              title: `Remake Alert: Order ${request.orderNo} (${remakeLotNos})`,
              message: `${targetRemakeQty} pcs remake lot(s) [${remakeLotNos}] scheduled for Order ${request.orderNo}.${affectedSectionsStr}`,
              metadata: {
                type: "REMAKE_ALERT",
                salesOrderId: input.salesOrderId,
                orderNo: request.orderNo,
                remakeLots: result.slips.map((s: any) => s.lotNo),
                remakeQty: targetRemakeQty,
                sectionIds,
              },
            },
            context,
          );
        }
      } catch (notifyErr) {
        this.logger.warn(`Failed to send remake alert notification: ${(notifyErr as Error).message}`);
      }

      return {
        salesOrder: result.order as any,
        slips: result.slips as any,
        productionId: response.productionId,
        scheduledStartDate: new Date(response.scheduledStartDate),
        scheduledEndDate: new Date(response.scheduledEndDate),
        scheduledTotalDays: response.totalWorkingDays,
        isDelayed: response.isDelayed,
        delayWorkingDays: response.delayWorkingDays,
        capacityWarnings: response.capacityWarnings,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error creating remake schedule: ${(error as Error).message}`, (error as Error).stack);
      return {
        salesOrder: null,
        slips: [],
        productionId: null,
        scheduledStartDate: null,
        scheduledEndDate: null,
        scheduledTotalDays: null,
        isDelayed: null,
        delayWorkingDays: null,
        capacityWarnings: [],
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
