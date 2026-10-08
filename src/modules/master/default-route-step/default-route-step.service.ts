import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateDefaultRouteStepInput,
  DefaultRouteStepFilterInput,
  PaginationInput,
  UpdateDefaultRouteStepInput,
  DefaultRouteStepConnection,
  DefaultRouteStepPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateDefaultRouteStepInput, validateUpdateDefaultRouteStepInput } from "./helpers/default-route-step.helper.js";

import { DefaultRouteStepLoader } from "./default-route-step.loader.js";

@Injectable()
export class DefaultRouteStepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteStepLoader: DefaultRouteStepLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.defaultRouteStepLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: DefaultRouteStepFilterInput | null,
  ): Promise<DefaultRouteStepConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["sequenceNumber", "name", "subname", "durationType", "leadTimeUnit", "prepTimeUnit", "cureTimeUnit"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.defaultRouteStep.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.defaultRouteStep.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as DefaultRouteStepConnection;
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
      } as unknown as DefaultRouteStepConnection;
    }
  }

  async create(input: CreateDefaultRouteStepInput, context?: any): Promise<DefaultRouteStepPayload> {
    const validationError = validateCreateDefaultRouteStepInput(input);
    if (validationError) {
      return {
        defaultRouteStep: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const defaultRouteStep = await this.prisma.$transaction(async (tx) => {
        const created = await tx.defaultRouteStep.create({
          data: {
            sequenceNumber: input.sequenceNumber,
            name: input.name,
            ...(input.subname ? { subname: input.subname } : {}),
            ...(input.isParent ? { isParent: input.isParent } : {}),
            processId: input.processId ?? null,
            sectionId: input.sectionId ?? null,
            numberOfIterations: input.numberOfIterations ?? (input.iterations?.length ? Math.min(input.iterations.length, 10) : 0),
            hasMachining: input.hasMachining ?? (Boolean(input.machineIds && input.machineIds.length > 0)),
            hasIterating: input.hasIterating ?? (Boolean(input.iterations && input.iterations.length > 0)),
            ...(input.hasChecking ? { hasChecking: input.hasChecking } : {}),
            ...(input.hasRework ? { hasRework: input.hasRework } : {}),
            ...(input.hasPacking ? { hasPacking: input.hasPacking } : {}),
            ...(input.hasTooling ? { hasTooling: input.hasTooling } : {}),
            ...(input.hasActualParameter ? { hasActualParameter: input.hasActualParameter } : {}),
            ...(input.durationType ? { durationType: input.durationType } : {}),
            ...(input.leadTime ? { leadTime: input.leadTime } : {}),
            ...(input.leadTimeUnit ? { leadTimeUnit: input.leadTimeUnit } : {}),
            prepTime: input.prepTime ?? null,
            prepTimeUnit: input.prepTimeUnit ?? null,
            cureTime: input.cureTime ?? null,
            cureTimeUnit: input.cureTimeUnit ?? null,
            defaultRouteId: input.defaultRouteId,
            createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            ...(input.deleted ? { deleted: input.deleted } : {}),
            deletedBy: input.deletedBy ?? null,
          },
        });

        if (input.machineIds && input.machineIds.length > 0) {
          await tx.defaultRouteMachining.createMany({
            data: input.machineIds.map((machineId) => ({
              defaultRouteStepId: created.id,
              machineId,
              createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
              updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            })),
            skipDuplicates: true,
          });
        }

        if (input.iterations && input.iterations.length > 0) {
          const iterationItems = input.iterations.slice(0, 10);
          await tx.defaultRouteIteration.createMany({
            data: iterationItems.map((subname) => ({
              defaultRouteStepId: created.id,
              subname,
              createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
              updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            })),
          });
        }

        return created;
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_DEFAULTROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteStep",
        recordId: String(defaultRouteStep.id),
        description: "Created DefaultRouteStep record",
        values: defaultRouteStep as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteStep: defaultRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateDefaultRouteStepInput,
    context?: any,
  ): Promise<DefaultRouteStepPayload> {
    const validationError = validateUpdateDefaultRouteStepInput(input);
    if (validationError) {
      return {
        defaultRouteStep: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const defaultRouteStep = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.defaultRouteStep.update({
          where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
          data: {
            ...(input.sequenceNumber ? { sequenceNumber: input.sequenceNumber } : {}),
            ...(input.name ? { name: input.name } : {}),
            ...(input.subname ? { subname: input.subname } : {}),
            ...(input.isParent != null ? { isParent: input.isParent } : {}),
            ...(input.processId !== undefined ? { processId: input.processId ?? null } : {}),
            ...(input.sectionId !== undefined ? { sectionId: input.sectionId ?? null } : {}),
            ...(input.numberOfIterations != null ? { numberOfIterations: input.numberOfIterations } : input.iterations != null ? { numberOfIterations: Math.min(input.iterations.length, 10) } : {}),
            ...(input.hasMachining != null ? { hasMachining: input.hasMachining } : input.machineIds != null ? { hasMachining: input.machineIds.length > 0 } : {}),
            ...(input.hasIterating != null ? { hasIterating: input.hasIterating } : input.iterations != null ? { hasIterating: input.iterations.length > 0 } : {}),
            ...(input.hasChecking != null ? { hasChecking: input.hasChecking } : {}),
            ...(input.hasRework != null ? { hasRework: input.hasRework } : {}),
            ...(input.hasPacking != null ? { hasPacking: input.hasPacking } : {}),
            ...(input.hasTooling != null ? { hasTooling: input.hasTooling } : {}),
            ...(input.hasActualParameter != null ? { hasActualParameter: input.hasActualParameter } : {}),
            ...(input.durationType ? { durationType: input.durationType } : {}),
            ...(input.leadTime ? { leadTime: input.leadTime } : {}),
            ...(input.leadTimeUnit ? { leadTimeUnit: input.leadTimeUnit } : {}),
            ...(input.prepTime !== undefined ? { prepTime: input.prepTime ?? null } : {}),
            ...(input.prepTimeUnit !== undefined ? { prepTimeUnit: input.prepTimeUnit ?? null } : {}),
            ...(input.cureTime !== undefined ? { cureTime: input.cureTime ?? null } : {}),
            ...(input.cureTimeUnit !== undefined ? { cureTimeUnit: input.cureTimeUnit ?? null } : {}),
            ...(input.defaultRouteId ? { defaultRouteId: input.defaultRouteId } : {}),
            ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
            ...(input.deleted != null ? { deleted: input.deleted } : {}),
            ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
          },
        });

        if (input.machineIds !== undefined) {
          await tx.defaultRouteMachining.deleteMany({
            where: { defaultRouteStepId: updated.id },
          });
          if (input.machineIds && input.machineIds.length > 0) {
            await tx.defaultRouteMachining.createMany({
              data: input.machineIds.map((machineId) => ({
                defaultRouteStepId: updated.id,
                machineId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (input.iterations !== undefined) {
          await tx.defaultRouteIteration.deleteMany({
            where: { defaultRouteStepId: updated.id },
          });
          if (input.iterations && input.iterations.length > 0) {
            const iterationItems = input.iterations.slice(0, 10);
            await tx.defaultRouteIteration.createMany({
              data: iterationItems.map((subname) => ({
                defaultRouteStepId: updated.id,
                subname,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
            });
          }
        }

        return updated;
      });

      this.defaultRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_DEFAULTROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteStep",
        recordId: String(parsedId),
        description: "Updated DefaultRouteStep record",
        values: defaultRouteStep as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteStep: defaultRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<DefaultRouteStepPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteStep = await this.prisma.defaultRouteStep.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.defaultRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_DEFAULTROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteStep",
        recordId: String(parsedId),
        description: "Deleted DefaultRouteStep record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteStep: defaultRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<DefaultRouteStepPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRouteStep = await this.prisma.defaultRouteStep.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.defaultRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_DEFAULTROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRouteStep",
        recordId: String(parsedId),
        description: "Restored DefaultRouteStep record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRouteStep: defaultRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
