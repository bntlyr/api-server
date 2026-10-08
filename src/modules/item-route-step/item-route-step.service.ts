import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateItemRouteStepInput,
  ItemRouteStepFilterInput,
  PaginationInput,
  UpdateItemRouteStepInput,
  ItemRouteStepConnection,
  ItemRouteStepPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateItemRouteStepInput, validateUpdateItemRouteStepInput } from "./helpers/item-route-step.helper.js";

import { ItemRouteStepLoader } from "./item-route-step.loader.js";

@Injectable()
export class ItemRouteStepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteStepLoader: ItemRouteStepLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemRouteStepLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemRouteStepFilterInput | null,
  ): Promise<ItemRouteStepConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["sequenceNumber", "name", "subname", "durationType", "leadTimeUnit", "prepTimeUnit", "cureTimeUnit"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemRouteStep.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemRouteStep.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemRouteStepConnection;
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
      } as unknown as ItemRouteStepConnection;
    }
  }

  async create(input: CreateItemRouteStepInput, context?: any): Promise<ItemRouteStepPayload> {
    const validationError = validateCreateItemRouteStepInput(input);
    if (validationError) {
      return {
        itemRouteStep: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const itemRouteStep = await this.prisma.$transaction(async (tx) => {
        const created = await tx.itemRouteStep.create({
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
            itemRouteId: input.itemRouteId,
            createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            ...(input.deleted ? { deleted: input.deleted } : {}),
            deletedBy: input.deletedBy ?? null,
          },
        });

        if (input.machineIds && input.machineIds.length > 0) {
          await tx.itemRouteMachining.createMany({
            data: input.machineIds.map((machineId) => ({
              itemRouteStepId: created.id,
              machineId,
              createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
              updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            })),
            skipDuplicates: true,
          });
        }

        if (input.iterations && input.iterations.length > 0) {
          const iterationItems = input.iterations.slice(0, 10);
          await tx.itemRouteIteration.createMany({
            data: iterationItems.map((subname) => ({
              itemRouteStepId: created.id,
              subname,
              createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
              updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            })),
          });
        }

        const route = await tx.itemRoute.findUnique({
          where: { id: created.itemRouteId },
          include: { item: { select: { ecnNo: true } } },
        });

        if (route) {
          await tx.itemRevision.create({
            data: {
              itemId: route.itemId,
              ecnNo: route.item.ecnNo ?? null,
              details: `Added step "${created.sequenceNumber} - ${created.name}" to route "${route.name}"`,
              createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
              updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            },
          });
        }

        return created;
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteStep",
        recordId: String(itemRouteStep.id),
        description: "Created ItemRouteStep record",
        values: itemRouteStep as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteStep: itemRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemRouteStepInput,
    context?: any,
  ): Promise<ItemRouteStepPayload> {
    const validationError = validateUpdateItemRouteStepInput(input);
    if (validationError) {
      return {
        itemRouteStep: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const itemRouteStep = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.itemRouteStep.update({
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
            ...(input.itemRouteId ? { itemRouteId: input.itemRouteId } : {}),
            ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
            ...(input.deleted != null ? { deleted: input.deleted } : {}),
            ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
          },
        });

        if (input.machineIds !== undefined) {
          await tx.itemRouteMachining.deleteMany({
            where: { itemRouteStepId: updated.id },
          });
          if (input.machineIds && input.machineIds.length > 0) {
            await tx.itemRouteMachining.createMany({
              data: input.machineIds.map((machineId) => ({
                itemRouteStepId: updated.id,
                machineId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (input.iterations !== undefined) {
          await tx.itemRouteIteration.deleteMany({
            where: { itemRouteStepId: updated.id },
          });
          if (input.iterations && input.iterations.length > 0) {
            const iterationItems = input.iterations.slice(0, 10);
            await tx.itemRouteIteration.createMany({
              data: iterationItems.map((subname) => ({
                itemRouteStepId: updated.id,
                subname,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
            });
          }
        }

        const route = await tx.itemRoute.findUnique({
          where: { id: updated.itemRouteId },
          include: { item: { select: { ecnNo: true } } },
        });

        if (route) {
          const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
          await tx.itemRevision.create({
            data: {
              itemId: route.itemId,
              ecnNo: route.item.ecnNo ?? null,
              details: `Updated step "${updated.sequenceNumber} - ${updated.name}" fields: ${changedFields.join(", ")}`,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            },
          });
        }

        return updated;
      });

      this.itemRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteStep",
        recordId: String(parsedId),
        description: "Updated ItemRouteStep record",
        values: itemRouteStep as any,
        ipAddress,
        userAgent,
      });

      return {
        itemRouteStep: itemRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemRouteStepPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteStep = await this.prisma.itemRouteStep.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const route = await this.prisma.itemRoute.findUnique({
        where: { id: itemRouteStep.itemRouteId },
        include: { item: { select: { ecnNo: true } } },
      });

      if (route) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: route.itemId,
            ecnNo: route.item.ecnNo ?? null,
            details: `Deleted step "${itemRouteStep.sequenceNumber} - ${itemRouteStep.name}" from route "${route.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteStep",
        recordId: String(parsedId),
        description: "Deleted ItemRouteStep record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteStep: itemRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemRouteStepPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemRouteStep = await this.prisma.itemRouteStep.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemRouteStepLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const route = await this.prisma.itemRoute.findUnique({
        where: { id: itemRouteStep.itemRouteId },
        include: { item: { select: { ecnNo: true } } },
      });

      if (route) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: route.itemId,
            ecnNo: route.item.ecnNo ?? null,
            details: `Restored step "${itemRouteStep.sequenceNumber} - ${itemRouteStep.name}" in route "${route.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMROUTESTEP",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemRouteStep",
        recordId: String(parsedId),
        description: "Restored ItemRouteStep record",
        ipAddress,
        userAgent,
      });

      return {
        itemRouteStep: itemRouteStep as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemRouteStep: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
