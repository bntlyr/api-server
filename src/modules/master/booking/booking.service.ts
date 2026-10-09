import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateBookingInput,
  BookingFilterInput,
  PaginationInput,
  UpdateBookingInput,
  BookingConnection,
  BookingPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateBookingInput, validateUpdateBookingInput } from "./helpers/booking.helper.js";

import { BookingLoader } from "./booking.loader.js";

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingLoader: BookingLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.bookingLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: BookingFilterInput | null,
  ): Promise<BookingConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["bookingNo", "itemCode", "orderNo", "lotNo", "remarks", "createdById", "updatedById"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.booking.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.booking.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as BookingConnection;
    } catch (error) {
      return {
        edges: [],
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
        userErrors: [createError((error as Error).message)],
      } as unknown as BookingConnection;
    }
  }

  async create(input: CreateBookingInput, context?: any): Promise<BookingPayload> {
    const validationError = validateCreateBookingInput(input);
    if (validationError) {
      return {
        booking: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const booking = await this.prisma.booking.create({
        data: {
          bookingNo: input.bookingNo,
          ...(input.bookingDate ? { bookingDate: input.bookingDate } : {}),
          itemCode: input.itemCode,
          itemId: input.itemId,
          fabricationId: input.fabricationId ?? null,
          orderNo: input.orderNo,
          lotNo: input.lotNo,
          ...(input.passedQty ? { passedQty: input.passedQty } : {}),
          ...(input.rejectedQty ? { rejectedQty: input.rejectedQty } : {}),
          ...(input.reworkQty1 ? { reworkQty1: input.reworkQty1 } : {}),
          ...(input.reworkQty2 ? { reworkQty2: input.reworkQty2 } : {}),
          ...(input.reworkQty3 ? { reworkQty3: input.reworkQty3 } : {}),
          ...(input.totalInspectedQty ? { totalInspectedQty: input.totalInspectedQty } : {}),
          ...(input.actualParameters ? { actualParameters: typeof input.actualParameters === "string" ? JSON.parse(input.actualParameters) : input.actualParameters } : {}),
          remarks: input.remarks ?? null,
          productionSlipId: input.productionSlipId,
          productionProcessId: input.productionProcessId,
          salesOrderId: input.salesOrderId,
          createdById: input.createdById ?? null,
          updatedById: input.updatedById ?? null,
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        } as any,
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_BOOKING",
        method: "GRAPHQL_MUTATION",
        tableName: "Booking",
        recordId: String(booking.id),
        description: "Created Booking record",
        values: booking as any,
        ipAddress,
        userAgent,
      });

      return {
        booking: booking as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        booking: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateBookingInput,
    context?: any,
  ): Promise<BookingPayload> {
    const validationError = validateUpdateBookingInput(input);
    if (validationError) {
      return {
        booking: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const booking = await this.prisma.booking.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.bookingNo ? { bookingNo: input.bookingNo } : {}),
          ...(input.bookingDate ? { bookingDate: input.bookingDate } : {}),
          ...(input.itemCode ? { itemCode: input.itemCode } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.fabricationId !== undefined ? { fabricationId: input.fabricationId ?? null } : {}),
          ...(input.orderNo ? { orderNo: input.orderNo } : {}),
          ...(input.lotNo ? { lotNo: input.lotNo } : {}),
          ...(input.passedQty ? { passedQty: input.passedQty } : {}),
          ...(input.rejectedQty ? { rejectedQty: input.rejectedQty } : {}),
          ...(input.reworkQty1 ? { reworkQty1: input.reworkQty1 } : {}),
          ...(input.reworkQty2 ? { reworkQty2: input.reworkQty2 } : {}),
          ...(input.reworkQty3 ? { reworkQty3: input.reworkQty3 } : {}),
          ...(input.totalInspectedQty ? { totalInspectedQty: input.totalInspectedQty } : {}),
          ...(input.actualParameters !== undefined ? { actualParameters: input.actualParameters ? (typeof input.actualParameters === "string" ? JSON.parse(input.actualParameters) : input.actualParameters) : null } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.productionProcessId ? { productionProcessId: input.productionProcessId } : {}),
          ...(input.createdById !== undefined ? { createdById: input.createdById ?? null } : {}),
          ...(input.updatedById !== undefined ? { updatedById: input.updatedById ?? null } : {}),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        } as any,
      });

      this.bookingLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_BOOKING",
        method: "GRAPHQL_MUTATION",
        tableName: "Booking",
        recordId: String(parsedId),
        description: "Updated Booking record",
        values: booking as any,
        ipAddress,
        userAgent,
      });

      return {
        booking: booking as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        booking: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<BookingPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const booking = await this.prisma.booking.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.bookingLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_BOOKING",
        method: "GRAPHQL_MUTATION",
        tableName: "Booking",
        recordId: String(parsedId),
        description: "Deleted Booking record",
        ipAddress,
        userAgent,
      });

      return {
        booking: booking as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        booking: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<BookingPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const booking = await this.prisma.booking.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.bookingLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_BOOKING",
        method: "GRAPHQL_MUTATION",
        tableName: "Booking",
        recordId: String(parsedId),
        description: "Restored Booking record",
        ipAddress,
        userAgent,
      });

      return {
        booking: booking as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        booking: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async bookProcessWithDefects(
    input: any,
    context?: any,
  ): Promise<BookingPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const process = await this.prisma.productionProcess.findUnique({
        where: { id: input.productionProcessId },
        include: {
          productionSlip: {
            include: {
              salesOrder: true,
            },
          },
        },
      });

      if (!process || process.deleted) {
        return {
          booking: null,
          userErrors: [createError("Production process not found.", "productionProcessId")],
        };
      }

      if (process.status !== "Received" && process.status !== "In-Progress" && process.status !== "Pending") {
        return {
          booking: null,
          userErrors: [
            createError(
              `Cannot book process with status '${process.status}'. Must be 'Received' or 'In-Progress'.`,
              "productionProcessId",
            ),
          ],
        };
      }

      const passedQty = Number(input.passedQty ?? 0);
      const rejectedQty = Number(input.rejectedQty ?? 0);
      const reworkQty1 = Number(input.reworkQty1 ?? 0);
      const reworkQty2 = Number(input.reworkQty2 ?? 0);
      const reworkQty3 = Number(input.reworkQty3 ?? 0);
      const totalInspected = passedQty + rejectedQty + reworkQty1 + reworkQty2 + reworkQty3;
      const neededQty = Number(process.neededQty);

      if (totalInspected > neededQty) {
        return {
          booking: null,
          userErrors: [
            createError(
              `Total inspected quantity (${totalInspected}) exceeds needed quantity (${neededQty}).`,
              "passedQty",
            ),
          ],
        };
      }

      const order = process.productionSlip.salesOrder;
      const slip = process.productionSlip;
      const bookingNo = `BK-${Date.now()}-${slip.lotNo}`;

      // Helper function to sum numeric defect counts
      const sumDefects = (defectObj?: Record<string, any>): number => {
        if (!defectObj) return 0;
        return Object.entries(defectObj).reduce((acc, [key, val]) => {
          if (typeof val === "number" && key !== "id" && key !== "bookingId" && key !== "totalDefects") {
            return acc + val;
          }
          return acc;
        }, 0);
      };

      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create Booking Header
        const booking = await tx.booking.create({
          data: {
            bookingNo,
            bookingDate: new Date(),
            itemCode: slip.salesOrder.itemCode ?? process.itemCode ?? "",
            itemId: order.itemId ?? 0,
            fabricationId: order.fabricationId ?? null,
            orderNo: slip.orderNo,
            lotNo: slip.lotNo,
            passedQty,
            rejectedQty,
            reworkQty1,
            reworkQty2,
            reworkQty3,
            totalInspectedQty: totalInspected,
            actualParameters: input.actualParameters ? (typeof input.actualParameters === "string" ? JSON.parse(input.actualParameters) : input.actualParameters) : null,
            remarks: input.remarks ?? null,
            productionSlipId: slip.id,
            productionProcessId: process.id,
            salesOrderId: order.id,
            createdById: effectiveUserId,
          },
        });

        // 2. Create Section-Specific Defect Records if provided
        if (input.waxDefect) {
          const totalDefects = sumDefects(input.waxDefect);
          await tx.waxDefect.create({
            data: {
              ...input.waxDefect,
              bookingId: booking.id,
              productionSlipId: slip.id,
              salesOrderId: order.id,
              itemId: order.itemId ?? 0,
              itemCode: order.itemCode ?? "",
              totalDefects,
              createdBy: effectiveUserId,
            },
          });
        }

        if (input.coatingDefect) {
          const totalDefects = sumDefects(input.coatingDefect);
          await tx.coatingDefect.create({
            data: {
              ...input.coatingDefect,
              bookingId: booking.id,
              productionSlipId: slip.id,
              salesOrderId: order.id,
              itemId: order.itemId ?? 0,
              itemCode: order.itemCode ?? "",
              totalDefects,
              createdBy: effectiveUserId,
            },
          });
        }

        if (input.castingDefect) {
          const totalDefects = sumDefects(input.castingDefect);
          await tx.castingDefect.create({
            data: {
              ...input.castingDefect,
              bookingId: booking.id,
              productionSlipId: slip.id,
              salesOrderId: order.id,
              itemId: order.itemId ?? 0,
              itemCode: order.itemCode ?? "",
              totalDefects,
              createdBy: effectiveUserId,
            },
          });
        }

        if (input.prefinDefect) {
          const totalDefects = sumDefects(input.prefinDefect);
          await tx.prefinDefect.create({
            data: {
              ...input.prefinDefect,
              bookingId: booking.id,
              productionSlipId: slip.id,
              salesOrderId: order.id,
              itemId: order.itemId ?? 0,
              itemCode: order.itemCode ?? "",
              totalDefects,
              createdBy: effectiveUserId,
            },
          });
        }

        if (input.fabDefect) {
          const totalDefects = sumDefects(input.fabDefect);
          await tx.fabDefect.create({
            data: {
              ...input.fabDefect,
              bookingId: booking.id,
              productionSlipId: slip.id,
              salesOrderId: order.id,
              itemId: order.itemId ?? 0,
              itemCode: order.itemCode ?? "",
              totalDefects,
              createdBy: effectiveUserId,
            },
          });
        }

        if (input.mimDefect) {
          const totalDefects = sumDefects(input.mimDefect);
          await tx.mimDefect.create({
            data: {
              ...input.mimDefect,
              bookingId: booking.id,
              productionSlipId: slip.id,
              salesOrderId: order.id,
              itemId: order.itemId ?? 0,
              itemCode: order.itemCode ?? "",
              totalDefects,
              createdBy: effectiveUserId,
            },
          });
        }

        // 3. Atomically Update ProductionProcess
        const actualStartDate = process.actualStartDate ?? new Date();
        const actualEndDate = new Date();
        const prodTimeHours = Math.max(
          0.1,
          Math.round(((actualEndDate.getTime() - actualStartDate.getTime()) / 3600000) * 100) / 100,
        );

        await tx.productionProcess.update({
          where: { id: process.id },
          data: {
            status: "Completed",
            isCompleted: true,
            passedQty,
            rejectedQty,
            reworkQty1,
            reworkQty2,
            reworkQty3,
            remarks: input.remarks ?? process.remarks,
            actualStartDate,
            actualEndDate,
            productionTime: prodTimeHours,
            updatedBy: effectiveUserId,
          },
        });

        // 4. Handle Rework Lot Generation & Native Scheduling
        const reworkTotal = reworkQty1 + reworkQty2 + reworkQty3;
        if (reworkTotal > 0) {
          const parentLotNo = slip.lotNo.split("-R")[0];
          const existingReworkCount = await tx.productionSlip.count({
            where: {
              salesOrderId: order.id,
              lotNo: { startsWith: `${parentLotNo}-R` },
              type: "REWORK",
              deleted: false,
            },
          });

          const maxReworkLimit = process.isFabrication ? 4 : 3;
          if (existingReworkCount >= maxReworkLimit) {
            throw new Error(
              `Maximum rework limit reached (${maxReworkLimit} reworks for lot ${parentLotNo}). Defective pieces must be logged as scrap (rejectedQty).`,
            );
          }

          const reworkLotNo = `${parentLotNo}-R${existingReworkCount + 1}`;
          const today = new Date();

          // Create Rework ProductionSlip
          const reworkSlip = await tx.productionSlip.create({
            data: {
              salesOrderId: order.id,
              orderNo: slip.orderNo,
              lotNo: reworkLotNo,
              chargeNo: slip.chargeNo ?? null,
              type: "REWORK",
              status: "Pending",
              totalQty: reworkTotal,
              startDate: today,
              endDate: today,
              totalDays: 1,
              remarks: `Rework #${existingReworkCount + 1} generated from process [${process.processName}] (isFab: ${process.isFabrication}) on ${slip.lotNo}`,
              createdBy: effectiveUserId,
            },
          });

          // Step 1: The Rework Process
          const reworkStep1 = await tx.productionProcess.create({
            data: {
              productionSlipId: reworkSlip.id,
              stepNo: 1,
              processId: process.processId ?? null,
              processName: process.processName.startsWith("[REWORK]") ? process.processName : `[REWORK] ${process.processName}`,
              itemCode: process.itemCode ?? order.itemCode,
              isFabrication: process.isFabrication,
              isRework: true,
              status: "Pending",
              neededQty: reworkTotal,
              scheduledStartDate: today,
              scheduledEndDate: today,
              leadTime: process.leadTime,
              productionTime: process.productionTime,
              remarks: `Rework step for ${slip.lotNo}`,
              createdBy: effectiveUserId,
            },
          });

          // Fetch all downstream processes from parent slip
          const downstreamProcesses = await tx.productionProcess.findMany({
            where: {
              productionSlipId: slip.id,
              stepNo: { gt: process.stepNo },
              deleted: false,
            },
            orderBy: { stepNo: "asc" },
          });

          let prevProcessId = reworkStep1.id;
          let currentStepNo = 2;
          for (const downStep of downstreamProcesses) {
            const createdDownStep = await tx.productionProcess.create({
              data: {
                productionSlipId: reworkSlip.id,
                stepNo: currentStepNo++,
                processId: downStep.processId ?? null,
                processName: downStep.processName,
                itemCode: downStep.itemCode ?? order.itemCode,
                isFabrication: downStep.isFabrication,
                isRework: false,
                status: "Pending",
                neededQty: reworkTotal,
                scheduledStartDate: today,
                scheduledEndDate: today,
                leadTime: downStep.leadTime,
                productionTime: downStep.productionTime,
                previousProcessId: prevProcessId,
                createdBy: effectiveUserId,
              },
            });
            prevProcessId = createdDownStep.id;
          }
        }

        // 4. Audit Log
        await this.auditService.log({
          userId: effectiveUserId,
          action: "BOOK_PROCESS_WITH_DEFECTS",
          method: "GRAPHQL_MUTATION",
          tableName: "Booking",
          recordId: String(booking.id),
          description: `Booked process [${process.processName}] (Lot: ${slip.lotNo}) with ${passedQty} passed, ${rejectedQty} rejected. BookingNo: ${bookingNo}`,
          ipAddress,
          userAgent,
        });

        return booking;
      });

      return {
        booking: result as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        booking: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async checkRemakeEligibility(salesOrderId: number) {
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

    // Sum of original slips planned qty
    const originalSlips = order.productionSlips.filter((s) => s.type === "ORIGINAL");
    const totalOriginalScheduledQty = originalSlips.reduce((sum, s) => sum + Number(s.totalQty), 0);
    const scrapBufferQty = Math.max(0, totalOriginalScheduledQty - netDemand);

    // Sum of all cumulative rejects across all processes
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

    return {
      salesOrderId: order.id,
      orderNo: order.orderNo,
      orderQty,
      allocatedQty,
      netDemand,
      totalOriginalScheduledQty,
      scrapBufferQty,
      totalCumulativeRejects,
      isRemakeEligible,
      shortfallQty,
      suggestedRemakeQty,
    };
  }
}
