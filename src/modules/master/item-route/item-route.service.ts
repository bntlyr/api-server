import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateItemRouteInput,
  ItemRouteFilterInput,
  PaginationInput,
  UpdateItemRouteInput,
  ItemRouteConnection,
  ItemRoutePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateItemRouteInput, validateUpdateItemRouteInput } from "./helpers/item-route.helper.js";

import { ItemRouteLoader } from "./item-route.loader.js";

@Injectable()
export class ItemRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteLoader: ItemRouteLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemRouteLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemRouteFilterInput | null,
  ): Promise<ItemRouteConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "type"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemRoute.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemRoute.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemRouteConnection;
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
      } as unknown as ItemRouteConnection;
    }
  }

  async create(input: CreateItemRouteInput, context?: any): Promise<ItemRoutePayload> {
    const validationError = validateCreateItemRouteInput(input);
    if (validationError) {
      return {
        itemRoute: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const itemRoute = await this.prisma.itemRoute.create({
        data: {
          name: input.name,
          ...(input.type ? { type: input.type } : {}),
          itemId: input.itemId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      const item = await this.prisma.item.findUnique({
        where: { id: itemRoute.itemId },
        select: { ecnNo: true },
      });

      await this.prisma.itemRevision.create({
        data: {
          itemId: itemRoute.itemId,
          ecnNo: item?.ecnNo ?? null,
          details: `Created ${itemRoute.type} route "${itemRoute.name}"`,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRoute",
        recordId: String(itemRoute.id),
        description: "Created ItemRoute record",
        values: itemRoute as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRoute: itemRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemRouteInput,
    context?: any,
  ): Promise<ItemRoutePayload> {
    const validationError = validateUpdateItemRouteInput(input);
    if (validationError) {
      return {
        itemRoute: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRoute = await this.prisma.itemRoute.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.itemRouteLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const item = await this.prisma.item.findUnique({
        where: { id: itemRoute.itemId },
        select: { ecnNo: true },
      });

      const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
      await this.prisma.itemRevision.create({
        data: {
          itemId: itemRoute.itemId,
          ecnNo: item?.ecnNo ?? null,
          details: `Updated route "${itemRoute.name}" fields: ${changedFields.join(", ")}`,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRoute",
        recordId: String(parsedId),
        description: "Updated ItemRoute record",
        values: itemRoute as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRoute: itemRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemRoutePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRoute = await this.prisma.itemRoute.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemRouteLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const item = await this.prisma.item.findUnique({
        where: { id: itemRoute.itemId },
        select: { ecnNo: true },
      });

      await this.prisma.itemRevision.create({
        data: {
          itemId: itemRoute.itemId,
          ecnNo: item?.ecnNo ?? null,
          details: `Deleted route "${itemRoute.name}"`,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRoute",
        recordId: String(parsedId),
        description: "Deleted ItemRoute record",
        ipAddress,
        userAgent,
      });

      return {
        itemRoute: itemRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemRoutePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRoute = await this.prisma.itemRoute.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemRouteLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const item = await this.prisma.item.findUnique({
        where: { id: itemRoute.itemId },
        select: { ecnNo: true },
      });

      await this.prisma.itemRevision.create({
        data: {
          itemId: itemRoute.itemId,
          ecnNo: item?.ecnNo ?? null,
          details: `Restored route "${itemRoute.name}"`,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRoute",
        recordId: String(parsedId),
        description: "Restored ItemRoute record",
        ipAddress,
        userAgent,
      });

      return {
        itemRoute: itemRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
