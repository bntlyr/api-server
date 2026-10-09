import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateWaxDefectInput,
  WaxDefectFilterInput,
  PaginationInput,
  UpdateWaxDefectInput,
  WaxDefectConnection,
  WaxDefectPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateWaxDefectInput, validateUpdateWaxDefectInput } from "./helpers/wax-defect.helper.js";

import { WaxDefectLoader } from "./wax-defect.loader.js";

@Injectable()
export class WaxDefectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waxDefectLoader: WaxDefectLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.waxDefectLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: WaxDefectFilterInput | null,
  ): Promise<WaxDefectConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["itemCode", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.waxDefect.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.waxDefect.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as WaxDefectConnection;
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
      } as unknown as WaxDefectConnection;
    }
  }

  async create(input: CreateWaxDefectInput, context?: any): Promise<WaxDefectPayload> {
    const validationError = validateCreateWaxDefectInput(input);
    if (validationError) {
      return {
        waxDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const waxDefect = await this.prisma.waxDefect.create({
        data: {
          bookingId: input.bookingId,
          productionSlipId: input.productionSlipId,
          salesOrderId: input.salesOrderId,
          itemId: input.itemId,
          itemCode: input.itemCode,
          ...(input.aSoluble ? { aSoluble: input.aSoluble } : {}),
          ...(input.eSoluble ? { eSoluble: input.eSoluble } : {}),
          ...(input.aWrinkles ? { aWrinkles: input.aWrinkles } : {}),
          ...(input.eWrinkles ? { eWrinkles: input.eWrinkles } : {}),
          ...(input.aBurryExcess ? { aBurryExcess: input.aBurryExcess } : {}),
          ...(input.eBurryExcess ? { eBurryExcess: input.eBurryExcess } : {}),
          ...(input.aPartingLineOffset ? { aPartingLineOffset: input.aPartingLineOffset } : {}),
          ...(input.ePartingLineOffset ? { ePartingLineOffset: input.ePartingLineOffset } : {}),
          ...(input.aSurfaceShrinkage ? { aSurfaceShrinkage: input.aSurfaceShrinkage } : {}),
          ...(input.eSurfaceShrinkage ? { eSurfaceShrinkage: input.eSurfaceShrinkage } : {}),
          ...(input.aDieMouldDefect ? { aDieMouldDefect: input.aDieMouldDefect } : {}),
          ...(input.eDieMouldDefect ? { eDieMouldDefect: input.eDieMouldDefect } : {}),
          ...(input.aDroplets ? { aDroplets: input.aDroplets } : {}),
          ...(input.eDroplets ? { eDroplets: input.eDroplets } : {}),
          ...(input.aDeformation ? { aDeformation: input.aDeformation } : {}),
          ...(input.eDeformation ? { eDeformation: input.eDeformation } : {}),
          ...(input.aInjectionDamage ? { aInjectionDamage: input.aInjectionDamage } : {}),
          ...(input.eInjectionDamage ? { eInjectionDamage: input.eInjectionDamage } : {}),
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
        action: "CREATE_WAXDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "WaxDefect",
        recordId: String(waxDefect.id),
        description: "Created WaxDefect record",
        values: waxDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        waxDefect: waxDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        waxDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateWaxDefectInput,
    context?: any,
  ): Promise<WaxDefectPayload> {
    const validationError = validateUpdateWaxDefectInput(input);
    if (validationError) {
      return {
        waxDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const waxDefect = await this.prisma.waxDefect.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.bookingId ? { bookingId: input.bookingId } : {}),
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.itemCode ? { itemCode: input.itemCode } : {}),
          ...(input.aSoluble ? { aSoluble: input.aSoluble } : {}),
          ...(input.eSoluble ? { eSoluble: input.eSoluble } : {}),
          ...(input.aWrinkles ? { aWrinkles: input.aWrinkles } : {}),
          ...(input.eWrinkles ? { eWrinkles: input.eWrinkles } : {}),
          ...(input.aBurryExcess ? { aBurryExcess: input.aBurryExcess } : {}),
          ...(input.eBurryExcess ? { eBurryExcess: input.eBurryExcess } : {}),
          ...(input.aPartingLineOffset ? { aPartingLineOffset: input.aPartingLineOffset } : {}),
          ...(input.ePartingLineOffset ? { ePartingLineOffset: input.ePartingLineOffset } : {}),
          ...(input.aSurfaceShrinkage ? { aSurfaceShrinkage: input.aSurfaceShrinkage } : {}),
          ...(input.eSurfaceShrinkage ? { eSurfaceShrinkage: input.eSurfaceShrinkage } : {}),
          ...(input.aDieMouldDefect ? { aDieMouldDefect: input.aDieMouldDefect } : {}),
          ...(input.eDieMouldDefect ? { eDieMouldDefect: input.eDieMouldDefect } : {}),
          ...(input.aDroplets ? { aDroplets: input.aDroplets } : {}),
          ...(input.eDroplets ? { eDroplets: input.eDroplets } : {}),
          ...(input.aDeformation ? { aDeformation: input.aDeformation } : {}),
          ...(input.eDeformation ? { eDeformation: input.eDeformation } : {}),
          ...(input.aInjectionDamage ? { aInjectionDamage: input.aInjectionDamage } : {}),
          ...(input.eInjectionDamage ? { eInjectionDamage: input.eInjectionDamage } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.waxDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_WAXDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "WaxDefect",
        recordId: String(parsedId),
        description: "Updated WaxDefect record",
        values: waxDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        waxDefect: waxDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        waxDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<WaxDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const waxDefect = await this.prisma.waxDefect.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.waxDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_WAXDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "WaxDefect",
        recordId: String(parsedId),
        description: "Deleted WaxDefect record",
        ipAddress,
        userAgent,
      });

      return {
        waxDefect: waxDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        waxDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<WaxDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const waxDefect = await this.prisma.waxDefect.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.waxDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_WAXDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "WaxDefect",
        recordId: String(parsedId),
        description: "Restored WaxDefect record",
        ipAddress,
        userAgent,
      });

      return {
        waxDefect: waxDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        waxDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
