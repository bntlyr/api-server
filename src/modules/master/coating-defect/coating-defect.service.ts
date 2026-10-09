import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateCoatingDefectInput,
  CoatingDefectFilterInput,
  PaginationInput,
  UpdateCoatingDefectInput,
  CoatingDefectConnection,
  CoatingDefectPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateCoatingDefectInput, validateUpdateCoatingDefectInput } from "./helpers/coating-defect.helper.js";

import { CoatingDefectLoader } from "./coating-defect.loader.js";

@Injectable()
export class CoatingDefectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coatingDefectLoader: CoatingDefectLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.coatingDefectLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: CoatingDefectFilterInput | null,
  ): Promise<CoatingDefectConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["itemCode", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.coatingDefect.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.coatingDefect.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as CoatingDefectConnection;
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
      } as unknown as CoatingDefectConnection;
    }
  }

  async create(input: CreateCoatingDefectInput, context?: any): Promise<CoatingDefectPayload> {
    const validationError = validateCreateCoatingDefectInput(input);
    if (validationError) {
      return {
        coatingDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const coatingDefect = await this.prisma.coatingDefect.create({
        data: {
          bookingId: input.bookingId,
          productionSlipId: input.productionSlipId,
          salesOrderId: input.salesOrderId,
          itemId: input.itemId,
          itemCode: input.itemCode,
          ...(input.aSand ? { aSand: input.aSand } : {}),
          ...(input.eSand ? { eSand: input.eSand } : {}),
          ...(input.aSwell ? { aSwell: input.aSwell } : {}),
          ...(input.eSwell ? { eSwell: input.eSwell } : {}),
          ...(input.aFinRun ? { aFinRun: input.aFinRun } : {}),
          ...(input.eFinRun ? { eFinRun: input.eFinRun } : {}),
          ...(input.aPimple ? { aPimple: input.aPimple } : {}),
          ...(input.ePimple ? { ePimple: input.ePimple } : {}),
          ...(input.aProjection ? { aProjection: input.aProjection } : {}),
          ...(input.eProjection ? { eProjection: input.eProjection } : {}),
          ...(input.aRSurf ? { aRSurf: input.aRSurf } : {}),
          ...(input.eRSurf ? { eRSurf: input.eRSurf } : {}),
          ...(input.broken ? { broken: input.broken } : {}),
          ...(input.eCoating ? { eCoating: input.eCoating } : {}),
          ...(input.aCoating ? { aCoating: input.aCoating } : {}),
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
        action: "CREATE_COATINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CoatingDefect",
        recordId: String(coatingDefect.id),
        description: "Created CoatingDefect record",
        values: coatingDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        coatingDefect: coatingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        coatingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateCoatingDefectInput,
    context?: any,
  ): Promise<CoatingDefectPayload> {
    const validationError = validateUpdateCoatingDefectInput(input);
    if (validationError) {
      return {
        coatingDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const coatingDefect = await this.prisma.coatingDefect.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.bookingId ? { bookingId: input.bookingId } : {}),
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.itemCode ? { itemCode: input.itemCode } : {}),
          ...(input.aSand ? { aSand: input.aSand } : {}),
          ...(input.eSand ? { eSand: input.eSand } : {}),
          ...(input.aSwell ? { aSwell: input.aSwell } : {}),
          ...(input.eSwell ? { eSwell: input.eSwell } : {}),
          ...(input.aFinRun ? { aFinRun: input.aFinRun } : {}),
          ...(input.eFinRun ? { eFinRun: input.eFinRun } : {}),
          ...(input.aPimple ? { aPimple: input.aPimple } : {}),
          ...(input.ePimple ? { ePimple: input.ePimple } : {}),
          ...(input.aProjection ? { aProjection: input.aProjection } : {}),
          ...(input.eProjection ? { eProjection: input.eProjection } : {}),
          ...(input.aRSurf ? { aRSurf: input.aRSurf } : {}),
          ...(input.eRSurf ? { eRSurf: input.eRSurf } : {}),
          ...(input.broken ? { broken: input.broken } : {}),
          ...(input.eCoating ? { eCoating: input.eCoating } : {}),
          ...(input.aCoating ? { aCoating: input.aCoating } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.coatingDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_COATINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CoatingDefect",
        recordId: String(parsedId),
        description: "Updated CoatingDefect record",
        values: coatingDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        coatingDefect: coatingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        coatingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<CoatingDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const coatingDefect = await this.prisma.coatingDefect.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.coatingDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_COATINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CoatingDefect",
        recordId: String(parsedId),
        description: "Deleted CoatingDefect record",
        ipAddress,
        userAgent,
      });

      return {
        coatingDefect: coatingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        coatingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<CoatingDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const coatingDefect = await this.prisma.coatingDefect.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.coatingDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_COATINGDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "CoatingDefect",
        recordId: String(parsedId),
        description: "Restored CoatingDefect record",
        ipAddress,
        userAgent,
      });

      return {
        coatingDefect: coatingDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        coatingDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
