import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMachineToolInput,
  MachineToolFilterInput,
  PaginationInput,
  UpdateMachineToolInput,
  MachineToolConnection,
  MachineToolPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMachineToolInput, validateUpdateMachineToolInput } from "./helpers/machine-tool.helper.js";

import { MachineToolLoader } from "./machine-tool.loader.js";

@Injectable()
export class MachineToolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly machineToolLoader: MachineToolLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.machineToolLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MachineToolFilterInput | null,
  ): Promise<MachineToolConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, []);

      const [items, totalCount] = await Promise.all([
        this.prisma.machineTool.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.machineTool.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MachineToolConnection;
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
      } as unknown as MachineToolConnection;
    }
  }

  async create(input: CreateMachineToolInput, context?: any): Promise<MachineToolPayload> {
    const validationError = validateCreateMachineToolInput(input);
    if (validationError) {
      return {
        machineTool: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const machineTool = await this.prisma.machineTool.create({
        data: {
          machineId: input.machineId,
          toolId: input.toolId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MACHINETOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineTool",
        recordId: String(machineTool.id),
        description: "Created MachineTool record",
        values: machineTool as any,
        ipAddress,
        userAgent,
      });

      return {
        machineTool: machineTool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineTool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMachineToolInput,
    context?: any,
  ): Promise<MachineToolPayload> {
    const validationError = validateUpdateMachineToolInput(input);
    if (validationError) {
      return {
        machineTool: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machineTool = await this.prisma.machineTool.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.machineId ? { machineId: input.machineId } : {}),
          ...(input.toolId ? { toolId: input.toolId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.machineToolLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MACHINETOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineTool",
        recordId: String(parsedId),
        description: "Updated MachineTool record",
        values: machineTool as any,
        ipAddress,
        userAgent,
      });

      return {
        machineTool: machineTool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineTool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MachineToolPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machineTool = await this.prisma.machineTool.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.machineToolLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MACHINETOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineTool",
        recordId: String(parsedId),
        description: "Deleted MachineTool record",
        ipAddress,
        userAgent,
      });

      return {
        machineTool: machineTool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineTool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MachineToolPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machineTool = await this.prisma.machineTool.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.machineToolLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MACHINETOOL",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineTool",
        recordId: String(parsedId),
        description: "Restored MachineTool record",
        ipAddress,
        userAgent,
      });

      return {
        machineTool: machineTool as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineTool: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
