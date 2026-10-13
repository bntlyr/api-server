import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateStatusCodeInput,
  StatusCodeFilterInput,
  PaginationInput,
  UpdateStatusCodeInput,
  StatusCodeConnection,
  StatusCodePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateStatusCodeInput, validateUpdateStatusCodeInput } from "./helpers/status-code.helper.js";

import { StatusCodeLoader } from "./status-code.loader.js";

@Injectable()
export class StatusCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusCodeLoader: StatusCodeLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.statusCodeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: StatusCodeFilterInput | null,
    context?: any,
  ): Promise<StatusCodeConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["title", "content"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.statusCode.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.statusCode.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as StatusCodeConnection;
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
      } as unknown as StatusCodeConnection;
    }
  }

  async create(input: CreateStatusCodeInput, context?: any): Promise<StatusCodePayload> {
    const validationError = validateCreateStatusCodeInput(input);
    if (validationError) {
      return {
        statusCode: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const statusCode = await this.prisma.statusCode.create({
        data: {
          title: input.title,
          content: input.content ?? null,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_STATUSCODE",
        method: "GRAPHQL_MUTATION",
        tableName: "StatusCode",
        recordId: String(statusCode.id),
        description: "Created StatusCode record",
        values: statusCode as any,
        ipAddress,
        userAgent,
      });

      return {
        statusCode: statusCode as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        statusCode: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateStatusCodeInput,
    context?: any,
  ): Promise<StatusCodePayload> {
    const validationError = validateUpdateStatusCodeInput(input);
    if (validationError) {
      return {
        statusCode: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const statusCode = await this.prisma.statusCode.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.content !== undefined ? { content: input.content ?? null } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.statusCodeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_STATUSCODE",
        method: "GRAPHQL_MUTATION",
        tableName: "StatusCode",
        recordId: String(parsedId),
        description: "Updated StatusCode record",
        values: statusCode as any,
        ipAddress,
        userAgent,
      });

      return {
        statusCode: statusCode as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        statusCode: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<StatusCodePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const statusCode = await this.prisma.statusCode.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.statusCodeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_STATUSCODE",
        method: "GRAPHQL_MUTATION",
        tableName: "StatusCode",
        recordId: String(parsedId),
        description: "Deleted StatusCode record",
        ipAddress,
        userAgent,
      });

      return {
        statusCode: statusCode as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        statusCode: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<StatusCodePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const statusCode = await this.prisma.statusCode.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.statusCodeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_STATUSCODE",
        method: "GRAPHQL_MUTATION",
        tableName: "StatusCode",
        recordId: String(parsedId),
        description: "Restored StatusCode record",
        ipAddress,
        userAgent,
      });

      return {
        statusCode: statusCode as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        statusCode: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
