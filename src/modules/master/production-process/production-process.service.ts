import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateProductionProcessInput,
  ProductionProcessFilterInput,
  PaginationInput,
  UpdateProductionProcessInput,
  ProductionProcessConnection,
  ProductionProcessPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateProductionProcessInput, validateUpdateProductionProcessInput } from "./helpers/production-process.helper.js";

import { ProductionProcessLoader } from "./production-process.loader.js";

@Injectable()
export class ProductionProcessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionProcessLoader: ProductionProcessLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.productionProcessLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ProductionProcessFilterInput | null,
  ): Promise<ProductionProcessConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["processName", "itemCode", "receivedById", "status", "machineName", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.productionProcess.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.productionProcess.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ProductionProcessConnection;
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
      } as unknown as ProductionProcessConnection;
    }
  }

  async create(input: CreateProductionProcessInput, context?: any): Promise<ProductionProcessPayload> {
    const validationError = validateCreateProductionProcessInput(input);
    if (validationError) {
      return {
        productionProcess: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const productionProcess = await this.prisma.productionProcess.create({
        data: {
          productionSlipId: input.productionSlipId,
          stepNo: input.stepNo,
          processId: input.processId ?? null,
          processName: input.processName,
          itemCode: input.itemCode ?? null,
          ...(input.isFabrication ? { isFabrication: input.isFabrication } : {}),
          ...(input.isCompleted ? { isCompleted: input.isCompleted } : {}),
          ...(input.isRework ? { isRework: input.isRework } : {}),
          ...(input.isReceived ? { isReceived: input.isReceived } : {}),
          receivedById: input.receivedById ?? null,
          receivedAt: input.receivedAt ?? null,
          ...(input.status ? { status: input.status } : {}),
          scheduledStartDate: input.scheduledStartDate ?? null,
          scheduledEndDate: input.scheduledEndDate ?? null,
          actualStartDate: input.actualStartDate ?? null,
          actualEndDate: input.actualEndDate ?? null,
          ...(input.leadTime ? { leadTime: input.leadTime } : {}),
          ...(input.productionTime ? { productionTime: input.productionTime } : {}),
          ...(input.neededQty ? { neededQty: input.neededQty } : {}),
          ...(input.passedQty ? { passedQty: input.passedQty } : {}),
          ...(input.rejectedQty ? { rejectedQty: input.rejectedQty } : {}),
          ...(input.reworkQty1 ? { reworkQty1: input.reworkQty1 } : {}),
          ...(input.reworkQty2 ? { reworkQty2: input.reworkQty2 } : {}),
          ...(input.reworkQty3 ? { reworkQty3: input.reworkQty3 } : {}),
          machineId: input.machineId ?? null,
          machineName: input.machineName ?? null,
          remarks: input.remarks ?? null,
          previousProcessId: input.previousProcessId ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PRODUCTIONPROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionProcess",
        recordId: String(productionProcess.id),
        description: "Created ProductionProcess record",
        values: productionProcess as any,
        ipAddress,
        userAgent,
      });

      return {
        productionProcess: productionProcess as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionProcess: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateProductionProcessInput,
    context?: any,
  ): Promise<ProductionProcessPayload> {
    const validationError = validateUpdateProductionProcessInput(input);
    if (validationError) {
      return {
        productionProcess: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionProcess = await this.prisma.productionProcess.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.stepNo ? { stepNo: input.stepNo } : {}),
          ...(input.processId !== undefined ? { processId: input.processId ?? null } : {}),
          ...(input.processName ? { processName: input.processName } : {}),
          ...(input.itemCode !== undefined ? { itemCode: input.itemCode ?? null } : {}),
          ...(input.isFabrication ? { isFabrication: input.isFabrication } : {}),
          ...(input.isCompleted ? { isCompleted: input.isCompleted } : {}),
          ...(input.isRework ? { isRework: input.isRework } : {}),
          ...(input.isReceived ? { isReceived: input.isReceived } : {}),
          ...(input.receivedById !== undefined ? { receivedById: input.receivedById ?? null } : {}),
          ...(input.receivedAt !== undefined ? { receivedAt: input.receivedAt ?? null } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.scheduledStartDate !== undefined ? { scheduledStartDate: input.scheduledStartDate ?? null } : {}),
          ...(input.scheduledEndDate !== undefined ? { scheduledEndDate: input.scheduledEndDate ?? null } : {}),
          ...(input.actualStartDate !== undefined ? { actualStartDate: input.actualStartDate ?? null } : {}),
          ...(input.actualEndDate !== undefined ? { actualEndDate: input.actualEndDate ?? null } : {}),
          ...(input.leadTime ? { leadTime: input.leadTime } : {}),
          ...(input.productionTime ? { productionTime: input.productionTime } : {}),
          ...(input.neededQty ? { neededQty: input.neededQty } : {}),
          ...(input.passedQty ? { passedQty: input.passedQty } : {}),
          ...(input.rejectedQty ? { rejectedQty: input.rejectedQty } : {}),
          ...(input.reworkQty1 ? { reworkQty1: input.reworkQty1 } : {}),
          ...(input.reworkQty2 ? { reworkQty2: input.reworkQty2 } : {}),
          ...(input.reworkQty3 ? { reworkQty3: input.reworkQty3 } : {}),
          ...(input.machineId !== undefined ? { machineId: input.machineId ?? null } : {}),
          ...(input.machineName !== undefined ? { machineName: input.machineName ?? null } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.previousProcessId !== undefined ? { previousProcessId: input.previousProcessId ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.productionProcessLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PRODUCTIONPROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionProcess",
        recordId: String(parsedId),
        description: "Updated ProductionProcess record",
        values: productionProcess as any,
        ipAddress,
        userAgent,
      });

      return {
        productionProcess: productionProcess as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionProcess: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ProductionProcessPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionProcess = await this.prisma.productionProcess.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.productionProcessLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PRODUCTIONPROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionProcess",
        recordId: String(parsedId),
        description: "Deleted ProductionProcess record",
        ipAddress,
        userAgent,
      });

      return {
        productionProcess: productionProcess as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionProcess: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ProductionProcessPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const productionProcess = await this.prisma.productionProcess.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.productionProcessLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PRODUCTIONPROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "ProductionProcess",
        recordId: String(parsedId),
        description: "Restored ProductionProcess record",
        ipAddress,
        userAgent,
      });

      return {
        productionProcess: productionProcess as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        productionProcess: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
