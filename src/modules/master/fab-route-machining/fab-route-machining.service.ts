import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateFabRouteMachiningInput,
  FabRouteMachiningFilterInput,
  PaginationInput,
  UpdateFabRouteMachiningInput,
  FabRouteMachiningConnection,
  FabRouteMachiningPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateFabRouteMachiningInput, validateUpdateFabRouteMachiningInput } from "./helpers/fab-route-machining.helper.js";

import { FabRouteMachiningLoader } from "./fab-route-machining.loader.js";

@Injectable()
export class FabRouteMachiningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteMachiningLoader: FabRouteMachiningLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.fabRouteMachiningLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: FabRouteMachiningFilterInput | null,
  ): Promise<FabRouteMachiningConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, []);

      const [items, totalCount] = await Promise.all([
        this.prisma.fabRouteMachining.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.fabRouteMachining.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as FabRouteMachiningConnection;
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
      } as unknown as FabRouteMachiningConnection;
    }
  }

  async create(input: CreateFabRouteMachiningInput, context?: any): Promise<FabRouteMachiningPayload> {
    const validationError = validateCreateFabRouteMachiningInput(input);
    if (validationError) {
      return {
        fabRouteMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const fabRouteMachining = await this.prisma.fabRouteMachining.create({
        data: {
          fabRouteStepId: input.fabRouteStepId,
          machineId: input.machineId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteMachining.fabRouteStepId },
        include: {
          fabRoute: {
            include: {
              fabrication: {
                include: { item: { select: { ecnNo: true } } },
              },
            },
          },
        },
      });

      if (step?.fabRoute?.fabrication?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.fabRoute.fabrication.itemId,
            ecnNo: step.fabRoute.fabrication.item.ecnNo ?? null,
            details: `Assigned machine #${fabRouteMachining.machineId} to fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_FABROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteMachining",
        recordId: String(fabRouteMachining.id),
        description: "Created FabRouteMachining record",
        values: fabRouteMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteMachining: fabRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateFabRouteMachiningInput,
    context?: any,
  ): Promise<FabRouteMachiningPayload> {
    const validationError = validateUpdateFabRouteMachiningInput(input);
    if (validationError) {
      return {
        fabRouteMachining: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteMachining = await this.prisma.fabRouteMachining.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.fabRouteStepId ? { fabRouteStepId: input.fabRouteStepId } : {}),
          ...(input.machineId ? { machineId: input.machineId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted != null ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.fabRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteMachining.fabRouteStepId },
        include: {
          fabRoute: {
            include: {
              fabrication: {
                include: { item: { select: { ecnNo: true } } },
              },
            },
          },
        },
      });

      if (step?.fabRoute?.fabrication?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.fabRoute.fabrication.itemId,
            ecnNo: step.fabRoute.fabrication.item.ecnNo ?? null,
            details: `Updated assigned machine #${fabRouteMachining.machineId} in fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_FABROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteMachining",
        recordId: String(parsedId),
        description: "Updated FabRouteMachining record",
        values: fabRouteMachining as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteMachining: fabRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<FabRouteMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteMachining = await this.prisma.fabRouteMachining.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.fabRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteMachining.fabRouteStepId },
        include: {
          fabRoute: {
            include: {
              fabrication: {
                include: { item: { select: { ecnNo: true } } },
              },
            },
          },
        },
      });

      if (step?.fabRoute?.fabrication?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.fabRoute.fabrication.itemId,
            ecnNo: step.fabRoute.fabrication.item.ecnNo ?? null,
            details: `Removed machine #${fabRouteMachining.machineId} from fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_FABROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteMachining",
        recordId: String(parsedId),
        description: "Deleted FabRouteMachining record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteMachining: fabRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<FabRouteMachiningPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteMachining = await this.prisma.fabRouteMachining.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.fabRouteMachiningLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteMachining.fabRouteStepId },
        include: {
          fabRoute: {
            include: {
              fabrication: {
                include: { item: { select: { ecnNo: true } } },
              },
            },
          },
        },
      });

      if (step?.fabRoute?.fabrication?.item) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.fabRoute.fabrication.itemId,
            ecnNo: step.fabRoute.fabrication.item.ecnNo ?? null,
            details: `Restored machine #${fabRouteMachining.machineId} assignment in fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_FABROUTEMACHINING",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteMachining",
        recordId: String(parsedId),
        description: "Restored FabRouteMachining record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteMachining: fabRouteMachining as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteMachining: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
