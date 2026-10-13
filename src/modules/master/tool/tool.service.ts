import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateToolInput,
  ToolFilterInput,
  PaginationInput,
  UpdateToolInput,
  ToolConnection,
  ToolPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateToolInput, validateUpdateToolInput } from "./helpers/tool.helper.js";

import { ToolLoader } from "./tool.loader.js";

@Injectable()
export class ToolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toolLoader: ToolLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.toolLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ToolFilterInput | null,
    context?: any,
  ): Promise<ToolConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.tool.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.tool.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ToolConnection;
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
      } as unknown as ToolConnection;
    }
  }

  async create(input: CreateToolInput, context?: any): Promise<ToolPayload> {
    const validationError = validateCreateToolInput(input);
    if (validationError) {
      return {
        tool: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const tool = await this.prisma.tool.create({
        data: {
          name: input.name,
          code: input.code,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_TOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "Tool",
        recordId: String(tool.id),
        description: "Created Tool record",
        values: tool as any,
        ipAddress,
        userAgent,
      });

      return {
        tool: tool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        tool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateToolInput,
    context?: any,
  ): Promise<ToolPayload> {
    const validationError = validateUpdateToolInput(input);
    if (validationError) {
      return {
        tool: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const tool = await this.prisma.tool.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.toolLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_TOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "Tool",
        recordId: String(parsedId),
        description: "Updated Tool record",
        values: tool as any,
        ipAddress,
        userAgent,
      });

      return {
        tool: tool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        tool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ToolPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const tool = await this.prisma.tool.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.toolLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_TOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "Tool",
        recordId: String(parsedId),
        description: "Deleted Tool record",
        ipAddress,
        userAgent,
      });

      return {
        tool: tool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        tool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ToolPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const tool = await this.prisma.tool.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.toolLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_TOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "Tool",
        recordId: String(parsedId),
        description: "Restored Tool record",
        ipAddress,
        userAgent,
      });

      return {
        tool: tool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        tool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
