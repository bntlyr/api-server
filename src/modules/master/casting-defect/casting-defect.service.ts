import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateCastingDefectInput,
  CastingDefectFilterInput,
  PaginationInput,
  UpdateCastingDefectInput,
  CastingDefectConnection,
  CastingDefectPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateCastingDefectInput, validateUpdateCastingDefectInput } from "./helpers/casting-defect.helper.js";

import { CastingDefectLoader } from "./casting-defect.loader.js";

@Injectable()
export class CastingDefectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly castingDefectLoader: CastingDefectLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.castingDefectLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: CastingDefectFilterInput | null,
    context?: any,
  ): Promise<CastingDefectConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["itemCode", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.castingDefect.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.castingDefect.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as CastingDefectConnection;
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
      } as unknown as CastingDefectConnection;
    }
  }

  async create(input: CreateCastingDefectInput, context?: any): Promise<CastingDefectPayload> {
    const validationError = validateCreateCastingDefectInput(input);
    if (validationError) {
      return {
        castingDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const castingDefect = await this.prisma.castingDefect.create({
        data: {
          bookingId: input.bookingId,
          productionSlipId: input.productionSlipId,
          salesOrderId: input.salesOrderId,
          itemId: input.itemId,
          itemCode: input.itemCode,
          ...(input.runout ? { runout: input.runout } : {}),
          ...(input.aMRun ? { aMRun: input.aMRun } : {}),
          ...(input.eMRun ? { eMRun: input.eMRun } : {}),
          ...(input.aShrink ? { aShrink: input.aShrink } : {}),
          ...(input.eShrink ? { eShrink: input.eShrink } : {}),
          ...(input.aPinhole ? { aPinhole: input.aPinhole } : {}),
          ...(input.ePinhole ? { ePinhole: input.ePinhole } : {}),
          ...(input.aSlagInclusion ? { aSlagInclusion: input.aSlagInclusion } : {}),
          ...(input.eSlagInclusion ? { eSlagInclusion: input.eSlagInclusion } : {}),
          ...(input.aOxide ? { aOxide: input.aOxide } : {}),
          ...(input.eOxide ? { eOxide: input.eOxide } : {}),
          ...(input.aCrkBrk ? { aCrkBrk: input.aCrkBrk } : {}),
          ...(input.eCrkBrk ? { eCrkBrk: input.eCrkBrk } : {}),
          ...(input.brokenCast ? { brokenCast: input.brokenCast } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          remarks: input.remarks ?? null,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_CASTINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CastingDefect",
        recordId: String(castingDefect.id),
        description: "Created CastingDefect record",
        values: castingDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        castingDefect: castingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        castingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateCastingDefectInput,
    context?: any,
  ): Promise<CastingDefectPayload> {
    const validationError = validateUpdateCastingDefectInput(input);
    if (validationError) {
      return {
        castingDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const castingDefect = await this.prisma.castingDefect.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.bookingId ? { bookingId: input.bookingId } : {}),
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.itemCode ? { itemCode: input.itemCode } : {}),
          ...(input.runout ? { runout: input.runout } : {}),
          ...(input.aMRun ? { aMRun: input.aMRun } : {}),
          ...(input.eMRun ? { eMRun: input.eMRun } : {}),
          ...(input.aShrink ? { aShrink: input.aShrink } : {}),
          ...(input.eShrink ? { eShrink: input.eShrink } : {}),
          ...(input.aPinhole ? { aPinhole: input.aPinhole } : {}),
          ...(input.ePinhole ? { ePinhole: input.ePinhole } : {}),
          ...(input.aSlagInclusion ? { aSlagInclusion: input.aSlagInclusion } : {}),
          ...(input.eSlagInclusion ? { eSlagInclusion: input.eSlagInclusion } : {}),
          ...(input.aOxide ? { aOxide: input.aOxide } : {}),
          ...(input.eOxide ? { eOxide: input.eOxide } : {}),
          ...(input.aCrkBrk ? { aCrkBrk: input.aCrkBrk } : {}),
          ...(input.eCrkBrk ? { eCrkBrk: input.eCrkBrk } : {}),
          ...(input.brokenCast ? { brokenCast: input.brokenCast } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.castingDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_CASTINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CastingDefect",
        recordId: String(parsedId),
        description: "Updated CastingDefect record",
        values: castingDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        castingDefect: castingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        castingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<CastingDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const castingDefect = await this.prisma.castingDefect.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.castingDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_CASTINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CastingDefect",
        recordId: String(parsedId),
        description: "Deleted CastingDefect record",
        ipAddress,
        userAgent,
      });

      return {
        castingDefect: castingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        castingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<CastingDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const castingDefect = await this.prisma.castingDefect.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.castingDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_CASTINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CastingDefect",
        recordId: String(parsedId),
        description: "Restored CastingDefect record",
        ipAddress,
        userAgent,
      });

      return {
        castingDefect: castingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        castingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
