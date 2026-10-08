import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateItemRouteIterationInput,
  ItemRouteIterationFilterInput,
  PaginationInput,
  UpdateItemRouteIterationInput,
  ItemRouteIterationConnection,
  ItemRouteIterationPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateItemRouteIterationInput, validateUpdateItemRouteIterationInput } from "./helpers/item-route-iteration.helper.js";

import { ItemRouteIterationLoader } from "./item-route-iteration.loader.js";

@Injectable()
export class ItemRouteIterationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteIterationLoader: ItemRouteIterationLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemRouteIterationLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemRouteIterationFilterInput | null,
  ): Promise<ItemRouteIterationConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["subname"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemRouteIteration.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemRouteIteration.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemRouteIterationConnection;
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
      } as unknown as ItemRouteIterationConnection;
    }
  }

  async create(input: CreateItemRouteIterationInput, context?: any): Promise<ItemRouteIterationPayload> {
    const validationError = validateCreateItemRouteIterationInput(input);
    if (validationError) {
      return {
        itemRouteIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const count = await this.prisma.itemRouteIteration.count({
        where: { itemRouteStepId: input.itemRouteStepId },
      });

      if (count >= 10) {
        return {
          itemRouteIteration: null,
          userErrors: [createError("A route step can have a maximum of 10 iterations", "itemRouteStepId", "LIMIT_EXCEEDED")],
        };
      }

      const itemRouteIteration = await this.prisma.itemRouteIteration.create({
        data: {
          subname: input.subname,
          itemRouteStepId: input.itemRouteStepId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.prisma.itemRouteStep.update({
        where: { id: input.itemRouteStepId },
        data: { numberOfIterations: { increment: 1 } },
      });

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteIteration.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Added iteration "${itemRouteIteration.subname}" to step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteIteration",
        recordId: String(itemRouteIteration.id),
        description: "Created ItemRouteIteration record",
        values: itemRouteIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteIteration: itemRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemRouteIterationInput,
    context?: any,
  ): Promise<ItemRouteIterationPayload> {
    const validationError = validateUpdateItemRouteIterationInput(input);
    if (validationError) {
      return {
        itemRouteIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteIteration = await this.prisma.itemRouteIteration.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.subname ? { subname: input.subname } : {}),
          ...(input.itemRouteStepId ? { itemRouteStepId: input.itemRouteStepId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted != null ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.itemRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteIteration.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Updated iteration "${itemRouteIteration.subname}" fields: ${changedFields.join(", ")} in step "${step.sequenceNumber} - ${step.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteIteration",
        recordId: String(parsedId),
        description: "Updated ItemRouteIteration record",
        values: itemRouteIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteIteration: itemRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemRouteIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteIteration = await this.prisma.itemRouteIteration.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.prisma.itemRouteStep.update({
        where: { id: itemRouteIteration.itemRouteStepId },
        data: { numberOfIterations: { decrement: 1 } },
      });

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteIteration.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Deleted iteration "${itemRouteIteration.subname}" from step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteIteration",
        recordId: String(parsedId),
        description: "Deleted ItemRouteIteration record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteIteration: itemRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemRouteIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteIteration = await this.prisma.itemRouteIteration.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.prisma.itemRouteStep.update({
        where: { id: itemRouteIteration.itemRouteStepId },
        data: { numberOfIterations: { increment: 1 } },
      });

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteIteration.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Restored iteration "${itemRouteIteration.subname}" in step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteIteration",
        recordId: String(parsedId),
        description: "Restored ItemRouteIteration record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteIteration: itemRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
