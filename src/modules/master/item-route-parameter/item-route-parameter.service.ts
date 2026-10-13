import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateItemRouteParameterInput,
  ItemRouteParameterFilterInput,
  PaginationInput,
  UpdateItemRouteParameterInput,
  ItemRouteParameterConnection,
  ItemRouteParameterPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateItemRouteParameterInput, validateUpdateItemRouteParameterInput } from "./helpers/item-route-parameter.helper.js";

import { ItemRouteParameterLoader } from "./item-route-parameter.loader.js";

@Injectable()
export class ItemRouteParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteParameterLoader: ItemRouteParameterLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemRouteParameterLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemRouteParameterFilterInput | null,
    context?: any,
  ): Promise<ItemRouteParameterConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "inputType", "paramValue"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemRouteParameter.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemRouteParameter.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemRouteParameterConnection;
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
      } as unknown as ItemRouteParameterConnection;
    }
  }

  async create(input: CreateItemRouteParameterInput, context?: any): Promise<ItemRouteParameterPayload> {
    const validationError = validateCreateItemRouteParameterInput(input);
    if (validationError) {
      return {
        itemRouteParameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const itemRouteParameter = await this.prisma.itemRouteParameter.create({
        data: {
          name: input.name,
          ...(input.inputType ? { inputType: input.inputType } : {}),
          paramValue: input.paramValue ?? null,
          itemRouteStepId: input.itemRouteStepId,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteParameter.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Added parameter "${itemRouteParameter.name}" to step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteParameter",
        recordId: String(itemRouteParameter.id),
        description: "Created ItemRouteParameter record",
        values: itemRouteParameter as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteParameter: itemRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemRouteParameterInput,
    context?: any,
  ): Promise<ItemRouteParameterPayload> {
    const validationError = validateUpdateItemRouteParameterInput(input);
    if (validationError) {
      return {
        itemRouteParameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteParameter = await this.prisma.itemRouteParameter.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.inputType ? { inputType: input.inputType } : {}),
          ...(input.paramValue !== undefined ? { paramValue: input.paramValue ?? null } : {}),
          ...(input.itemRouteStepId ? { itemRouteStepId: input.itemRouteStepId } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.itemRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteParameter.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Updated parameter "${itemRouteParameter.name}" fields: ${changedFields.join(", ")} in step "${step.sequenceNumber} - ${step.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteParameter",
        recordId: String(parsedId),
        description: "Updated ItemRouteParameter record",
        values: itemRouteParameter as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteParameter: itemRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemRouteParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteParameter = await this.prisma.itemRouteParameter.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteParameter.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Deleted parameter "${itemRouteParameter.name}" from step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteParameter",
        recordId: String(parsedId),
        description: "Deleted ItemRouteParameter record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteParameter: itemRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemRouteParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteParameter = await this.prisma.itemRouteParameter.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.itemRouteStep.findUnique({
        where: { id: itemRouteParameter.itemRouteStepId },
        include: { itemRoute: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (step?.itemRoute?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.itemRoute.itemId,
            ecnNo: step.itemRoute.item.ecnNo ?? null,
            details: `Restored parameter "${itemRouteParameter.name}" in step "${step.sequenceNumber} - ${step.name}" in route "${step.itemRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteParameter",
        recordId: String(parsedId),
        description: "Restored ItemRouteParameter record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteParameter: itemRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
