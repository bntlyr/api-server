import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateDefaultRouteParameterInput,
  DefaultRouteParameterFilterInput,
  PaginationInput,
  UpdateDefaultRouteParameterInput,
  DefaultRouteParameterConnection,
  DefaultRouteParameterPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateDefaultRouteParameterInput, validateUpdateDefaultRouteParameterInput } from "./helpers/default-route-parameter.helper.js";

import { DefaultRouteParameterLoader } from "./default-route-parameter.loader.js";

@Injectable()
export class DefaultRouteParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteParameterLoader: DefaultRouteParameterLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.defaultRouteParameterLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: DefaultRouteParameterFilterInput | null,
  ): Promise<DefaultRouteParameterConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "inputType", "paramValue"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.defaultRouteParameter.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.defaultRouteParameter.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as DefaultRouteParameterConnection;
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
      } as unknown as DefaultRouteParameterConnection;
    }
  }

  async create(input: CreateDefaultRouteParameterInput, context?: any): Promise<DefaultRouteParameterPayload> {
    const validationError = validateCreateDefaultRouteParameterInput(input);
    if (validationError) {
      return {
        defaultRouteParameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const defaultRouteParameter = await this.prisma.defaultRouteParameter.create({
        data: {
          name: input.name,
          ...(input.inputType ? { inputType: input.inputType } : {}),
          paramValue: input.paramValue ?? null,
          defaultRouteStepId: input.defaultRouteStepId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_DEFAULTROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteParameter",
        recordId: String(defaultRouteParameter.id),
        description: "Created DefaultRouteParameter record",
        values: defaultRouteParameter as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteParameter: defaultRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateDefaultRouteParameterInput,
    context?: any,
  ): Promise<DefaultRouteParameterPayload> {
    const validationError = validateUpdateDefaultRouteParameterInput(input);
    if (validationError) {
      return {
        defaultRouteParameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteParameter = await this.prisma.defaultRouteParameter.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.inputType ? { inputType: input.inputType } : {}),
          ...(input.paramValue !== undefined ? { paramValue: input.paramValue ?? null } : {}),
          ...(input.defaultRouteStepId ? { defaultRouteStepId: input.defaultRouteStepId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.defaultRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_DEFAULTROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteParameter",
        recordId: String(parsedId),
        description: "Updated DefaultRouteParameter record",
        values: defaultRouteParameter as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteParameter: defaultRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<DefaultRouteParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteParameter = await this.prisma.defaultRouteParameter.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.defaultRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_DEFAULTROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteParameter",
        recordId: String(parsedId),
        description: "Deleted DefaultRouteParameter record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteParameter: defaultRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<DefaultRouteParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteParameter = await this.prisma.defaultRouteParameter.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.defaultRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_DEFAULTROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteParameter",
        recordId: String(parsedId),
        description: "Restored DefaultRouteParameter record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteParameter: defaultRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
