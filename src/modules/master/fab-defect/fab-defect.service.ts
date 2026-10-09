import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateFabDefectInput,
  FabDefectFilterInput,
  PaginationInput,
  UpdateFabDefectInput,
  FabDefectConnection,
  FabDefectPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateFabDefectInput, validateUpdateFabDefectInput } from "./helpers/fab-defect.helper.js";

import { FabDefectLoader } from "./fab-defect.loader.js";

@Injectable()
export class FabDefectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabDefectLoader: FabDefectLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.fabDefectLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: FabDefectFilterInput | null,
  ): Promise<FabDefectConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["itemCode", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.fabDefect.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.fabDefect.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as FabDefectConnection;
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
      } as unknown as FabDefectConnection;
    }
  }

  async create(input: CreateFabDefectInput, context?: any): Promise<FabDefectPayload> {
    const validationError = validateCreateFabDefectInput(input);
    if (validationError) {
      return {
        fabDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const fabDefect = await this.prisma.fabDefect.create({
        data: {
          bookingId: input.bookingId,
          productionSlipId: input.productionSlipId,
          salesOrderId: input.salesOrderId,
          itemId: input.itemId,
          itemCode: input.itemCode,
          ...(input.oxide ? { oxide: input.oxide } : {}),
          ...(input.surfaceShrinkage ? { surfaceShrinkage: input.surfaceShrinkage } : {}),
          ...(input.sandInclusion ? { sandInclusion: input.sandInclusion } : {}),
          ...(input.swelling ? { swelling: input.swelling } : {}),
          ...(input.misrun ? { misrun: input.misrun } : {}),
          ...(input.shrinkage ? { shrinkage: input.shrinkage } : {}),
          ...(input.pinhole ? { pinhole: input.pinhole } : {}),
          ...(input.slagInclusion ? { slagInclusion: input.slagInclusion } : {}),
          ...(input.bruise ? { bruise: input.bruise } : {}),
          ...(input.overGrind ? { overGrind: input.overGrind } : {}),
          ...(input.overRepair ? { overRepair: input.overRepair } : {}),
          ...(input.materialDeform ? { materialDeform: input.materialDeform } : {}),
          ...(input.gashole ? { gashole: input.gashole } : {}),
          ...(input.step ? { step: input.step } : {}),
          ...(input.offSet ? { offSet: input.offSet } : {}),
          ...(input.toolMark ? { toolMark: input.toolMark } : {}),
          ...(input.brokenTool ? { brokenTool: input.brokenTool } : {}),
          ...(input.roughSurface ? { roughSurface: input.roughSurface } : {}),
          ...(input.scratch ? { scratch: input.scratch } : {}),
          ...(input.misAlign ? { misAlign: input.misAlign } : {}),
          ...(input.swelling1 ? { swelling1: input.swelling1 } : {}),
          ...(input.dent ? { dent: input.dent } : {}),
          ...(input.deburring ? { deburring: input.deburring } : {}),
          ...(input.wrongProcess ? { wrongProcess: input.wrongProcess } : {}),
          ...(input.holeDiameterUndersize ? { holeDiameterUndersize: input.holeDiameterUndersize } : {}),
          ...(input.holeDiameterOversize ? { holeDiameterOversize: input.holeDiameterOversize } : {}),
          ...(input.thicknessOversize ? { thicknessOversize: input.thicknessOversize } : {}),
          ...(input.thicknessUndersize ? { thicknessUndersize: input.thicknessUndersize } : {}),
          ...(input.pitchOversize ? { pitchOversize: input.pitchOversize } : {}),
          ...(input.pitchUndersize ? { pitchUndersize: input.pitchUndersize } : {}),
          ...(input.threadOversize ? { threadOversize: input.threadOversize } : {}),
          ...(input.threadUndersize ? { threadUndersize: input.threadUndersize } : {}),
          ...(input.depthOversize ? { depthOversize: input.depthOversize } : {}),
          ...(input.depthUndersize ? { depthUndersize: input.depthUndersize } : {}),
          ...(input.champerOversize ? { champerOversize: input.champerOversize } : {}),
          ...(input.champerUndersize ? { champerUndersize: input.champerUndersize } : {}),
          ...(input.gTOSPosition ? { gTOSPosition: input.gTOSPosition } : {}),
          ...(input.gTOSParallel ? { gTOSParallel: input.gTOSParallel } : {}),
          ...(input.gTOSPerpendicular ? { gTOSPerpendicular: input.gTOSPerpendicular } : {}),
          ...(input.gTOSConcentricity ? { gTOSConcentricity: input.gTOSConcentricity } : {}),
          ...(input.gTOSFlatness ? { gTOSFlatness: input.gTOSFlatness } : {}),
          ...(input.gTOSSymmetry ? { gTOSSymmetry: input.gTOSSymmetry } : {}),
          ...(input.gTOSRunOut ? { gTOSRunOut: input.gTOSRunOut } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          remarks: input.remarks ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_FABDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "FabDefect",
        recordId: String(fabDefect.id),
        description: "Created FabDefect record",
        values: fabDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        fabDefect: fabDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateFabDefectInput,
    context?: any,
  ): Promise<FabDefectPayload> {
    const validationError = validateUpdateFabDefectInput(input);
    if (validationError) {
      return {
        fabDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabDefect = await this.prisma.fabDefect.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.bookingId ? { bookingId: input.bookingId } : {}),
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.itemCode ? { itemCode: input.itemCode } : {}),
          ...(input.oxide ? { oxide: input.oxide } : {}),
          ...(input.surfaceShrinkage ? { surfaceShrinkage: input.surfaceShrinkage } : {}),
          ...(input.sandInclusion ? { sandInclusion: input.sandInclusion } : {}),
          ...(input.swelling ? { swelling: input.swelling } : {}),
          ...(input.misrun ? { misrun: input.misrun } : {}),
          ...(input.shrinkage ? { shrinkage: input.shrinkage } : {}),
          ...(input.pinhole ? { pinhole: input.pinhole } : {}),
          ...(input.slagInclusion ? { slagInclusion: input.slagInclusion } : {}),
          ...(input.bruise ? { bruise: input.bruise } : {}),
          ...(input.overGrind ? { overGrind: input.overGrind } : {}),
          ...(input.overRepair ? { overRepair: input.overRepair } : {}),
          ...(input.materialDeform ? { materialDeform: input.materialDeform } : {}),
          ...(input.gashole ? { gashole: input.gashole } : {}),
          ...(input.step ? { step: input.step } : {}),
          ...(input.offSet ? { offSet: input.offSet } : {}),
          ...(input.toolMark ? { toolMark: input.toolMark } : {}),
          ...(input.brokenTool ? { brokenTool: input.brokenTool } : {}),
          ...(input.roughSurface ? { roughSurface: input.roughSurface } : {}),
          ...(input.scratch ? { scratch: input.scratch } : {}),
          ...(input.misAlign ? { misAlign: input.misAlign } : {}),
          ...(input.swelling1 ? { swelling1: input.swelling1 } : {}),
          ...(input.dent ? { dent: input.dent } : {}),
          ...(input.deburring ? { deburring: input.deburring } : {}),
          ...(input.wrongProcess ? { wrongProcess: input.wrongProcess } : {}),
          ...(input.holeDiameterUndersize ? { holeDiameterUndersize: input.holeDiameterUndersize } : {}),
          ...(input.holeDiameterOversize ? { holeDiameterOversize: input.holeDiameterOversize } : {}),
          ...(input.thicknessOversize ? { thicknessOversize: input.thicknessOversize } : {}),
          ...(input.thicknessUndersize ? { thicknessUndersize: input.thicknessUndersize } : {}),
          ...(input.pitchOversize ? { pitchOversize: input.pitchOversize } : {}),
          ...(input.pitchUndersize ? { pitchUndersize: input.pitchUndersize } : {}),
          ...(input.threadOversize ? { threadOversize: input.threadOversize } : {}),
          ...(input.threadUndersize ? { threadUndersize: input.threadUndersize } : {}),
          ...(input.depthOversize ? { depthOversize: input.depthOversize } : {}),
          ...(input.depthUndersize ? { depthUndersize: input.depthUndersize } : {}),
          ...(input.champerOversize ? { champerOversize: input.champerOversize } : {}),
          ...(input.champerUndersize ? { champerUndersize: input.champerUndersize } : {}),
          ...(input.gTOSPosition ? { gTOSPosition: input.gTOSPosition } : {}),
          ...(input.gTOSParallel ? { gTOSParallel: input.gTOSParallel } : {}),
          ...(input.gTOSPerpendicular ? { gTOSPerpendicular: input.gTOSPerpendicular } : {}),
          ...(input.gTOSConcentricity ? { gTOSConcentricity: input.gTOSConcentricity } : {}),
          ...(input.gTOSFlatness ? { gTOSFlatness: input.gTOSFlatness } : {}),
          ...(input.gTOSSymmetry ? { gTOSSymmetry: input.gTOSSymmetry } : {}),
          ...(input.gTOSRunOut ? { gTOSRunOut: input.gTOSRunOut } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.fabDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_FABDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "FabDefect",
        recordId: String(parsedId),
        description: "Updated FabDefect record",
        values: fabDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        fabDefect: fabDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<FabDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabDefect = await this.prisma.fabDefect.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.fabDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_FABDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "FabDefect",
        recordId: String(parsedId),
        description: "Deleted FabDefect record",
        ipAddress,
        userAgent,
      });

      return {
        fabDefect: fabDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<FabDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabDefect = await this.prisma.fabDefect.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.fabDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_FABDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "FabDefect",
        recordId: String(parsedId),
        description: "Restored FabDefect record",
        ipAddress,
        userAgent,
      });

      return {
        fabDefect: fabDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
