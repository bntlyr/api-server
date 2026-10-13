import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateFabRouteStepInput,
  FabRouteStepFilterInput,
  PaginationInput,
  UpdateFabRouteStepInput,
  FabRouteStepConnection,
  FabRouteStepPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateFabRouteStepInput, validateUpdateFabRouteStepInput } from "./helpers/fab-route-step.helper.js";

import { FabRouteStepLoader } from "./fab-route-step.loader.js";

@Injectable()
export class FabRouteStepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.fabRouteStepLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: FabRouteStepFilterInput | null,
    context?: any,
  ): Promise<FabRouteStepConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["sequenceNumber", "name", "subname", "durationType", "leadTimeUnit", "prepTimeUnit", "cureTimeUnit"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.fabRouteStep.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.fabRouteStep.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as FabRouteStepConnection;
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
      } as unknown as FabRouteStepConnection;
    }
  }

  async create(input: CreateFabRouteStepInput, context?: any): Promise<FabRouteStepPayload> {
    const validationError = validateCreateFabRouteStepInput(input);
    if (validationError) {
      return {
        fabRouteStep: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const fabRouteStep = await this.prisma.$transaction(async (tx) => {
        const created = await tx.fabRouteStep.create({
          data: {
            sequenceNumber: input.sequenceNumber,
            name: input.name,
            ...(input.subname !== undefined ? { subname: input.subname ?? "" } : {}),
            ...(input.isParent != null ? { isParent: input.isParent } : {}),
            processId: input.processId ?? null,
            sectionId: input.sectionId ?? null,
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
            fabRouteId: input.fabRouteId,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        if (input.machineIds && input.machineIds.length > 0) {
          await tx.fabRouteMachining.createMany({
            data: input.machineIds.map((machineId) => ({
              fabRouteStepId: created.id,
              machineId,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
            skipDuplicates: true,
          });
        }

        if (input.iterations && input.iterations.length > 0) {
          const iterationItems = input.iterations.slice(0, 10);
          await tx.fabRouteIteration.createMany({
            data: iterationItems.map((subname) => ({
              fabRouteStepId: created.id,
              subname,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
          });
        }

        if (input.parameters && input.parameters.length > 0 && tx.fabRouteParameter) {
          await tx.fabRouteParameter.createMany({
            data: input.parameters.map((p) => ({
              fabRouteStepId: created.id,
              name: p.name,
              inputType: p.inputType || "Text",
              paramValue: p.paramValue ?? null,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
          });
        }

        const fabRoute = await tx.fabRoute.findUnique({
          where: { id: created.fabRouteId },
          include: { fabrication: { include: { item: { select: { ecnNo: true } } } } },
        });

        if (fabRoute?.fabrication) {
          await tx.itemRevision.create({
            data: {
              itemId: fabRoute.fabrication.itemId,
              ecnNo: fabRoute.fabrication.item.ecnNo ?? null,
              details: `Added step "${created.sequenceNumber} - ${created.name}" to fabrication route "${fabRoute.name}"`,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            },
          });
        }

        return created;
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_FABROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteStep",
        recordId: String(fabRouteStep.id),
        description: "Created FabRouteStep record",
        values: fabRouteStep as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteStep: fabRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateFabRouteStepInput,
    context?: any,
  ): Promise<FabRouteStepPayload> {
    const validationError = validateUpdateFabRouteStepInput(input);
    if (validationError) {
      return {
        fabRouteStep: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const fabRouteStep = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.fabRouteStep.update({
          where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
          data: {
            ...(input.sequenceNumber ? { sequenceNumber: input.sequenceNumber } : {}),
            ...(input.name ? { name: input.name } : {}),
            ...(input.subname !== undefined ? { subname: input.subname ?? "" } : {}),
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
            ...(input.leadTime != null ? { leadTime: input.leadTime } : {}),
            ...(input.leadTimeUnit ? { leadTimeUnit: input.leadTimeUnit } : {}),
            ...(input.prepTime !== undefined ? { prepTime: input.prepTime ?? null } : {}),
            ...(input.prepTimeUnit !== undefined ? { prepTimeUnit: input.prepTimeUnit ?? null } : {}),
            ...(input.cureTime !== undefined ? { cureTime: input.cureTime ?? null } : {}),
            ...(input.cureTimeUnit !== undefined ? { cureTimeUnit: input.cureTimeUnit ?? null } : {}),
            ...(input.fabRouteId ? { fabRouteId: input.fabRouteId } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.machineIds !== undefined) {
          await tx.fabRouteMachining.deleteMany({
            where: { fabRouteStepId: updated.id },
          });
          if (input.machineIds && input.machineIds.length > 0) {
            await tx.fabRouteMachining.createMany({
              data: input.machineIds.map((machineId) => ({
                fabRouteStepId: updated.id,
                machineId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (input.iterations !== undefined) {
          await tx.fabRouteIteration.deleteMany({
            where: { fabRouteStepId: updated.id },
          });
          if (input.iterations && input.iterations.length > 0) {
            const iterationItems = input.iterations.slice(0, 10);
            await tx.fabRouteIteration.createMany({
              data: iterationItems.map((subname) => ({
                fabRouteStepId: updated.id,
                subname,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
            });
          }
        }

        if (input.parameters !== undefined && tx.fabRouteParameter) {
          await tx.fabRouteParameter.deleteMany({
            where: { fabRouteStepId: updated.id },
          });
          if (input.parameters && input.parameters.length > 0) {
            await tx.fabRouteParameter.createMany({
              data: input.parameters.map((p) => ({
                fabRouteStepId: updated.id,
                name: p.name,
                inputType: p.inputType || "Text",
                paramValue: p.paramValue ?? null,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
            });
          }
        }

        const fabRoute = await tx.fabRoute.findUnique({
          where: { id: updated.fabRouteId },
          include: { fabrication: { include: { item: { select: { ecnNo: true } } } } },
        });

        if (fabRoute?.fabrication) {
          const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
          await tx.itemRevision.create({
            data: {
              itemId: fabRoute.fabrication.itemId,
              ecnNo: fabRoute.fabrication.item.ecnNo ?? null,
              details: `Updated fabrication step "${updated.sequenceNumber} - ${updated.name}" fields: ${changedFields.join(", ")}`,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            },
          });
        }

        return updated;
      });

      this.fabRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_FABROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteStep",
        recordId: String(parsedId),
        description: "Updated FabRouteStep record",
        values: fabRouteStep as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteStep: fabRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<FabRouteStepPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteStep = await this.prisma.fabRouteStep.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.fabRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const fabRoute = await this.prisma.fabRoute.findUnique({
        where: { id: fabRouteStep.fabRouteId },
        include: { fabrication: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (fabRoute?.fabrication) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: fabRoute.fabrication.itemId,
            ecnNo: fabRoute.fabrication.item.ecnNo ?? null,
            details: `Deleted fabrication step "${fabRouteStep.sequenceNumber} - ${fabRouteStep.name}" from route "${fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_FABROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteStep",
        recordId: String(parsedId),
        description: "Deleted FabRouteStep record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteStep: fabRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<FabRouteStepPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteStep = await this.prisma.fabRouteStep.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.fabRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const fabRoute = await this.prisma.fabRoute.findUnique({
        where: { id: fabRouteStep.fabRouteId },
        include: { fabrication: { include: { item: { select: { ecnNo: true } } } } },
      });

      if (fabRoute?.fabrication) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: fabRoute.fabrication.itemId,
            ecnNo: fabRoute.fabrication.item.ecnNo ?? null,
            details: `Restored fabrication step "${fabRouteStep.sequenceNumber} - ${fabRouteStep.name}" in route "${fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_FABROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteStep",
        recordId: String(parsedId),
        description: "Restored FabRouteStep record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteStep: fabRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
