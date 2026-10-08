import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateFabRouteIterationInput,
  FabRouteIterationFilterInput,
  PaginationInput,
  UpdateFabRouteIterationInput,
  FabRouteIterationConnection,
  FabRouteIterationPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateFabRouteIterationInput, validateUpdateFabRouteIterationInput } from "./helpers/fab-route-iteration.helper.js";

import { FabRouteIterationLoader } from "./fab-route-iteration.loader.js";

@Injectable()
export class FabRouteIterationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteIterationLoader: FabRouteIterationLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.fabRouteIterationLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: FabRouteIterationFilterInput | null,
  ): Promise<FabRouteIterationConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["subname"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.fabRouteIteration.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.fabRouteIteration.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as FabRouteIterationConnection;
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
      } as unknown as FabRouteIterationConnection;
    }
  }

  async create(input: CreateFabRouteIterationInput, context?: any): Promise<FabRouteIterationPayload> {
    const validationError = validateCreateFabRouteIterationInput(input);
    if (validationError) {
      return {
        fabRouteIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const count = await this.prisma.fabRouteIteration.count({
        where: { fabRouteStepId: input.fabRouteStepId },
      });

      if (count >= 10) {
        return {
          fabRouteIteration: null,
          userErrors: [createError("A route step can have a maximum of 10 iterations", "fabRouteStepId", "LIMIT_EXCEEDED")],
        };
      }

      const fabRouteIteration = await this.prisma.fabRouteIteration.create({
        data: {
          subname: input.subname,
          fabRouteStepId: input.fabRouteStepId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.prisma.fabRouteStep.update({
        where: { id: input.fabRouteStepId },
        data: { numberOfIterations: { increment: 1 } },
      });

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteIteration.fabRouteStepId },
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
            details: `Added iteration "${fabRouteIteration.subname}" to fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_FABROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteIteration",
        recordId: String(fabRouteIteration.id),
        description: "Created FabRouteIteration record",
        values: fabRouteIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteIteration: fabRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateFabRouteIterationInput,
    context?: any,
  ): Promise<FabRouteIterationPayload> {
    const validationError = validateUpdateFabRouteIterationInput(input);
    if (validationError) {
      return {
        fabRouteIteration: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteIteration = await this.prisma.fabRouteIteration.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.subname ? { subname: input.subname } : {}),
          ...(input.fabRouteStepId ? { fabRouteStepId: input.fabRouteStepId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted != null ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.fabRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteIteration.fabRouteStepId },
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
        const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
        await this.prisma.itemRevision.create({
          data: {
            itemId: step.fabRoute.fabrication.itemId,
            ecnNo: step.fabRoute.fabrication.item.ecnNo ?? null,
            details: `Updated iteration "${fabRouteIteration.subname}" fields: ${changedFields.join(", ")} in fabrication step "${step.sequenceNumber} - ${step.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_FABROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteIteration",
        recordId: String(parsedId),
        description: "Updated FabRouteIteration record",
        values: fabRouteIteration as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteIteration: fabRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<FabRouteIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteIteration = await this.prisma.fabRouteIteration.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.fabRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.prisma.fabRouteStep.update({
        where: { id: fabRouteIteration.fabRouteStepId },
        data: { numberOfIterations: { decrement: 1 } },
      });

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteIteration.fabRouteStepId },
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
            details: `Deleted iteration "${fabRouteIteration.subname}" from fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_FABROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteIteration",
        recordId: String(parsedId),
        description: "Deleted FabRouteIteration record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteIteration: fabRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<FabRouteIterationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteIteration = await this.prisma.fabRouteIteration.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.fabRouteIterationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.prisma.fabRouteStep.update({
        where: { id: fabRouteIteration.fabRouteStepId },
        data: { numberOfIterations: { increment: 1 } },
      });

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteIteration.fabRouteStepId },
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
            details: `Restored iteration "${fabRouteIteration.subname}" in fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_FABROUTEITERATION",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteIteration",
        recordId: String(parsedId),
        description: "Restored FabRouteIteration record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteIteration: fabRouteIteration as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteIteration: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
