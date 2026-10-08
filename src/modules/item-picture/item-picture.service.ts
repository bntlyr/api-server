import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateItemPictureInput,
  ItemPictureFilterInput,
  PaginationInput,
  UpdateItemPictureInput,
  ItemPictureConnection,
  ItemPicturePayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateItemPictureInput, validateUpdateItemPictureInput } from "./helpers/item-picture.helper.js";

import { ItemPictureLoader } from "./item-picture.loader.js";

@Injectable()
export class ItemPictureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemPictureLoader: ItemPictureLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemPictureLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemPictureFilterInput | null,
  ): Promise<ItemPictureConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["title", "filename", "filepath"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemPicture.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemPicture.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemPictureConnection;
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
      } as unknown as ItemPictureConnection;
    }
  }

  async create(input: CreateItemPictureInput, context?: any): Promise<ItemPicturePayload> {
    const validationError = validateCreateItemPictureInput(input);
    if (validationError) {
      return {
        itemPicture: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const itemPicture = await this.prisma.itemPicture.create({
        data: {
          title: input.title,
          filename: input.filename,
          filepath: input.filepath,
          itemId: input.itemId,
          processId: input.processId ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMPICTURE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemPicture",
        recordId: String(itemPicture.id),
        description: "Created ItemPicture record",
        values: itemPicture as any,
        ipAddress,
        userAgent,
      });

      return {
        itemPicture: itemPicture as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemPicture: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemPictureInput,
    context?: any,
  ): Promise<ItemPicturePayload> {
    const validationError = validateUpdateItemPictureInput(input);
    if (validationError) {
      return {
        itemPicture: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemPicture = await this.prisma.itemPicture.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.filename ? { filename: input.filename } : {}),
          ...(input.filepath ? { filepath: input.filepath } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.processId !== undefined ? { processId: input.processId ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.itemPictureLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMPICTURE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemPicture",
        recordId: String(parsedId),
        description: "Updated ItemPicture record",
        values: itemPicture as any,
        ipAddress,
        userAgent,
      });

      return {
        itemPicture: itemPicture as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemPicture: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemPicturePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemPicture = await this.prisma.itemPicture.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemPictureLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMPICTURE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemPicture",
        recordId: String(parsedId),
        description: "Deleted ItemPicture record",
        ipAddress,
        userAgent,
      });

      return {
        itemPicture: itemPicture as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemPicture: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemPicturePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemPicture = await this.prisma.itemPicture.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemPictureLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMPICTURE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemPicture",
        recordId: String(parsedId),
        description: "Restored ItemPicture record",
        ipAddress,
        userAgent,
      });

      return {
        itemPicture: itemPicture as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemPicture: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
