import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateProcessInput,
  ProcessFilterInput,
  PaginationInput,
  UpdateProcessInput,
  ProcessConnection,
  ProcessPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateProcessInput, validateUpdateProcessInput } from "./helpers/process.helper.js";

import { Prisma } from "../../../generated//prisma/client.js";
import { ProcessLoader } from "./process.loader.js";

function parseJsonInput(val: string | null | undefined): any {
  if (val === undefined) return undefined;
  if (val === null) return Prisma.DbNull;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function normalizeProcessRecord<T extends Record<string, any> | null | undefined>(row: T): T {
  if (!row) return row;
  return {
    ...row,
    itemTypeInclusion:
      row.itemTypeInclusion == null
        ? null
        : typeof row.itemTypeInclusion === "string"
          ? row.itemTypeInclusion
          : JSON.stringify(row.itemTypeInclusion),
    itemTypeExclusion:
      row.itemTypeExclusion == null
        ? null
        : typeof row.itemTypeExclusion === "string"
          ? row.itemTypeExclusion
          : JSON.stringify(row.itemTypeExclusion),
  };
}

@Injectable()
export class ProcessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processLoader: ProcessLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const row = await this.processLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
    return normalizeProcessRecord(row);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ProcessFilterInput | null,
    context?: any,
  ): Promise<ProcessConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "durationType", "leadTimeUnit", "prepTimeUnit", "cureTimeUnit"]);

      const [rawItems, totalCount] = await Promise.all([
        this.prisma.process.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.process.count({ where }),
      ]);

      const items = rawItems.map((item) => normalizeProcessRecord(item));

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ProcessConnection;
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
      } as unknown as ProcessConnection;
    }
  }

  async create(input: CreateProcessInput, context?: any): Promise<ProcessPayload> {
    const validationError = validateCreateProcessInput(input);
    if (validationError) {
      return {
        process: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const process = await this.prisma.$transaction(async (tx) => {
        const created = await tx.process.create({
          data: {
            name: input.name,
            itemTypeInclusion: parseJsonInput(input.itemTypeInclusion),
            itemTypeExclusion: parseJsonInput(input.itemTypeExclusion),
            numberOfIterations: input.numberOfIterations ?? (input.iterations?.length ? Math.min(input.iterations.length, 10) : 0),
            hasMachining: input.hasMachining ?? (Boolean(input.machineIds && input.machineIds.length > 0)),
            hasIterating: input.hasIterating ?? (Boolean(input.iterations && input.iterations.length > 0)),
            ...(input.hasChecking != null ? { hasChecking: input.hasChecking } : {}),
            ...(input.hasRework != null ? { hasRework: input.hasRework } : {}),
            ...(input.hasPacking != null ? { hasPacking: input.hasPacking } : {}),
            ...(input.hasTooling != null ? { hasTooling: input.hasTooling } : {}),
            ...(input.hasActualParameter != null ? { hasActualParameter: input.hasActualParameter } : {}),
            ...(input.durationType ? { durationType: input.durationType } : {}),
            ...(input.leadTime != null ? { leadTime: input.leadTime } : {}),
            ...(input.leadTimeUnit ? { leadTimeUnit: input.leadTimeUnit } : {}),
            prepTime: input.prepTime ?? null,
            prepTimeUnit: input.prepTimeUnit ?? null,
            cureTime: input.cureTime ?? null,
            cureTimeUnit: input.cureTimeUnit ?? null,
            sectionId: input.sectionId ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        if (input.machineIds && input.machineIds.length > 0) {
          await tx.processMachining.createMany({
            data: input.machineIds.map((machineId) => ({
              processId: created.id,
              machineId,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
            skipDuplicates: true,
          });
        }

        if (input.iterations && input.iterations.length > 0) {
          const iterationItems = input.iterations.slice(0, 10);
          await tx.processIteration.createMany({
            data: iterationItems.map((subname) => ({
              processId: created.id,
              subname,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
          });
        }

        if (input.parameters && input.parameters.length > 0) {
          await tx.parameter.createMany({
            data: input.parameters.map((p) => ({
              processId: created.id,
              name: p.name,
              inputType: p.inputType,
              paramValue: p.paramValue ?? null,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
          });
        }

        return normalizeProcessRecord(created);
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "Process",
        recordId: String(process.id),
        description: "Created Process record",
        values: process as any,
        ipAddress,
        userAgent,
      });

      return {
        process: process as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        process: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateProcessInput,
    context?: any,
  ): Promise<ProcessPayload> {
    const validationError = validateUpdateProcessInput(input);
    if (validationError) {
      return {
        process: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const process = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.process.update({
          where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
          data: {
            ...(input.name != null ? { name: input.name } : {}),
            ...(input.itemTypeInclusion !== undefined ? { itemTypeInclusion: parseJsonInput(input.itemTypeInclusion) } : {}),
            ...(input.itemTypeExclusion !== undefined ? { itemTypeExclusion: parseJsonInput(input.itemTypeExclusion) } : {}),
            ...(input.numberOfIterations != null ? { numberOfIterations: input.numberOfIterations } : input.iterations != null ? { numberOfIterations: Math.min(input.iterations.length, 10) } : {}),
            ...(input.hasMachining != null ? { hasMachining: input.hasMachining } : input.machineIds != null ? { hasMachining: input.machineIds.length > 0 } : {}),
            ...(input.hasIterating != null ? { hasIterating: input.hasIterating } : input.iterations != null ? { hasIterating: input.iterations.length > 0 } : {}),
            ...(input.hasChecking != null ? { hasChecking: input.hasChecking } : {}),
            ...(input.hasRework != null ? { hasRework: input.hasRework } : {}),
            ...(input.hasPacking != null ? { hasPacking: input.hasPacking } : {}),
            ...(input.hasTooling != null ? { hasTooling: input.hasTooling } : {}),
            ...(input.hasActualParameter != null ? { hasActualParameter: input.hasActualParameter } : {}),
            ...(input.durationType ? { durationType: input.durationType } : {}),
            ...(input.leadTime != null ? { leadTime: input.leadTime } : {}),
            ...(input.leadTimeUnit ? { leadTimeUnit: input.leadTimeUnit } : {}),
            ...(input.prepTime !== undefined ? { prepTime: input.prepTime ?? null } : {}),
            ...(input.prepTimeUnit !== undefined ? { prepTimeUnit: input.prepTimeUnit ?? null } : {}),
            ...(input.cureTime !== undefined ? { cureTime: input.cureTime ?? null } : {}),
            ...(input.cureTimeUnit !== undefined ? { cureTimeUnit: input.cureTimeUnit ?? null } : {}),
            ...(input.sectionId !== undefined ? { sectionId: input.sectionId ?? null } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.machineIds !== undefined) {
          await tx.processMachining.deleteMany({
            where: { processId: updated.id },
          });
          if (input.machineIds && input.machineIds.length > 0) {
            await tx.processMachining.createMany({
              data: input.machineIds.map((machineId) => ({
                processId: updated.id,
                machineId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (input.iterations !== undefined) {
          await tx.processIteration.deleteMany({
            where: { processId: updated.id },
          });
          if (input.iterations && input.iterations.length > 0) {
            const iterationItems = input.iterations.slice(0, 10);
            await tx.processIteration.createMany({
              data: iterationItems.map((subname) => ({
                processId: updated.id,
                subname,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
            });
          }
        }

        if (input.parameters !== undefined) {
          await tx.parameter.deleteMany({
            where: { processId: updated.id },
          });
          if (input.parameters && input.parameters.length > 0) {
            await tx.parameter.createMany({
              data: input.parameters.map((p) => ({
                processId: updated.id,
                name: p.name,
                inputType: p.inputType,
                paramValue: p.paramValue ?? null,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
            });
          }
        }

        return normalizeProcessRecord(updated);
      });

      this.processLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "Process",
        recordId: String(parsedId),
        description: "Updated Process record",
        values: process as any,
        ipAddress,
        userAgent,
      });

      return {
        process: process as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        process: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ProcessPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const process = await this.prisma.process.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.processLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "Process",
        recordId: String(parsedId),
        description: "Deleted Process record",
        ipAddress,
        userAgent,
      });

      return {
        process: process as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        process: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ProcessPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const process = await this.prisma.process.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.processLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PROCESS",
        method: "GRAPHQL_MUTATION",
        tableName: "Process",
        recordId: String(parsedId),
        description: "Restored Process record",
        ipAddress,
        userAgent,
      });

      return {
        process: process as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        process: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
