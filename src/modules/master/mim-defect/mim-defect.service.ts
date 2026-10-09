import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateMimDefectInput,
  MimDefectFilterInput,
  PaginationInput,
  UpdateMimDefectInput,
  MimDefectConnection,
  MimDefectPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateMimDefectInput, validateUpdateMimDefectInput } from "./helpers/mim-defect.helper.js";

import { MimDefectLoader } from "./mim-defect.loader.js";

@Injectable()
export class MimDefectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mimDefectLoader: MimDefectLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.mimDefectLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MimDefectFilterInput | null,
  ): Promise<MimDefectConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["itemCode", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.mimDefect.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.mimDefect.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MimDefectConnection;
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
      } as unknown as MimDefectConnection;
    }
  }

  async create(input: CreateMimDefectInput, context?: any): Promise<MimDefectPayload> {
    const validationError = validateCreateMimDefectInput(input);
    if (validationError) {
      return {
        mimDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const mimDefect = await this.prisma.mimDefect.create({
        data: {
          bookingId: input.bookingId,
          productionSlipId: input.productionSlipId,
          salesOrderId: input.salesOrderId,
          itemId: input.itemId,
          itemCode: input.itemCode,
          ...(input.crack ? { crack: input.crack } : {}),
          ...(input.cavity ? { cavity: input.cavity } : {}),
          ...(input.roughSurface ? { roughSurface: input.roughSurface } : {}),
          ...(input.spatter ? { spatter: input.spatter } : {}),
          ...(input.sticking ? { sticking: input.sticking } : {}),
          ...(input.bruiseChipping ? { bruiseChipping: input.bruiseChipping } : {}),
          ...(input.deformation ? { deformation: input.deformation } : {}),
          ...(input.size ? { size: input.size } : {}),
          ...(input.evaporation ? { evaporation: input.evaporation } : {}),
          ...(input.surfaceShrinkage ? { surfaceShrinkage: input.surfaceShrinkage } : {}),
          ...(input.gate ? { gate: input.gate } : {}),
          ...(input.injectionIncomplete ? { injectionIncomplete: input.injectionIncomplete } : {}),
          ...(input.airInclusion ? { airInclusion: input.airInclusion } : {}),
          ...(input.damage ? { damage: input.damage } : {}),
          ...(input.drop ? { drop: input.drop } : {}),
          ...(input.weldline ? { weldline: input.weldline } : {}),
          ...(input.strainMark ? { strainMark: input.strainMark } : {}),
          ...(input.jetting ? { jetting: input.jetting } : {}),
          ...(input.missing ? { missing: input.missing } : {}),
          ...(input.sintering ? { sintering: input.sintering } : {}),
          ...(input.fabricationRej ? { fabricationRej: input.fabricationRej } : {}),
          ...(input.others ? { others: input.others } : {}),
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
        action: "CREATE_MIMDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "MimDefect",
        recordId: String(mimDefect.id),
        description: "Created MimDefect record",
        values: mimDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        mimDefect: mimDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mimDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMimDefectInput,
    context?: any,
  ): Promise<MimDefectPayload> {
    const validationError = validateUpdateMimDefectInput(input);
    if (validationError) {
      return {
        mimDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mimDefect = await this.prisma.mimDefect.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.bookingId ? { bookingId: input.bookingId } : {}),
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.itemCode ? { itemCode: input.itemCode } : {}),
          ...(input.crack ? { crack: input.crack } : {}),
          ...(input.cavity ? { cavity: input.cavity } : {}),
          ...(input.roughSurface ? { roughSurface: input.roughSurface } : {}),
          ...(input.spatter ? { spatter: input.spatter } : {}),
          ...(input.sticking ? { sticking: input.sticking } : {}),
          ...(input.bruiseChipping ? { bruiseChipping: input.bruiseChipping } : {}),
          ...(input.deformation ? { deformation: input.deformation } : {}),
          ...(input.size ? { size: input.size } : {}),
          ...(input.evaporation ? { evaporation: input.evaporation } : {}),
          ...(input.surfaceShrinkage ? { surfaceShrinkage: input.surfaceShrinkage } : {}),
          ...(input.gate ? { gate: input.gate } : {}),
          ...(input.injectionIncomplete ? { injectionIncomplete: input.injectionIncomplete } : {}),
          ...(input.airInclusion ? { airInclusion: input.airInclusion } : {}),
          ...(input.damage ? { damage: input.damage } : {}),
          ...(input.drop ? { drop: input.drop } : {}),
          ...(input.weldline ? { weldline: input.weldline } : {}),
          ...(input.strainMark ? { strainMark: input.strainMark } : {}),
          ...(input.jetting ? { jetting: input.jetting } : {}),
          ...(input.missing ? { missing: input.missing } : {}),
          ...(input.sintering ? { sintering: input.sintering } : {}),
          ...(input.fabricationRej ? { fabricationRej: input.fabricationRej } : {}),
          ...(input.others ? { others: input.others } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.mimDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MIMDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "MimDefect",
        recordId: String(parsedId),
        description: "Updated MimDefect record",
        values: mimDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        mimDefect: mimDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mimDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MimDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mimDefect = await this.prisma.mimDefect.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.mimDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MIMDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "MimDefect",
        recordId: String(parsedId),
        description: "Deleted MimDefect record",
        ipAddress,
        userAgent,
      });

      return {
        mimDefect: mimDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mimDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MimDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mimDefect = await this.prisma.mimDefect.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.mimDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MIMDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "MimDefect",
        recordId: String(parsedId),
        description: "Restored MimDefect record",
        ipAddress,
        userAgent,
      });

      return {
        mimDefect: mimDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mimDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
