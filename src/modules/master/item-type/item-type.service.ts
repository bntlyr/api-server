import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateItemTypeInput,
  ItemTypeFilterInput,
  PaginationInput,
  UpdateItemTypeInput,
  ItemTypeConnection,
  ItemTypePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateItemTypeInput, validateUpdateItemTypeInput } from "./helpers/item-type.helper.js";

import { ItemTypeLoader } from "./item-type.loader.js";

@Injectable()
export class ItemTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemTypeLoader: ItemTypeLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemTypeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemTypeFilterInput | null,
  ): Promise<ItemTypeConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "cycleType"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemType.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemType.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemTypeConnection;
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
      } as unknown as ItemTypeConnection;
    }
  }

  async create(input: CreateItemTypeInput, context?: any): Promise<ItemTypePayload> {
    const validationError = validateCreateItemTypeInput(input);
    if (validationError) {
      return {
        itemType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const itemType = await this.prisma.itemType.create({
        data: {
          name: input.name,
          code: input.code,
          ...(input.cycleType ? { cycleType: input.cycleType } : {}),
          ...(input.routeSetUp ? { routeSetUp: input.routeSetUp } : {}),
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(itemType.id),
        description: "Created ItemType record",
        values: itemType as any,
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemTypeInput,
    context?: any,
  ): Promise<ItemTypePayload> {
    const validationError = validateUpdateItemTypeInput(input);
    if (validationError) {
      return {
        itemType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemType = await this.prisma.itemType.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          ...(input.cycleType ? { cycleType: input.cycleType } : {}),
          ...(input.routeSetUp ? { routeSetUp: input.routeSetUp } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.itemTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(parsedId),
        description: "Updated ItemType record",
        values: itemType as any,
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemType = await this.prisma.itemType.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(parsedId),
        description: "Deleted ItemType record",
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemType = await this.prisma.itemType.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(parsedId),
        description: "Restored ItemType record",
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
