import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateBoxContainerItemInput,
  BoxContainerItemFilterInput,
  PaginationInput,
  UpdateBoxContainerItemInput,
  BoxContainerItemConnection,
  BoxContainerItemPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateBoxContainerItemInput, validateUpdateBoxContainerItemInput } from "./helpers/box-container-item.helper.js";

import { BoxContainerItemLoader } from "./box-container-item.loader.js";

@Injectable()
export class BoxContainerItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boxContainerItemLoader: BoxContainerItemLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.boxContainerItemLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: BoxContainerItemFilterInput | null,
    context?: any,
  ): Promise<BoxContainerItemConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["orderNo", "lotNo", "chargeNo", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.boxContainerItem.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.boxContainerItem.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as BoxContainerItemConnection;
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
      } as unknown as BoxContainerItemConnection;
    }
  }

  async create(input: CreateBoxContainerItemInput, context?: any): Promise<BoxContainerItemPayload> {
    const validationError = validateCreateBoxContainerItemInput(input);
    if (validationError) {
      return {
        boxContainerItem: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const boxContainerItem = await this.prisma.boxContainerItem.create({
        data: {
          boxContainerId: input.boxContainerId,
          productionSlipId: input.productionSlipId ?? null,
          productionProcessId: input.productionProcessId ?? null,
          salesOrderId: input.salesOrderId,
          itemId: input.itemId,
          fabricationId: input.fabricationId ?? null,
          orderNo: input.orderNo,
          lotNo: input.lotNo,
          chargeNo: input.chargeNo ?? null,
          quantity: input.quantity,
          remarks: input.remarks ?? null,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_BOXCONTAINERITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainerItem",
        recordId: String(boxContainerItem.id),
        description: "Created BoxContainerItem record",
        values: boxContainerItem as any,
        ipAddress,
        userAgent,
      });

      return {
        boxContainerItem: boxContainerItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainerItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateBoxContainerItemInput,
    context?: any,
  ): Promise<BoxContainerItemPayload> {
    const validationError = validateUpdateBoxContainerItemInput(input);
    if (validationError) {
      return {
        boxContainerItem: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxContainerItem = await this.prisma.boxContainerItem.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.boxContainerId ? { boxContainerId: input.boxContainerId } : {}),
          ...(input.productionSlipId !== undefined ? { productionSlipId: input.productionSlipId ?? null } : {}),
          ...(input.productionProcessId !== undefined ? { productionProcessId: input.productionProcessId ?? null } : {}),
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.fabricationId !== undefined ? { fabricationId: input.fabricationId ?? null } : {}),
          ...(input.orderNo ? { orderNo: input.orderNo } : {}),
          ...(input.lotNo ? { lotNo: input.lotNo } : {}),
          ...(input.chargeNo !== undefined ? { chargeNo: input.chargeNo ?? null } : {}),
          ...(input.quantity ? { quantity: input.quantity } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.boxContainerItemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_BOXCONTAINERITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainerItem",
        recordId: String(parsedId),
        description: "Updated BoxContainerItem record",
        values: boxContainerItem as any,
        ipAddress,
        userAgent,
      });

      return {
        boxContainerItem: boxContainerItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainerItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<BoxContainerItemPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxContainerItem = await this.prisma.boxContainerItem.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.boxContainerItemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_BOXCONTAINERITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainerItem",
        recordId: String(parsedId),
        description: "Deleted BoxContainerItem record",
        ipAddress,
        userAgent,
      });

      return {
        boxContainerItem: boxContainerItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainerItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<BoxContainerItemPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxContainerItem = await this.prisma.boxContainerItem.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.boxContainerItemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_BOXCONTAINERITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainerItem",
        recordId: String(parsedId),
        description: "Restored BoxContainerItem record",
        ipAddress,
        userAgent,
      });

      return {
        boxContainerItem: boxContainerItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainerItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
