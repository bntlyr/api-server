import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { JavaService } from "../../../java-service/java-service.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import { createError } from "../../../graphql/common/error.helper.js";
import type {
  CreateProductionScheduleInput,
  CreateProductionSchedulePayload,
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
        productionSlip: {
          salesOrderId: { not: salesOrderId }, // exclude current order if re-scheduling
        },
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

    return {
      orderNo: order.orderNo,
      salesOrderId: order.id,
      itemCode: order.itemCode,
      orderQty: Number(order.orderQty) || 0,
      allocatedQty: Number(order.allocatedQty) || 0,
      rejectionRate: Number(order.item?.rejectionRate) || 0,
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
}
