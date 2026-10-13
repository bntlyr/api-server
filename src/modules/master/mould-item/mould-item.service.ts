import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMouldItemInput,
  MouldItemFilterInput,
  PaginationInput,
  UpdateMouldItemInput,
  MouldItemConnection,
  MouldItemPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMouldItemInput, validateUpdateMouldItemInput } from "./helpers/mould-item.helper.js";

import { MouldItemLoader } from "./mould-item.loader.js";

@Injectable()
export class MouldItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mouldItemLoader: MouldItemLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.mouldItemLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MouldItemFilterInput | null,
    context?: any,
  ): Promise<MouldItemConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, []);

      const [items, totalCount] = await Promise.all([
        this.prisma.mouldItem.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.mouldItem.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MouldItemConnection;
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
      } as unknown as MouldItemConnection;
    }
  }

  async create(input: CreateMouldItemInput, context?: any): Promise<MouldItemPayload> {
    const validationError = validateCreateMouldItemInput(input);
    if (validationError) {
      return {
        mouldItem: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const mouldItem = await this.prisma.mouldItem.create({
        data: {
          mouldId: input.mouldId,
          itemId: input.itemId,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MOULDITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldItem",
        recordId: String(mouldItem.id),
        description: "Created MouldItem record",
        values: mouldItem as any,
        ipAddress,
        userAgent,
      });

      return {
        mouldItem: mouldItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMouldItemInput,
    context?: any,
  ): Promise<MouldItemPayload> {
    const validationError = validateUpdateMouldItemInput(input);
    if (validationError) {
      return {
        mouldItem: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mouldItem = await this.prisma.mouldItem.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.mouldId ? { mouldId: input.mouldId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.mouldItemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MOULDITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldItem",
        recordId: String(parsedId),
        description: "Updated MouldItem record",
        values: mouldItem as any,
        ipAddress,
        userAgent,
      });

      return {
        mouldItem: mouldItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MouldItemPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mouldItem = await this.prisma.mouldItem.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.mouldItemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MOULDITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldItem",
        recordId: String(parsedId),
        description: "Deleted MouldItem record",
        ipAddress,
        userAgent,
      });

      return {
        mouldItem: mouldItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MouldItemPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mouldItem = await this.prisma.mouldItem.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.mouldItemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MOULDITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldItem",
        recordId: String(parsedId),
        description: "Restored MouldItem record",
        ipAddress,
        userAgent,
      });

      return {
        mouldItem: mouldItem as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldItem: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
