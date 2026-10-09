import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { NotificationService } from "../../../notification/notification.service.js";
import type {
  ActiveWorkerDtrInfo,
  AssignProductionBoxInput,
  AssignProductionBoxPayload,
  BookProductionProcessInput,
  NotifyLeftRunningDtrsPayload,
  ProductionDtrPayload,
  ProductionProcessPayload,
  ReceiveProductionProcessInput,
  StartProductionDtrInput,
  StopProductionDtrInput,
  TransferProductionProcessInput,
} from "../../../generated/graphql/types.js";

@Injectable()
export class ProductionExecutionService {
  private readonly logger = new Logger(ProductionExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditTrailService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 1. IN: Receive Process
   * Acknowledges physical handover of parts at current station.
   * Sets status to 'Received'. Requires previous process to be 'Transferred'.
   */
  async receive(
    input: ReceiveProductionProcessInput,
    context?: any,
  ): Promise<ProductionProcessPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const process = await this.prisma.productionProcess.findUnique({
        where: { id: input.processId },
        include: {
          previousProcess: true,
          productionSlip: true,
        },
      });

      if (!process || process.deleted) {
        return {
          productionProcess: null,
          userErrors: [createError("Production process not found.", "processId")],
        };
      }

      if (process.status === "Cancelled") {
        return {
          productionProcess: null,
          userErrors: [createError("Cannot receive a cancelled process.", "processId")],
        };
      }

      if (process.status === "Transferred" || process.status === "Completed") {
        return {
          productionProcess: null,
          userErrors: [
            createError(`Process is already ${process.status}. Cannot receive again.`, "processId"),
          ],
        };
      }

      // Check Previous Process Invariant
      if (process.previousProcessId && process.previousProcess) {
        if (process.previousProcess.status !== "Transferred") {
          return {
            productionProcess: null,
            userErrors: [
              createError(
                `Previous process [${process.previousProcess.processName}] is currently '${process.previousProcess.status}'. It must be 'Transferred' (OUT) before receiving this process.`,
                "processId",
              ),
            ],
          };
        }
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const proc = await tx.productionProcess.update({
          where: { id: input.processId },
          data: {
            status: "Received",
            isReceived: true,
            receivedAt: new Date(),
            receivedById: userId ?? "SYSTEM",
            updatedBy: userId ?? "SYSTEM",
          },
        });

        if (process.productionSlip.status === "Pending") {
          await tx.productionSlip.update({
            where: { id: process.productionSlipId },
            data: {
              status: "In Progress",
              updatedBy: userId ?? "SYSTEM",
            },
          });
        }

        await this.auditService.log({
          userId: userId ?? "SYSTEM",
          action: "RECEIVE_PRODUCTION_PROCESS",
          method: "GRAPHQL_MUTATION",
          tableName: "ProductionProcess",
          recordId: String(proc.id),
          description: `Received parts for process [${proc.processName}] (Lot: ${process.productionSlip.lotNo})`,
          ipAddress,
          userAgent,
        });

        return proc;
      });

      return {
        productionProcess: updated as any,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error in receive: ${(error as Error).message}`);
      return {
        productionProcess: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * 2. DTR Start: Start Worker Job Card Session
   * Creates append-only ProductionDtr record with status 'Started'.
   * Transitions process status to 'In-Progress'.
   */
  async startDtr(input: StartProductionDtrInput, context?: any): Promise<ProductionDtrPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const process = await this.prisma.productionProcess.findUnique({
        where: { id: input.processId },
        include: { productionSlip: true },
      });

      if (!process || process.deleted) {
        return {
          productionDtr: null,
          userErrors: [createError("Production process not found.", "processId")],
        };
      }

      if (process.status === "Transferred" || process.status === "Cancelled") {
        return {
          productionDtr: null,
          userErrors: [
            createError(
              `Cannot start DTR on a process with status '${process.status}'.`,
              "processId",
            ),
          ],
        };
      }

      // Check if user already has an active DTR on this process
      const existingActiveDtr = await this.prisma.productionDtr.findFirst({
        where: {
          productionProcessId: input.processId,
          userId: effectiveUserId,
          status: "Started",
          deleted: false,
        },
      });

      if (existingActiveDtr) {
        return {
          productionDtr: null,
          userErrors: [
            createError(
              `Worker [${effectiveUserId}] already has an active DTR started on process [${process.processName}]. Please stop the previous DTR first.`,
              "processId",
            ),
          ],
        };
      }

      const createdDtr = await this.prisma.$transaction(async (tx) => {
        const dtr = await tx.productionDtr.create({
          data: {
            userId: effectiveUserId,
            productionProcessId: process.id,
            productionSlipId: process.productionSlipId,
            currentProcessName: process.processName,
            status: "Started",
            startTime: new Date(),
            remarks: input.remarks ?? null,
            createdBy: effectiveUserId,
          },
        });

        // Transition process status to 'In-Progress' if currently 'Received'
        if (process.status === "Received") {
          await tx.productionProcess.update({
            where: { id: process.id },
            data: {
              status: "In-Progress",
              actualStartDate: process.actualStartDate ?? new Date(),
              updatedBy: effectiveUserId,
            },
          });
        }

        await this.auditService.log({
          userId: effectiveUserId,
          action: "START_PRODUCTION_DTR",
          method: "GRAPHQL_MUTATION",
          tableName: "ProductionDtr",
          recordId: String(dtr.id),
          description: `Worker ${effectiveUserId} started DTR session on [${process.processName}] (Lot: ${process.productionSlip.lotNo})`,
          ipAddress,
          userAgent,
        });

        return dtr;
      });

      return {
        productionDtr: createdDtr as any,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error in startDtr: ${(error as Error).message}`);
      return {
        productionDtr: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * 2. DTR Stop: Stop Worker Job Card Session
   * Closes DTR, records output quantities, and enforces cumulative capacity limit.
   */
  async stopDtr(input: StopProductionDtrInput, context?: any): Promise<ProductionDtrPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const dtr = await this.prisma.productionDtr.findUnique({
        where: { id: input.dtrId },
        include: {
          productionProcess: true,
        },
      });

      if (!dtr || dtr.deleted) {
        return {
          productionDtr: null,
          userErrors: [createError("DTR record not found.", "dtrId")],
        };
      }

      if (dtr.status !== "Started") {
        return {
          productionDtr: null,
          userErrors: [
            createError(`DTR is already in status '${dtr.status}'. Cannot stop again.`, "dtrId"),
          ],
        };
      }

      // Check Cumulative Capacity Invariant (No Over-Logging)
      const otherDtrs = await this.prisma.productionDtr.findMany({
        where: {
          productionProcessId: dtr.productionProcessId,
          id: { not: dtr.id },
          deleted: false,
          status: "Stopped",
        },
        select: { passedQty: true, rejectedQty: true, reworkQty: true },
      });

      const loggedSoFar = otherDtrs.reduce(
        (acc, cur) => acc + Number(cur.passedQty) + Number(cur.rejectedQty) + Number(cur.reworkQty),
        0,
      );

      const incomingTotal = input.passedQty + input.rejectedQty + (input.reworkQty ?? 0);
      const neededQty = Number(dtr.productionProcess.neededQty);

      if (loggedSoFar + incomingTotal > neededQty) {
        return {
          productionDtr: null,
          userErrors: [
            createError(
              `Total quantity logged (${loggedSoFar + incomingTotal} pcs) exceeds process needed quantity (${neededQty} pcs).`,
              "passedQty",
            ),
          ],
        };
      }

      const updatedDtr = await this.prisma.$transaction(async (tx) => {
        const endTime = new Date();
        const durationMinutes = Math.max(
          1,
          Math.round((endTime.getTime() - dtr.startTime.getTime()) / 60000),
        );

        const stopped = await tx.productionDtr.update({
          where: { id: input.dtrId },
          data: {
            status: "Stopped",
            endTime,
            durationMinutes,
            passedQty: input.passedQty,
            rejectedQty: input.rejectedQty,
            reworkQty: input.reworkQty ?? 0,
            remarks: input.remarks ?? dtr.remarks,
            updatedBy: effectiveUserId,
          },
        });

        // Update aggregated DTR tallies on ProductionProcess
        await tx.productionProcess.update({
          where: { id: dtr.productionProcessId },
          data: {
            passedQty: { increment: input.passedQty },
            rejectedQty: { increment: input.rejectedQty },
            reworkQty1: { increment: input.reworkQty ?? 0 },
            updatedBy: effectiveUserId,
          },
        });

        await this.auditService.log({
          userId: effectiveUserId,
          action: "STOP_PRODUCTION_DTR",
          method: "GRAPHQL_MUTATION",
          tableName: "ProductionDtr",
          recordId: String(stopped.id),
          description: `Worker ${effectiveUserId} stopped DTR on [${dtr.currentProcessName}]. Output: Passed ${input.passedQty}, Rejected ${input.rejectedQty}`,
          ipAddress,
          userAgent,
        });

        return stopped;
      });

      return {
        productionDtr: updatedDtr as any,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error in stopDtr: ${(error as Error).message}`);
      return {
        productionDtr: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * 3. BOOK: QA Booking & Tally
   * Finalizes inspected quantities and transitions process status to 'Completed'.
   */
  async book(input: BookProductionProcessInput, context?: any): Promise<ProductionProcessPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const process = await this.prisma.productionProcess.findUnique({
        where: { id: input.processId },
        include: { productionSlip: true },
      });

      if (!process || process.deleted) {
        return {
          productionProcess: null,
          userErrors: [createError("Production process not found.", "processId")],
        };
      }

      if (process.status === "Transferred" || process.status === "Cancelled") {
        return {
          productionProcess: null,
          userErrors: [
            createError(`Cannot book process with status '${process.status}'.`, "processId"),
          ],
        };
      }

      const totalBooked =
        input.passedQty +
        input.rejectedQty +
        (input.reworkQty1 ?? 0) +
        (input.reworkQty2 ?? 0) +
        (input.reworkQty3 ?? 0);

      const neededQty = Number(process.neededQty);
      if (totalBooked > neededQty) {
        return {
          productionProcess: null,
          userErrors: [
            createError(
              `Total booked quantity (${totalBooked}) exceeds needed quantity (${neededQty}).`,
              "passedQty",
            ),
          ],
        };
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const actualStartDate = process.actualStartDate ?? new Date();
        const actualEndDate = new Date();
        const prodTimeHours = Math.max(
          0.1,
          Math.round(((actualEndDate.getTime() - actualStartDate.getTime()) / 3600000) * 100) / 100,
        );

        const proc = await tx.productionProcess.update({
          where: { id: input.processId },
          data: {
            status: "Completed",
            isCompleted: true,
            passedQty: input.passedQty,
            rejectedQty: input.rejectedQty,
            reworkQty1: input.reworkQty1 ?? 0,
            reworkQty2: input.reworkQty2 ?? 0,
            reworkQty3: input.reworkQty3 ?? 0,
            remarks: input.remarks ?? process.remarks,
            actualStartDate,
            actualEndDate,
            productionTime: prodTimeHours,
            updatedBy: effectiveUserId,
          },
        });

        await this.auditService.log({
          userId: effectiveUserId,
          action: "BOOK_PRODUCTION_PROCESS",
          method: "GRAPHQL_MUTATION",
          tableName: "ProductionProcess",
          recordId: String(proc.id),
          description: `Booked process [${proc.processName}] with ${input.passedQty} passed, ${input.rejectedQty} rejected`,
          ipAddress,
          userAgent,
        });

        return proc;
      });

      return {
        productionProcess: updated as any,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error in book: ${(error as Error).message}`);
      return {
        productionProcess: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * 4. OUT: Transfer & Dispatch to Next Process
   * Sets current process to 'Transferred' (Terminal status).
   * Propagates reject shrinkage to next process: next.neededQty = curr.passedQty.
   */
  async transfer(
    input: TransferProductionProcessInput,
    context?: any,
  ): Promise<ProductionProcessPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const process = await this.prisma.productionProcess.findUnique({
        where: { id: input.processId },
        include: {
          productionSlip: {
            include: {
              salesOrder: true,
              processes: {
                where: { deleted: false },
                orderBy: { stepNo: "asc" },
              },
            },
          },
        },
      });

      if (!process || process.deleted) {
        return {
          productionProcess: null,
          userErrors: [createError("Production process not found.", "processId")],
        };
      }

      if (process.status !== "Completed") {
        return {
          productionProcess: null,
          userErrors: [
            createError(
              `Process must be in 'Completed' status before it can be Transferred (OUT). Current status: '${process.status}'.`,
              "processId",
            ),
          ],
        };
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        // 1. Mark current process as 'Transferred' (terminal status)
        const proc = await tx.productionProcess.update({
          where: { id: input.processId },
          data: {
            status: "Transferred",
            updatedBy: effectiveUserId,
          },
        });

        // 2. Find downstream next process in the sequence
        const allProcs = process.productionSlip.processes;
        const currentIdx = allProcs.findIndex((p) => p.id === process.id);
        const nextProc = currentIdx !== -1 && currentIdx < allProcs.length - 1 ? allProcs[currentIdx + 1] : null;

        if (nextProc) {
          // Reject shrinkage: next needed quantity is current process passed quantity
          await tx.productionProcess.update({
            where: { id: nextProc.id },
            data: {
              neededQty: process.passedQty,
              updatedBy: effectiveUserId,
            },
          });
        } else {
          // Final process completed for this slip (e.g., Packing OUT)
          await tx.productionSlip.update({
            where: { id: process.productionSlipId },
            data: {
              status: "Completed",
              endDate: new Date(),
              updatedBy: effectiveUserId,
            },
          });

          // Check if any BoxContainerItems exist for this slip
          const containerItems = await tx.boxContainerItem.findMany({
            where: { productionSlipId: process.productionSlipId, deleted: false },
            include: { boxContainer: true },
          });

          let packedIncrement = Number(process.passedQty);

          if (containerItems.length > 0) {
            packedIncrement = 0;
            for (const cItem of containerItems) {
              const qty = Number(cItem.quantity);
              packedIncrement += qty;

              const fgLot = await tx.finishedGoodsLot.upsert({
                where: {
                  itemId_fabricationId_orderNo_lotNo_chargeNo_areaId_locationId_boxId: {
                    itemId: cItem.itemId,
                    fabricationId: cItem.fabricationId ?? 0,
                    orderNo: cItem.orderNo,
                    lotNo: cItem.lotNo,
                    chargeNo: cItem.chargeNo ?? "",
                    areaId: cItem.boxContainer.areaId,
                    locationId: cItem.boxContainer.locationId,
                    boxId: cItem.boxContainer.boxTypeId,
                  },
                },
                create: {
                  itemId: cItem.itemId,
                  fabricationId: cItem.fabricationId ?? 0,
                  orderNo: cItem.orderNo,
                  lotNo: cItem.lotNo,
                  chargeNo: cItem.chargeNo ?? "",
                  areaId: cItem.boxContainer.areaId,
                  locationId: cItem.boxContainer.locationId,
                  boxId: cItem.boxContainer.boxTypeId,
                  availableQty: qty,
                  allocatedQty: 0,
                  defectiveQty: 0,
                  checkingQty: 0,
                  createdBy: effectiveUserId,
                },
                update: {
                  availableQty: { increment: qty },
                  updatedBy: effectiveUserId,
                },
              });

              await tx.finishedGoodsTransaction.create({
                data: {
                  transactionNo: `TX-FG-PROD-${Date.now()}-${cItem.lotNo}-${cItem.id}`,
                  transactionType: "PRODUCTION",
                  direction: "INBOUND",
                  itemId: cItem.itemId,
                  fabricationId: cItem.fabricationId ?? 0,
                  finishedGoodsLotId: fgLot.id,
                  orderNo: cItem.orderNo,
                  lotNo: cItem.lotNo,
                  chargeNo: cItem.chargeNo ?? "",
                  quantity: qty,
                  balanceAfter: fgLot.availableQty,
                  toStatus: "AVAILABLE",
                  toAreaId: cItem.boxContainer.areaId,
                  toLocationId: cItem.boxContainer.locationId,
                  toBoxId: cItem.boxContainer.boxTypeId,
                  referenceNo: cItem.boxContainer.boxNo,
                  invoiceNo: cItem.lotNo,
                  createdBy: effectiveUserId,
                },
              });
            }
          }

          // Check if all slips for this SalesOrder are completed
          const unfinishedSlips = await tx.productionSlip.count({
            where: {
              salesOrderId: process.productionSlip.salesOrderId,
              status: { not: "Completed" },
              deleted: false,
            },
          });

          const salesOrderUpdateData: any = {
            producedQty: { increment: process.passedQty },
            packedQty: { increment: packedIncrement },
            updatedBy: effectiveUserId,
          };

          if (unfinishedSlips === 0) {
            salesOrderUpdateData.productionStatus = "Completed";
            salesOrderUpdateData.status = "Shipping";
            salesOrderUpdateData.shippingStatus = "For-Shipment";
          }

          // Increment SalesOrder producedQty/packedQty and update status if complete
          await tx.salesOrder.update({
            where: { id: process.productionSlip.salesOrderId },
            data: salesOrderUpdateData,
          });
        }

        await this.auditService.log({
          userId: effectiveUserId,
          action: "TRANSFER_PRODUCTION_PROCESS",
          method: "GRAPHQL_MUTATION",
          tableName: "ProductionProcess",
          recordId: String(proc.id),
          description: `Transferred (OUT) process [${proc.processName}] (Lot: ${process.productionSlip.lotNo}). Passed Qty: ${proc.passedQty}`,
          ipAddress,
          userAgent,
        });

        return proc;
      });

      return {
        productionProcess: updated as any,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error in transfer: ${(error as Error).message}`);
      return {
        productionProcess: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * 5. ASSIGN BOX: Packaging, Container Allocation & Warehouse Stock Handover
   */
  async assignBox(
    input: AssignProductionBoxInput,
    context?: any,
  ): Promise<AssignProductionBoxPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const process = await this.prisma.productionProcess.findUnique({
        where: { id: input.processId },
        include: {
          productionSlip: {
            include: { salesOrder: true },
          },
        },
      });

      if (!process || process.deleted) {
        return {
          productionProcess: null,
          productionSlip: null,
          finishedGoodsLot: null,
          userErrors: [createError("Production process not found.", "processId")],
        };
      }

      if (input.boxStatus === "CLOSED") {
        if (!input.areaId || !input.locationId) {
          return {
            productionProcess: null,
            productionSlip: null,
            finishedGoodsLot: null,
            userErrors: [
              createError(
                "areaId and locationId are required when closing and allocating a box to stock.",
                "areaId",
              ),
            ],
          };
        }

        const result = await this.prisma.$transaction(async (tx) => {
          const order = process.productionSlip.salesOrder;
          const passedQty = process.passedQty;

          // Upsert FinishedGoodsLot physical stock
          const fgLot = await tx.finishedGoodsLot.upsert({
            where: {
              itemId_fabricationId_orderNo_lotNo_chargeNo_areaId_locationId_boxId: {
                itemId: order.itemId ?? 0,
                fabricationId: order.fabricationId ?? 0,
                orderNo: process.productionSlip.orderNo,
                lotNo: process.productionSlip.lotNo,
                chargeNo: process.productionSlip.chargeNo ?? "",
                areaId: input.areaId!,
                locationId: input.locationId!,
                boxId: input.boxId,
              },
            },
            create: {
              itemId: order.itemId ?? 0,
              fabricationId: order.fabricationId ?? 0,
              orderNo: process.productionSlip.orderNo,
              lotNo: process.productionSlip.lotNo,
              chargeNo: process.productionSlip.chargeNo ?? "",
              areaId: input.areaId!,
              locationId: input.locationId!,
              boxId: input.boxId,
              availableQty: passedQty,
              allocatedQty: 0,
              defectiveQty: 0,
              checkingQty: 0,
              createdBy: effectiveUserId,
            },
            update: {
              availableQty: { increment: passedQty },
              updatedBy: effectiveUserId,
            },
          });

          // Log immutable ledger transaction
          await tx.finishedGoodsTransaction.create({
            data: {
              transactionNo: `TX-FG-PROD-${Date.now()}-${process.productionSlip.lotNo}`,
              transactionType: "PRODUCTION",
              direction: "INBOUND",
              itemId: order.itemId ?? 0,
              fabricationId: order.fabricationId ?? 0,
              finishedGoodsLotId: fgLot.id,
              orderNo: process.productionSlip.orderNo,
              lotNo: process.productionSlip.lotNo,
              chargeNo: process.productionSlip.chargeNo ?? "",
              quantity: passedQty,
              balanceAfter: fgLot.availableQty,
              toStatus: "AVAILABLE",
              toAreaId: input.areaId!,
              toLocationId: input.locationId!,
              toBoxId: input.boxId,
              referenceNo: process.productionSlip.orderNo,
              invoiceNo: process.productionSlip.lotNo,
              createdBy: effectiveUserId,
            },
          });

          // Increment SalesOrder packedQty
          await tx.salesOrder.update({
            where: { id: order.id },
            data: {
              packedQty: { increment: passedQty },
              updatedBy: effectiveUserId,
            },
          });

          // Update process and slip
          const updatedProc = await tx.productionProcess.update({
            where: { id: process.id },
            data: {
              boxId: input.boxId,
              boxStatus: "CLOSED",
              updatedBy: effectiveUserId,
            },
          });

          const updatedSlip = await tx.productionSlip.update({
            where: { id: process.productionSlipId },
            data: {
              boxId: input.boxId,
              boxStatus: "CLOSED",
              updatedBy: effectiveUserId,
            },
          });

          await this.auditService.log({
            userId: effectiveUserId,
            action: "ASSIGN_CLOSED_BOX",
            method: "GRAPHQL_MUTATION",
            tableName: "ProductionProcess",
            recordId: String(process.id),
            description: `Assigned CLOSED box [${input.boxId}] with ${passedQty} pcs to Area ${input.areaId}`,
            ipAddress,
            userAgent,
          });

          return {
            proc: updatedProc,
            slip: updatedSlip,
            fgLot,
          };
        });

        return {
          productionProcess: result.proc as any,
          productionSlip: result.slip as any,
          finishedGoodsLot: result.fgLot as any,
          userErrors: [],
        };
      } else {
        // OPEN Box
        const updatedProc = await this.prisma.productionProcess.update({
          where: { id: process.id },
          data: {
            boxId: input.boxId,
            boxStatus: "OPEN",
            updatedBy: effectiveUserId,
          },
        });

        const updatedSlip = await this.prisma.productionSlip.update({
          where: { id: process.productionSlipId },
          data: {
            boxId: input.boxId,
            boxStatus: "OPEN",
            updatedBy: effectiveUserId,
          },
        });

        return {
          productionProcess: updatedProc as any,
          productionSlip: updatedSlip as any,
          finishedGoodsLot: null,
          userErrors: [],
        };
      }
    } catch (error) {
      this.logger.error(`Error in assignBox: ${(error as Error).message}`);
      return {
        productionProcess: null,
        productionSlip: null,
        finishedGoodsLot: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Floor Monitoring Query: Get active / unstopped worker DTRs
   */
  async activeWorkerDtrs(sectionId?: number): Promise<ActiveWorkerDtrInfo[]> {
    const dtrs = await this.prisma.productionDtr.findMany({
      where: {
        status: "Started",
        deleted: false,
        ...(sectionId
          ? {
              productionProcess: {
                process: { sectionId },
              },
            }
          : {}),
      },
      include: {
        productionProcess: {
          include: {
            productionSlip: true,
            process: {
              include: {
                // Section
              },
            },
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return dtrs.map((d) => ({
      dtrId: d.id,
      userId: d.userId,
      userName: d.userId,
      sectionName: null,
      productionProcessId: d.productionProcessId,
      productionSlipId: d.productionSlipId ?? null,
      orderNo: d.productionProcess?.productionSlip?.orderNo ?? null,
      lotNo: d.productionProcess?.productionSlip?.lotNo ?? null,
      processName: d.currentProcessName,
      status: d.status,
      startTime: d.startTime,
    }));
  }

  /**
   * Scans active worker DTRs running longer than threshold hours and dispatches personal and supervisor alerts.
   */
  async notifyLeftRunningDtrs(
    maxHoursRunning?: number | null,
    context?: any,
  ): Promise<NotifyLeftRunningDtrsPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const hoursThreshold = maxHoursRunning && maxHoursRunning > 0 ? maxHoursRunning : 4.0;
      const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

      const staleDtrs = await this.prisma.productionDtr.findMany({
        where: {
          status: "Started",
          deleted: false,
          startTime: { lte: thresholdDate },
        },
        include: {
          productionProcess: {
            include: {
              productionSlip: true,
              process: true,
            },
          },
        },
      });

      const notifiedDtrIds: number[] = [];

      for (const dtr of staleDtrs) {
        const processName = dtr.currentProcessName || dtr.productionProcess?.processName || "Process";
        const lotNo = dtr.productionProcess?.productionSlip?.lotNo ?? "Unknown";
        const startTimeStr = dtr.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const runningMinutes = Math.round((Date.now() - dtr.startTime.getTime()) / 60000);
        const runningHours = (runningMinutes / 60).toFixed(1);

        // 1. Notify the worker
        await this.notificationService.send(
          {
            userIds: dtr.userId,
            title: `Active DTR Left Running: ${processName}`,
            message: `You have an active DTR on [${processName}] (Lot: ${lotNo}) running for ${runningHours} hours (since ${startTimeStr}). Please remember to stop your session.`,
            metadata: {
              type: "DTR_LEFT_RUNNING",
              dtrId: dtr.id,
              productionProcessId: dtr.productionProcessId,
              processName,
              lotNo,
              startTime: dtr.startTime,
              runningMinutes,
            },
          },
          context,
        );

        // 2. If running > 8 hours, also notify section supervisors / superAdmins
        if (runningMinutes > 8 * 60) {
          const sectionId = dtr.productionProcess?.process?.sectionId;
          const supervisors = await this.prisma.user.findMany({
            where: {
              deletedAt: null,
              OR: [
                ...(sectionId ? [{ sectionId }] : []),
                { superAdmin: true },
              ],
              id: { not: dtr.userId },
            },
            select: { id: true },
          });

          if (supervisors.length > 0) {
            await this.notificationService.send(
              {
                userIds: supervisors.map((s) => s.id),
                title: `Supervisor Alert: Stale DTR for Worker ${dtr.userId}`,
                message: `Worker [${dtr.userId}] has an active DTR on [${processName}] (Lot: ${lotNo}) running for ${runningHours} hours without stop.`,
                metadata: {
                  type: "DTR_STALE_SUPERVISOR_ALERT",
                  dtrId: dtr.id,
                  workerUserId: dtr.userId,
                  processName,
                  lotNo,
                  runningMinutes,
                },
              },
              context,
            );
          }
        }

        notifiedDtrIds.push(dtr.id);
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "NOTIFY_LEFT_RUNNING_DTRS",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionDtr",
        recordId: "BATCH",
        description: `Dispatched left-running DTR alerts to ${notifiedDtrIds.length} worker(s) (Threshold: ${hoursThreshold}h)`,
        values: { notifiedDtrIds, hoursThreshold },
        ipAddress,
        userAgent,
      });

      return {
        notifiedCount: notifiedDtrIds.length,
        dtrIds: notifiedDtrIds,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(`Error notifying left-running DTRs: ${(error as Error).message}`, (error as Error).stack);
      return {
        notifiedCount: 0,
        dtrIds: [],
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
