import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateProcessIterationInput,
  ProcessIterationFilterInput,
  PaginationInput,
  UpdateProcessIterationInput,
  ProcessIterationConnection,
  ProcessIterationPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateProcessIterationInput, validateUpdateProcessIterationInput } from "./helpers/process-iteration.helper.js";

import { ProcessIterationLoader } from "./process-iteration.loader.js";

@Injectable()
export class ProcessIterationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processIterationLoader: ProcessIterationLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.processIterationLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ProcessIterationFilterInput | null,
  ): Promise<ProcessIterationConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["subname"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.processIteration.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.processIteration.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ProcessIterationConnection;
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
      } as unknown as ProcessIterationConnection;
    }
  }

  async create(input: CreateProcessIterationInput, context?: any): Promise<ProcessIterationPayload> {
    const validationError = validateCreateProcessIterationInput(input);
    if (validationError) {
      return {
        processIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const count = await this.prisma.processIteration.count({
        where: { processId: input.processId },
      });

      if (count >= 10) {
        return {
          processIteration: null,
          userErrors: [createError("A process can have a maximum of 10 iterations", "processId", "LIMIT_EXCEEDED")],
        };
      }

      const processIteration = await this.prisma.processIteration.create({
        data: {
          subname: input.subname,
          processId: input.processId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.prisma.process.update({
        where: { id: input.processId },
        data: { numberOfIterations: { increment: 1 } },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PROCESSITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessIteration",
        recordId: String(processIteration.id),
        description: "Created ProcessIteration record",
        values: processIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        processIteration: processIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateProcessIterationInput,
    context?: any,
  ): Promise<ProcessIterationPayload> {
    const validationError = validateUpdateProcessIterationInput(input);
    if (validationError) {
      return {
        processIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const processIteration = await this.prisma.processIteration.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.subname ? { subname: input.subname } : {}),
          ...(input.processId ? { processId: input.processId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.processIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PROCESSITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessIteration",
        recordId: String(parsedId),
        description: "Updated ProcessIteration record",
        values: processIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        processIteration: processIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ProcessIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const processIteration = await this.prisma.processIteration.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.processIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      if (processIteration.processId) {
        await this.prisma.process.update({
          where: { id: processIteration.processId },
          data: { numberOfIterations: { decrement: 1 } },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PROCESSITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessIteration",
        recordId: String(parsedId),
        description: "Deleted ProcessIteration record",
        ipAddress,
        userAgent,
      });

      return {
        processIteration: processIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ProcessIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const processIteration = await this.prisma.processIteration.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.processIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      if (processIteration.processId) {
        await this.prisma.process.update({
          where: { id: processIteration.processId },
          data: { numberOfIterations: { increment: 1 } },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PROCESSITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessIteration",
        recordId: String(parsedId),
        description: "Restored ProcessIteration record",
        ipAddress,
        userAgent,
      });

      return {
        processIteration: processIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
