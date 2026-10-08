import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateProcessMachiningInput,
  ProcessMachiningFilterInput,
  PaginationInput,
  UpdateProcessMachiningInput,
  ProcessMachiningConnection,
  ProcessMachiningPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateProcessMachiningInput, validateUpdateProcessMachiningInput } from "./helpers/process-machining.helper.js";

import { ProcessMachiningLoader } from "./process-machining.loader.js";

@Injectable()
export class ProcessMachiningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processMachiningLoader: ProcessMachiningLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.processMachiningLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ProcessMachiningFilterInput | null,
  ): Promise<ProcessMachiningConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, []);

      const [items, totalCount] = await Promise.all([
        this.prisma.processMachining.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.processMachining.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ProcessMachiningConnection;
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
      } as unknown as ProcessMachiningConnection;
    }
  }

  async create(input: CreateProcessMachiningInput, context?: any): Promise<ProcessMachiningPayload> {
    const validationError = validateCreateProcessMachiningInput(input);
    if (validationError) {
      return {
        processMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const processMachining = await this.prisma.processMachining.create({
        data: {
          processId: input.processId,
          machineId: input.machineId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PROCESSMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessMachining",
        recordId: String(processMachining.id),
        description: "Created ProcessMachining record",
        values: processMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        processMachining: processMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateProcessMachiningInput,
    context?: any,
  ): Promise<ProcessMachiningPayload> {
    const validationError = validateUpdateProcessMachiningInput(input);
    if (validationError) {
      return {
        processMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const processMachining = await this.prisma.processMachining.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.processId ? { processId: input.processId } : {}),
          ...(input.machineId ? { machineId: input.machineId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.processMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PROCESSMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessMachining",
        recordId: String(parsedId),
        description: "Updated ProcessMachining record",
        values: processMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        processMachining: processMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ProcessMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const processMachining = await this.prisma.processMachining.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.processMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PROCESSMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessMachining",
        recordId: String(parsedId),
        description: "Deleted ProcessMachining record",
        ipAddress,
        userAgent,
      });

      return {
        processMachining: processMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ProcessMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const processMachining = await this.prisma.processMachining.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.processMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PROCESSMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "ProcessMachining",
        recordId: String(parsedId),
        description: "Restored ProcessMachining record",
        ipAddress,
        userAgent,
      });

      return {
        processMachining: processMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        processMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
