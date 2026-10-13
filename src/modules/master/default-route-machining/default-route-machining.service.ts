import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateDefaultRouteMachiningInput,
  DefaultRouteMachiningFilterInput,
  PaginationInput,
  UpdateDefaultRouteMachiningInput,
  DefaultRouteMachiningConnection,
  DefaultRouteMachiningPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateDefaultRouteMachiningInput, validateUpdateDefaultRouteMachiningInput } from "./helpers/default-route-machining.helper.js";

import { DefaultRouteMachiningLoader } from "./default-route-machining.loader.js";

@Injectable()
export class DefaultRouteMachiningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteMachiningLoader: DefaultRouteMachiningLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.defaultRouteMachiningLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: DefaultRouteMachiningFilterInput | null,
    context?: any,
  ): Promise<DefaultRouteMachiningConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, []);

      const [items, totalCount] = await Promise.all([
        this.prisma.defaultRouteMachining.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.defaultRouteMachining.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as DefaultRouteMachiningConnection;
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
      } as unknown as DefaultRouteMachiningConnection;
    }
  }

  async create(input: CreateDefaultRouteMachiningInput, context?: any): Promise<DefaultRouteMachiningPayload> {
    const validationError = validateCreateDefaultRouteMachiningInput(input);
    if (validationError) {
      return {
        defaultRouteMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const defaultRouteMachining = await this.prisma.defaultRouteMachining.create({
        data: {
          defaultRouteStepId: input.defaultRouteStepId,
          machineId: input.machineId,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_DEFAULTROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteMachining",
        recordId: String(defaultRouteMachining.id),
        description: "Created DefaultRouteMachining record",
        values: defaultRouteMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteMachining: defaultRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateDefaultRouteMachiningInput,
    context?: any,
  ): Promise<DefaultRouteMachiningPayload> {
    const validationError = validateUpdateDefaultRouteMachiningInput(input);
    if (validationError) {
      return {
        defaultRouteMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteMachining = await this.prisma.defaultRouteMachining.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.defaultRouteStepId ? { defaultRouteStepId: input.defaultRouteStepId } : {}),
          ...(input.machineId ? { machineId: input.machineId } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.defaultRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_DEFAULTROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteMachining",
        recordId: String(parsedId),
        description: "Updated DefaultRouteMachining record",
        values: defaultRouteMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteMachining: defaultRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<DefaultRouteMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteMachining = await this.prisma.defaultRouteMachining.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.defaultRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_DEFAULTROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteMachining",
        recordId: String(parsedId),
        description: "Deleted DefaultRouteMachining record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteMachining: defaultRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<DefaultRouteMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteMachining = await this.prisma.defaultRouteMachining.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.defaultRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_DEFAULTROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteMachining",
        recordId: String(parsedId),
        description: "Restored DefaultRouteMachining record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteMachining: defaultRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
