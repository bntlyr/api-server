import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMachineTypeInput,
  MachineTypeFilterInput,
  PaginationInput,
  UpdateMachineTypeInput,
  MachineTypeConnection,
  MachineTypePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMachineTypeInput, validateUpdateMachineTypeInput } from "./helpers/machine-type.helper.js";

import { MachineTypeLoader } from "./machine-type.loader.js";

@Injectable()
export class MachineTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly machineTypeLoader: MachineTypeLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.machineTypeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MachineTypeFilterInput | null,
  ): Promise<MachineTypeConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.machineType.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.machineType.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MachineTypeConnection;
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
      } as unknown as MachineTypeConnection;
    }
  }

  async create(input: CreateMachineTypeInput, context?: any): Promise<MachineTypePayload> {
    const validationError = validateCreateMachineTypeInput(input);
    if (validationError) {
      return {
        machineType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const machineType = await this.prisma.machineType.create({
        data: {
          name: input.name,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MACHINETYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineType",
        recordId: String(machineType.id),
        description: "Created MachineType record",
        values: machineType as any,
        ipAddress,
        userAgent,
      });

      return {
        machineType: machineType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMachineTypeInput,
    context?: any,
  ): Promise<MachineTypePayload> {
    const validationError = validateUpdateMachineTypeInput(input);
    if (validationError) {
      return {
        machineType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machineType = await this.prisma.machineType.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.machineTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MACHINETYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineType",
        recordId: String(parsedId),
        description: "Updated MachineType record",
        values: machineType as any,
        ipAddress,
        userAgent,
      });

      return {
        machineType: machineType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MachineTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machineType = await this.prisma.machineType.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.machineTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MACHINETYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineType",
        recordId: String(parsedId),
        description: "Deleted MachineType record",
        ipAddress,
        userAgent,
      });

      return {
        machineType: machineType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MachineTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machineType = await this.prisma.machineType.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.machineTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MACHINETYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MachineType",
        recordId: String(parsedId),
        description: "Restored MachineType record",
        ipAddress,
        userAgent,
      });

      return {
        machineType: machineType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machineType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
