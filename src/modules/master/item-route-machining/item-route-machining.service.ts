import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateItemRouteMachiningInput,
  ItemRouteMachiningFilterInput,
  PaginationInput,
  UpdateItemRouteMachiningInput,
  ItemRouteMachiningConnection,
  ItemRouteMachiningPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateItemRouteMachiningInput, validateUpdateItemRouteMachiningInput } from "./helpers/item-route-machining.helper.js";

import { ItemRouteMachiningLoader } from "./item-route-machining.loader.js";

@Injectable()
export class ItemRouteMachiningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteMachiningLoader: ItemRouteMachiningLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemRouteMachiningLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemRouteMachiningFilterInput | null,
    context?: any,
  ): Promise<ItemRouteMachiningConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, []);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemRouteMachining.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemRouteMachining.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemRouteMachiningConnection;
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
      } as unknown as ItemRouteMachiningConnection;
    }
  }

  async create(input: CreateItemRouteMachiningInput, context?: any): Promise<ItemRouteMachiningPayload> {
    const validationError = validateCreateItemRouteMachiningInput(input);
    if (validationError) {
      return {
        itemRouteMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const itemRouteMachining = await this.prisma.itemRouteMachining.create({
        data: {
          itemRouteStepId: input.itemRouteStepId,
          machineId: input.machineId,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteMachining.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Assigned machine #${itemRouteMachining.machineId} to step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteMachining",
        recordId: String(itemRouteMachining.id),
        description: "Created ItemRouteMachining record",
        values: itemRouteMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteMachining: itemRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemRouteMachiningInput,
    context?: any,
  ): Promise<ItemRouteMachiningPayload> {
    const validationError = validateUpdateItemRouteMachiningInput(input);
    if (validationError) {
      return {
        itemRouteMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteMachining = await this.prisma.itemRouteMachining.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.itemRouteStepId ? { itemRouteStepId: input.itemRouteStepId } : {}),
          ...(input.machineId ? { machineId: input.machineId } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.itemRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteMachining.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Updated assigned machine #${itemRouteMachining.machineId} in step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteMachining",
        recordId: String(parsedId),
        description: "Updated ItemRouteMachining record",
        values: itemRouteMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteMachining: itemRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemRouteMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteMachining = await this.prisma.itemRouteMachining.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteMachining.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Removed machine #${itemRouteMachining.machineId} from step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteMachining",
        recordId: String(parsedId),
        description: "Deleted ItemRouteMachining record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteMachining: itemRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemRouteMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteMachining = await this.prisma.itemRouteMachining.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteMachining.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Restored machine #${itemRouteMachining.machineId} assignment to step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteMachining",
        recordId: String(parsedId),
        description: "Restored ItemRouteMachining record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteMachining: itemRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
