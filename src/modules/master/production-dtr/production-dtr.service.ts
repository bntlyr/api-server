import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateProductionDtrInput,
  ProductionDtrFilterInput,
  PaginationInput,
  UpdateProductionDtrInput,
  ProductionDtrConnection,
  ProductionDtrPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateProductionDtrInput, validateUpdateProductionDtrInput } from "./helpers/production-dtr.helper.js";

import { ProductionDtrLoader } from "./production-dtr.loader.js";

@Injectable()
export class ProductionDtrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionDtrLoader: ProductionDtrLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.productionDtrLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ProductionDtrFilterInput | null,
  ): Promise<ProductionDtrConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["userId", "currentProcessName", "status", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.productionDtr.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.productionDtr.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ProductionDtrConnection;
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
      } as unknown as ProductionDtrConnection;
    }
  }

  async create(input: CreateProductionDtrInput, context?: any): Promise<ProductionDtrPayload> {
    const validationError = validateCreateProductionDtrInput(input);
    if (validationError) {
      return {
        productionDtr: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const productionDtr = await this.prisma.productionDtr.create({
        data: {
          userId: input.userId,
          productionProcessId: input.productionProcessId,
          productionSlipId: input.productionSlipId ?? null,
          currentProcessName: input.currentProcessName,
          ...(input.status ? { status: input.status } : {}),
          startTime: input.startTime,
          endTime: input.endTime ?? null,
          durationMinutes: input.durationMinutes ?? null,
          ...(input.passedQty ? { passedQty: input.passedQty } : {}),
          ...(input.rejectedQty ? { rejectedQty: input.rejectedQty } : {}),
          ...(input.reworkQty ? { reworkQty: input.reworkQty } : {}),
          remarks: input.remarks ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PRODUCTIONDTR",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionDtr",
        recordId: String(productionDtr.id),
        description: "Created ProductionDtr record",
        values: productionDtr as any,
        ipAddress,
        userAgent,
      });

      return {
        productionDtr: productionDtr as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionDtr: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateProductionDtrInput,
    context?: any,
  ): Promise<ProductionDtrPayload> {
    const validationError = validateUpdateProductionDtrInput(input);
    if (validationError) {
      return {
        productionDtr: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionDtr = await this.prisma.productionDtr.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.userId ? { userId: input.userId } : {}),
          ...(input.productionProcessId ? { productionProcessId: input.productionProcessId } : {}),
          ...(input.productionSlipId !== undefined ? { productionSlipId: input.productionSlipId ?? null } : {}),
          ...(input.currentProcessName ? { currentProcessName: input.currentProcessName } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.startTime ? { startTime: input.startTime } : {}),
          ...(input.endTime !== undefined ? { endTime: input.endTime ?? null } : {}),
          ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes ?? null } : {}),
          ...(input.passedQty ? { passedQty: input.passedQty } : {}),
          ...(input.rejectedQty ? { rejectedQty: input.rejectedQty } : {}),
          ...(input.reworkQty ? { reworkQty: input.reworkQty } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.productionDtrLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PRODUCTIONDTR",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionDtr",
        recordId: String(parsedId),
        description: "Updated ProductionDtr record",
        values: productionDtr as any,
        ipAddress,
        userAgent,
      });

      return {
        productionDtr: productionDtr as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionDtr: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ProductionDtrPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionDtr = await this.prisma.productionDtr.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.productionDtrLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PRODUCTIONDTR",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionDtr",
        recordId: String(parsedId),
        description: "Deleted ProductionDtr record",
        ipAddress,
        userAgent,
      });

      return {
        productionDtr: productionDtr as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionDtr: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ProductionDtrPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionDtr = await this.prisma.productionDtr.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.productionDtrLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PRODUCTIONDTR",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionDtr",
        recordId: String(parsedId),
        description: "Restored ProductionDtr record",
        ipAddress,
        userAgent,
      });

      return {
        productionDtr: productionDtr as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionDtr: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
