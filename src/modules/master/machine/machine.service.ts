import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMachineInput,
  MachineFilterInput,
  PaginationInput,
  UpdateMachineInput,
  MachineConnection,
  MachinePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMachineInput, validateUpdateMachineInput } from "./helpers/machine.helper.js";

import { MachineLoader } from "./machine.loader.js";

@Injectable()
export class MachineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly machineLoader: MachineLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.machineLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MachineFilterInput | null,
    context?: any,
  ): Promise<MachineConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "brand", "specificName"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.machine.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.machine.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MachineConnection;
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
      } as unknown as MachineConnection;
    }
  }

  async create(input: CreateMachineInput, context?: any): Promise<MachinePayload> {
    const validationError = validateCreateMachineInput(input);
    if (validationError) {
      return {
        machine: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const machine = await this.prisma.$transaction(async (tx) => {
        const created = await tx.machine.create({
          data: {
            name: input.name,
            brand: input.brand,
            specificName: input.specificName,
            rotary: input.rotary,
            numberOfTools: input.numberOfTools,
            machineTypeId: input.machineTypeId,
            sectionId: input.sectionId,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        if (input.toolIds && input.toolIds.length > 0) {
          await tx.machineTool.createMany({
            data: input.toolIds.map((toolId) => ({
              machineId: created.id,
              toolId,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
            skipDuplicates: true,
          });
        }

        return created;
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MACHINE",
        method: "GRAPHQL_MUTATION",
        tableName: "Machine",
        recordId: String(machine.id),
        description: "Created Machine record",
        values: machine as any,
        ipAddress,
        userAgent,
      });

      return {
        machine: machine as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machine: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMachineInput,
    context?: any,
  ): Promise<MachinePayload> {
    const validationError = validateUpdateMachineInput(input);
    if (validationError) {
      return {
        machine: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const machine = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.machine.update({
          where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
          data: {
            ...(input.name != null ? { name: input.name } : {}),
            ...(input.brand != null ? { brand: input.brand } : {}),
            ...(input.specificName != null ? { specificName: input.specificName } : {}),
            ...(input.rotary != null ? { rotary: input.rotary } : {}),
            ...(input.numberOfTools != null ? { numberOfTools: input.numberOfTools } : {}),
            ...(input.machineTypeId != null ? { machineTypeId: input.machineTypeId } : {}),
            ...(input.sectionId != null ? { sectionId: input.sectionId } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.toolIds !== undefined) {
          await tx.machineTool.deleteMany({
            where: { machineId: updated.id },
          });
          if (input.toolIds && input.toolIds.length > 0) {
            await tx.machineTool.createMany({
              data: input.toolIds.map((toolId) => ({
                machineId: updated.id,
                toolId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        return updated;
      });

      this.machineLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MACHINE",
        method: "GRAPHQL_MUTATION",
        tableName: "Machine",
        recordId: String(parsedId),
        description: "Updated Machine record",
        values: machine as any,
        ipAddress,
        userAgent,
      });

      return {
        machine: machine as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machine: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MachinePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machine = await this.prisma.machine.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.machineLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MACHINE",
        method: "GRAPHQL_MUTATION",
        tableName: "Machine",
        recordId: String(parsedId),
        description: "Deleted Machine record",
        ipAddress,
        userAgent,
      });

      return {
        machine: machine as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machine: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MachinePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const machine = await this.prisma.machine.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.machineLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MACHINE",
        method: "GRAPHQL_MUTATION",
        tableName: "Machine",
        recordId: String(parsedId),
        description: "Restored Machine record",
        ipAddress,
        userAgent,
      });

      return {
        machine: machine as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        machine: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
