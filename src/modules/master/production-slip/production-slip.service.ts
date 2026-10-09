import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateProductionSlipInput,
  ProductionSlipFilterInput,
  PaginationInput,
  UpdateProductionSlipInput,
  ProductionSlipConnection,
  ProductionSlipPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateProductionSlipInput, validateUpdateProductionSlipInput } from "./helpers/production-slip.helper.js";

import { ProductionSlipLoader } from "./production-slip.loader.js";

@Injectable()
export class ProductionSlipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionSlipLoader: ProductionSlipLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.productionSlipLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ProductionSlipFilterInput | null,
  ): Promise<ProductionSlipConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["orderNo", "lotNo", "chargeNo", "type", "trialLotNo", "trialCardUrl", "status", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.productionSlip.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.productionSlip.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ProductionSlipConnection;
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
      } as unknown as ProductionSlipConnection;
    }
  }

  async create(input: CreateProductionSlipInput, context?: any): Promise<ProductionSlipPayload> {
    const validationError = validateCreateProductionSlipInput(input);
    if (validationError) {
      return {
        productionSlip: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const productionSlip = await this.prisma.productionSlip.create({
        data: {
          salesOrderId: input.salesOrderId,
          orderNo: input.orderNo,
          lotNo: input.lotNo,
          chargeNo: input.chargeNo ?? null,
          ...(input.type ? { type: input.type } : {}),
          trialLotNo: input.trialLotNo ?? null,
          trialCardUrl: input.trialCardUrl ?? null,
          ...(input.status ? { status: input.status } : {}),
          ...(input.totalQty ? { totalQty: input.totalQty } : {}),
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          totalDays: input.totalDays ?? null,
          remarks: input.remarks ?? null,
          fabStartDate: input.fabStartDate ?? null,
          fabEndDate: input.fabEndDate ?? null,
          fabTotalDays: input.fabTotalDays ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PRODUCTIONSLIP",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionSlip",
        recordId: String(productionSlip.id),
        description: "Created ProductionSlip record",
        values: productionSlip as any,
        ipAddress,
        userAgent,
      });

      return {
        productionSlip: productionSlip as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionSlip: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateProductionSlipInput,
    context?: any,
  ): Promise<ProductionSlipPayload> {
    const validationError = validateUpdateProductionSlipInput(input);
    if (validationError) {
      return {
        productionSlip: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionSlip = await this.prisma.productionSlip.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.orderNo ? { orderNo: input.orderNo } : {}),
          ...(input.lotNo ? { lotNo: input.lotNo } : {}),
          ...(input.chargeNo !== undefined ? { chargeNo: input.chargeNo ?? null } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.trialLotNo !== undefined ? { trialLotNo: input.trialLotNo ?? null } : {}),
          ...(input.trialCardUrl !== undefined ? { trialCardUrl: input.trialCardUrl ?? null } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.totalQty ? { totalQty: input.totalQty } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate ?? null } : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate ?? null } : {}),
          ...(input.totalDays !== undefined ? { totalDays: input.totalDays ?? null } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.fabStartDate !== undefined ? { fabStartDate: input.fabStartDate ?? null } : {}),
          ...(input.fabEndDate !== undefined ? { fabEndDate: input.fabEndDate ?? null } : {}),
          ...(input.fabTotalDays !== undefined ? { fabTotalDays: input.fabTotalDays ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.productionSlipLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PRODUCTIONSLIP",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionSlip",
        recordId: String(parsedId),
        description: "Updated ProductionSlip record",
        values: productionSlip as any,
        ipAddress,
        userAgent,
      });

      return {
        productionSlip: productionSlip as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionSlip: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ProductionSlipPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionSlip = await this.prisma.productionSlip.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.productionSlipLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PRODUCTIONSLIP",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionSlip",
        recordId: String(parsedId),
        description: "Deleted ProductionSlip record",
        ipAddress,
        userAgent,
      });

      return {
        productionSlip: productionSlip as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionSlip: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ProductionSlipPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionSlip = await this.prisma.productionSlip.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.productionSlipLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PRODUCTIONSLIP",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionSlip",
        recordId: String(parsedId),
        description: "Restored ProductionSlip record",
        ipAddress,
        userAgent,
      });

      return {
        productionSlip: productionSlip as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionSlip: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
