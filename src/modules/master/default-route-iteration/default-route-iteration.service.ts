import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateDefaultRouteIterationInput,
  DefaultRouteIterationFilterInput,
  PaginationInput,
  UpdateDefaultRouteIterationInput,
  DefaultRouteIterationConnection,
  DefaultRouteIterationPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateDefaultRouteIterationInput, validateUpdateDefaultRouteIterationInput } from "./helpers/default-route-iteration.helper.js";

import { DefaultRouteIterationLoader } from "./default-route-iteration.loader.js";

@Injectable()
export class DefaultRouteIterationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteIterationLoader: DefaultRouteIterationLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.defaultRouteIterationLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: DefaultRouteIterationFilterInput | null,
    context?: any,
  ): Promise<DefaultRouteIterationConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["subname"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.defaultRouteIteration.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.defaultRouteIteration.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as DefaultRouteIterationConnection;
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
      } as unknown as DefaultRouteIterationConnection;
    }
  }

  async create(input: CreateDefaultRouteIterationInput, context?: any): Promise<DefaultRouteIterationPayload> {
    const validationError = validateCreateDefaultRouteIterationInput(input);
    if (validationError) {
      return {
        defaultRouteIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const count = await this.prisma.defaultRouteIteration.count({
        where: { defaultRouteStepId: input.defaultRouteStepId },
      });

      if (count >= 10) {
        return {
          defaultRouteIteration: null,
          userErrors: [createError("A route step can have a maximum of 10 iterations", "defaultRouteStepId", "LIMIT_EXCEEDED")],
        };
      }

      const defaultRouteIteration = await this.prisma.defaultRouteIteration.create({
        data: {
          subname: input.subname,
          defaultRouteStepId: input.defaultRouteStepId,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.prisma.defaultRouteStep.update({
        where: { id: input.defaultRouteStepId },
        data: { numberOfIterations: { increment: 1 } },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_DEFAULTROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteIteration",
        recordId: String(defaultRouteIteration.id),
        description: "Created DefaultRouteIteration record",
        values: defaultRouteIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteIteration: defaultRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateDefaultRouteIterationInput,
    context?: any,
  ): Promise<DefaultRouteIterationPayload> {
    const validationError = validateUpdateDefaultRouteIterationInput(input);
    if (validationError) {
      return {
        defaultRouteIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteIteration = await this.prisma.defaultRouteIteration.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.subname ? { subname: input.subname } : {}),
          ...(input.defaultRouteStepId ? { defaultRouteStepId: input.defaultRouteStepId } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.defaultRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_DEFAULTROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteIteration",
        recordId: String(parsedId),
        description: "Updated DefaultRouteIteration record",
        values: defaultRouteIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteIteration: defaultRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<DefaultRouteIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteIteration = await this.prisma.defaultRouteIteration.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.defaultRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      if (defaultRouteIteration.defaultRouteStepId) {
        await this.prisma.defaultRouteStep.update({
          where: { id: defaultRouteIteration.defaultRouteStepId },
          data: { numberOfIterations: { decrement: 1 } },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_DEFAULTROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteIteration",
        recordId: String(parsedId),
        description: "Deleted DefaultRouteIteration record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteIteration: defaultRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<DefaultRouteIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteIteration = await this.prisma.defaultRouteIteration.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.defaultRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      if (defaultRouteIteration.defaultRouteStepId) {
        await this.prisma.defaultRouteStep.update({
          where: { id: defaultRouteIteration.defaultRouteStepId },
          data: { numberOfIterations: { increment: 1 } },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_DEFAULTROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteIteration",
        recordId: String(parsedId),
        description: "Restored DefaultRouteIteration record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteIteration: defaultRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
