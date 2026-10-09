import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { JavaService } from "../java-service/java-service.service.js";
import type {
  PrintProductionSlipInput,
  PrintProductionSlipBatchInput,
  PrintTrialCardInput,
  PrintTrialCardBatchInput,
  PrintReportPayload,
} from "../generated/graphql/types.js";
import type {
  PrintProductionSlipRequestDto,
  PrintTrialCardRequestDto,
  ProductionSlipTableInfoDto,
} from "../java-service/interfaces/java-service.interface.js";
import { extractContextInfo } from "../graphql/common/context.helper.js";
import type { GraphQLContext } from "../graphql/context.js";

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly javaService: JavaService,
  ) {}

  /**
   * Generates a single Production Slip PDF via the Java rendering engine.
   */
  async printProductionSlip(
    input: PrintProductionSlipInput,
    context?: GraphQLContext,
  ): Promise<PrintReportPayload> {
    try {
      const user = extractContextInfo(context);

      let slip: any = null;
      if (input.slipId) {
        slip = await this.prisma.productionSlip.findUnique({
          where: { id: input.slipId },
          include: {
            salesOrder: {
              include: {
                item: true,
                boxContainers: true,
              },
            },
            processes: {
              orderBy: { stepNo: "asc" },
            },
          },
        });
      } else if (input.orderNo && input.lotNo) {
        slip = await this.prisma.productionSlip.findFirst({
          where: {
            orderNo: input.orderNo,
            lotNo: input.lotNo,
          },
          include: {
            salesOrder: {
              include: {
                item: true,
                boxContainers: true,
              },
            },
            processes: {
              orderBy: { stepNo: "asc" },
            },
          },
        });
      }

      if (!slip) {
        return {
          success: false,
          userErrors: [
            {
              field: ["slipId"],
              message: "Production slip not found",
            },
          ],
        };
      }

      const slipType = input.type || slip.type || "ORIGINAL";
      const payload = this.buildSlipDto(slip, slipType, input.watermarkText, user?.userId);

      const result = await this.javaService.printProductionSlip(payload);

      if (!result.success) {
        return {
          success: false,
          userErrors: [
            {
              field: [],
              message: result.errorMessage || "Failed to generate production slip in Java microservice",
            },
          ],
        };
      }

      return {
        success: true,
        filename: result.filename,
        downloadUrl: result.downloadUrl,
        relativePath: result.relativePath,
        fileSize: result.fileSize,
        durationMs: result.durationMs,
        userErrors: [],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error printing production slip: ${msg}`, error);
      return {
        success: false,
        userErrors: [{ field: [], message: msg }],
      };
    }
  }

  /**
   * Generates a batch of Production Slips concatenated into a single multi-page PDF.
   */
  async printProductionSlipBatch(
    input: PrintProductionSlipBatchInput,
    context?: GraphQLContext,
  ): Promise<PrintReportPayload> {
    try {
      const user = extractContextInfo(context);

      let slips: any[] = [];
      if (input.slipIds && input.slipIds.length > 0) {
        slips = await this.prisma.productionSlip.findMany({
          where: { id: { in: input.slipIds } },
          include: {
            salesOrder: {
              include: {
                item: true,
                boxContainers: true,
              },
            },
            processes: {
              orderBy: { stepNo: "asc" },
            },
          },
          orderBy: { lotNo: "asc" },
        });
      } else if (input.orderNo) {
        slips = await this.prisma.productionSlip.findMany({
          where: { orderNo: input.orderNo },
          include: {
            salesOrder: {
              include: {
                item: true,
                boxContainers: true,
              },
            },
            processes: {
              orderBy: { stepNo: "asc" },
            },
          },
          orderBy: { lotNo: "asc" },
        });
      }

      if (slips.length === 0) {
        return {
          success: false,
          userErrors: [
            {
              field: ["orderNo"],
              message: "No production slips found for the specified criteria",
            },
          ],
        };
      }

      const dtoList: PrintProductionSlipRequestDto[] = slips.map((slip) =>
        this.buildSlipDto(slip, slip.type || "ORIGINAL", input.watermarkText, user?.userId),
      );

      const result = await this.javaService.printProductionSlipBatch(dtoList);

      if (!result.success) {
        return {
          success: false,
          userErrors: [
            {
              field: [],
              message: result.errorMessage || "Failed to generate batch production slips in Java microservice",
            },
          ],
        };
      }

      return {
        success: true,
        filename: result.filename,
        downloadUrl: result.downloadUrl,
        relativePath: result.relativePath,
        fileSize: result.fileSize,
        durationMs: result.durationMs,
        userErrors: [],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error printing batch production slips: ${msg}`, error);
      return {
        success: false,
        userErrors: [{ field: [], message: msg }],
      };
    }
  }

  /**
   * Generates a Trial Card PDF.
   */
  async printTrialCard(
    input: PrintTrialCardInput,
    _context?: GraphQLContext,
  ): Promise<PrintReportPayload> {
    try {
      const slip = await this.prisma.productionSlip.findUnique({
        where: { id: input.slipId },
        include: {
          salesOrder: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!slip) {
        return {
          success: false,
          userErrors: [
            {
              field: ["slipId"],
              message: "Production slip not found",
            },
          ],
        };
      }

      const item = slip.salesOrder?.item;
      const payload: PrintTrialCardRequestDto = {
        itemId: input.itemId || item?.id || 0,
        slipId: slip.id,
        type: slip.type || "ORIGINAL",
        createdAt: slip.createdAt ? new Date(slip.createdAt).toISOString().split("T")[0] : undefined,
        trialLotNo: slip.trialLotNo || undefined,
        itemCode: item?.itemCode || slip.salesOrder?.itemCode,
        rawMaterial: item?.specification || undefined,
        trialPurpose: slip.remarks || "Trial evaluation and validation",
        trialProcess: "Wax Injection / Coating / Casting",
        orderNo: slip.orderNo,
        lotNo: slip.lotNo,
        watermarkText: input.watermarkText || undefined,
      };

      const result = await this.javaService.printTrialCard(payload);

      if (!result.success) {
        return {
          success: false,
          userErrors: [
            {
              field: [],
              message: result.errorMessage || "Failed to generate trial card in Java microservice",
            },
          ],
        };
      }

      return {
        success: true,
        filename: result.filename,
        downloadUrl: result.downloadUrl,
        relativePath: result.relativePath,
        fileSize: result.fileSize,
        durationMs: result.durationMs,
        userErrors: [],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error printing trial card: ${msg}`, error);
      return {
        success: false,
        userErrors: [{ field: [], message: msg }],
      };
    }
  }

  /**
   * Generates a batch of Trial Cards.
   */
  async printTrialCardBatch(
    input: PrintTrialCardBatchInput,
    context?: GraphQLContext,
  ): Promise<PrintReportPayload> {
    try {
      let slips: any[] = [];
      if (input.slipIds && input.slipIds.length > 0) {
        slips = await this.prisma.productionSlip.findMany({
          where: { id: { in: input.slipIds } },
          include: {
            salesOrder: {
              include: {
                item: true,
              },
            },
          },
        });
      } else if (input.orderNo) {
        slips = await this.prisma.productionSlip.findMany({
          where: { orderNo: input.orderNo },
          include: {
            salesOrder: {
              include: {
                item: true,
              },
            },
          },
        });
      }

      if (slips.length === 0) {
        return {
          success: false,
          userErrors: [
            {
              field: ["orderNo"],
              message: "No slips found for trial card batch generation",
            },
          ],
        };
      }

      // Generate trial card for the first / primary slip or batch iterate
      const firstSlip = slips[0];
      return this.printTrialCard(
        {
          slipId: firstSlip.id,
          itemId: firstSlip.salesOrder?.item?.id,
          watermarkText: input.watermarkText,
        },
        context,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error printing trial card batch: ${msg}`, error);
      return {
        success: false,
        userErrors: [{ field: [], message: msg }],
      };
    }
  }

  /**
   * Helper mapping from Prisma entities to Java PrintProductionSlipRequestDto.
   */
  private buildSlipDto(
    slip: any,
    slipType: string,
    watermarkText?: string | null,
    userId?: string | null,
  ): PrintProductionSlipRequestDto {
    const salesOrder = slip.salesOrder;
    const item = salesOrder?.item;
    const totalQty = Number(slip.totalQty || 0);
    const qtyPerTree = Number(item?.qtyPerTree || 1);
    const scheduledTrees = qtyPerTree > 0 ? Math.ceil(totalQty / qtyPerTree).toString() : "0";

    const processTableDetails: ProductionSlipTableInfoDto[] = (slip.processes || []).map(
      (p: any) => ({
        id: p.id,
        processName: p.processName,
        startDate: p.scheduledStartDate
          ? new Date(p.scheduledStartDate).toISOString().split("T")[0]
          : undefined,
        actualStartDate: p.actualStartDate
          ? new Date(p.actualStartDate).toISOString().split("T")[0]
          : undefined,
        endDate: p.scheduledEndDate
          ? new Date(p.scheduledEndDate).toISOString().split("T")[0]
          : undefined,
        actualEndDate: p.actualEndDate
          ? new Date(p.actualEndDate).toISOString().split("T")[0]
          : undefined,
        personInCharge: p.receivedById || undefined,
        rejectedQty: p.rejectedQty != null ? Number(p.rejectedQty) : 0,
        passedQty: p.passedQty != null ? Number(p.passedQty) : 0,
        remarks: p.remarks || undefined,
      }),
    );

    return {
      slipId: slip.id,
      type: slipType,
      requestedETD: salesOrder?.requestedETD
        ? new Date(salesOrder.requestedETD).toISOString().split("T")[0]
        : undefined,
      itemCode: item?.itemCode || salesOrder?.itemCode,
      orderNo: slip.orderNo,
      orderQty: salesOrder?.orderQty ? Number(salesOrder.orderQty) : totalQty,
      rawMaterial: item?.specification || item?.colorCode,
      chargeNo: slip.chargeNo || undefined,
      trialLotNo: slip.trialLotNo || undefined,
      boxLayer: salesOrder?.boxContainers?.[0]?.boxType || "Standard Box",
      plasticSize: "Standard",
      plasticQty: 1,
      topLayerQty: 0,
      btmLayerQty: 0,
      maxQty: totalQty,
      maxWt: Number(item?.stdItemWt || 0) * totalQty,
      packingRemarks: salesOrder?.remarks || undefined,
      imageUrl: item?.itemImage || undefined,
      productionQty: totalQty.toString(),
      scheduledTrees,
      coatingPattern: item?.coatingPattern || undefined,
      treeMark: item?.drawingProductNo || undefined,
      similarProducts: item?.similarItem || undefined,
      castingTemp: item?.castingTemp ? Number(item.castingTemp) : undefined,
      moldTemp: item?.mouldTemp ? Number(item.mouldTemp) : undefined,
      castingWt: item?.castingWt ? Number(item.castingWt) : undefined,
      pcsPerTree: item?.qtyPerTree ? Number(item.qtyPerTree) : undefined,
      slipSize: slip.lotNo || "1/1",
      trialRemarks: slip.remarks || undefined,
      salesRemarks: salesOrder?.remarks || undefined,
      qrCode: `SLIP-${slip.id}-${slip.orderNo}-${slip.lotNo}`,
      reworkLotNo: slipType === "REWORK" ? slip.lotNo : undefined,
      createdBy: userId || slip.createdBy || "SYSTEM",
      watermarkText: watermarkText || undefined,
      processTableDetails,
    };
  }
}
