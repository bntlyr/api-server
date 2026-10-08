import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateParameterInput,
  ParameterFilterInput,
  PaginationInput,
  UpdateParameterInput,
  ParameterConnection,
  ParameterPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateParameterInput, validateUpdateParameterInput } from "./helpers/parameter.helper.js";

import { ParameterLoader } from "./parameter.loader.js";

@Injectable()
export class ParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parameterLoader: ParameterLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.parameterLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ParameterFilterInput | null,
  ): Promise<ParameterConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "inputType", "paramValue"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.parameter.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.parameter.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ParameterConnection;
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
      } as unknown as ParameterConnection;
    }
  }

  async create(input: CreateParameterInput, context?: any): Promise<ParameterPayload> {
    const validationError = validateCreateParameterInput(input);
    if (validationError) {
      return {
        parameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const parameter = await this.prisma.parameter.create({
        data: {
          name: input.name,
          ...(input.inputType ? { inputType: input.inputType } : {}),
          paramValue: input.paramValue ?? null,
          processId: input.processId ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "Parameter",
        recordId: String(parameter.id),
        description: "Created Parameter record",
        values: parameter as any,
        ipAddress,
        userAgent,
      });

      return {
        parameter: parameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        parameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateParameterInput,
    context?: any,
  ): Promise<ParameterPayload> {
    const validationError = validateUpdateParameterInput(input);
    if (validationError) {
      return {
        parameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const parameter = await this.prisma.parameter.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.inputType ? { inputType: input.inputType } : {}),
          ...(input.paramValue !== undefined ? { paramValue: input.paramValue ?? null } : {}),
          ...(input.processId !== undefined ? { processId: input.processId ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.parameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "Parameter",
        recordId: String(parsedId),
        description: "Updated Parameter record",
        values: parameter as any,
        ipAddress,
        userAgent,
      });

      return {
        parameter: parameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        parameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const parameter = await this.prisma.parameter.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.parameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "Parameter",
        recordId: String(parsedId),
        description: "Deleted Parameter record",
        ipAddress,
        userAgent,
      });

      return {
        parameter: parameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        parameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const parameter = await this.prisma.parameter.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.parameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "Parameter",
        recordId: String(parsedId),
        description: "Restored Parameter record",
        ipAddress,
        userAgent,
      });

      return {
        parameter: parameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        parameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
