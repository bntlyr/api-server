import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateItemRevisionInput,
  ItemRevisionFilterInput,
  PaginationInput,
  UpdateItemRevisionInput,
  ItemRevisionConnection,
  ItemRevisionPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateItemRevisionInput, validateUpdateItemRevisionInput } from "./helpers/item-revision.helper.js";

import { ItemRevisionLoader } from "./item-revision.loader.js";

@Injectable()
export class ItemRevisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRevisionLoader: ItemRevisionLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemRevisionLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemRevisionFilterInput | null,
    context?: any,
  ): Promise<ItemRevisionConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["ecnNo", "details"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemRevision.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemRevision.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemRevisionConnection;
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
      } as unknown as ItemRevisionConnection;
    }
  }

  async create(input: CreateItemRevisionInput, context?: any): Promise<ItemRevisionPayload> {
    const validationError = validateCreateItemRevisionInput(input);
    if (validationError) {
      return {
        itemRevision: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const itemRevision = await this.prisma.itemRevision.create({
        data: {
          ecnNo: input.ecnNo ?? null,
          details: input.details,
          itemId: input.itemId,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMREVISION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRevision",
        recordId: String(itemRevision.id),
        description: "Created ItemRevision record",
        values: itemRevision as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRevision: itemRevision as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRevision: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemRevisionInput,
    context?: any,
  ): Promise<ItemRevisionPayload> {
    const validationError = validateUpdateItemRevisionInput(input);
    if (validationError) {
      return {
        itemRevision: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRevision = await this.prisma.itemRevision.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.ecnNo !== undefined ? { ecnNo: input.ecnNo ?? null } : {}),
          ...(input.details ? { details: input.details } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.itemRevisionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMREVISION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRevision",
        recordId: String(parsedId),
        description: "Updated ItemRevision record",
        values: itemRevision as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRevision: itemRevision as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRevision: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemRevisionPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRevision = await this.prisma.itemRevision.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemRevisionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMREVISION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRevision",
        recordId: String(parsedId),
        description: "Deleted ItemRevision record",
        ipAddress,
        userAgent,
      });

      return {
        itemRevision: itemRevision as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRevision: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemRevisionPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRevision = await this.prisma.itemRevision.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemRevisionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMREVISION",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRevision",
        recordId: String(parsedId),
        description: "Restored ItemRevision record",
        ipAddress,
        userAgent,
      });

      return {
        itemRevision: itemRevision as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRevision: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
