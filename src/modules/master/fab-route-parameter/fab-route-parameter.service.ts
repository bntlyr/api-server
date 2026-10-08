import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateFabRouteParameterInput,
  FabRouteParameterFilterInput,
  PaginationInput,
  UpdateFabRouteParameterInput,
  FabRouteParameterConnection,
  FabRouteParameterPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateFabRouteParameterInput, validateUpdateFabRouteParameterInput } from "./helpers/fab-route-parameter.helper.js";

import { FabRouteParameterLoader } from "./fab-route-parameter.loader.js";

@Injectable()
export class FabRouteParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteParameterLoader: FabRouteParameterLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.fabRouteParameterLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: FabRouteParameterFilterInput | null,
  ): Promise<FabRouteParameterConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "inputType", "paramValue"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.fabRouteParameter.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.fabRouteParameter.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as FabRouteParameterConnection;
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
      } as unknown as FabRouteParameterConnection;
    }
  }

  async create(input: CreateFabRouteParameterInput, context?: any): Promise<FabRouteParameterPayload> {
    const validationError = validateCreateFabRouteParameterInput(input);
    if (validationError) {
      return {
        fabRouteParameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const fabRouteParameter = await this.prisma.fabRouteParameter.create({
        data: {
          name: input.name,
          ...(input.inputType ? { inputType: input.inputType } : {}),
          paramValue: input.paramValue ?? null,
          fabRouteStepId: input.fabRouteStepId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteParameter.fabRouteStepId },
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
            details: `Added parameter "${fabRouteParameter.name}" to fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_FABROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteParameter",
        recordId: String(fabRouteParameter.id),
        description: "Created FabRouteParameter record",
        values: fabRouteParameter as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteParameter: fabRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateFabRouteParameterInput,
    context?: any,
  ): Promise<FabRouteParameterPayload> {
    const validationError = validateUpdateFabRouteParameterInput(input);
    if (validationError) {
      return {
        fabRouteParameter: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteParameter = await this.prisma.fabRouteParameter.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.inputType ? { inputType: input.inputType } : {}),
          ...(input.paramValue !== undefined ? { paramValue: input.paramValue ?? null } : {}),
          ...(input.fabRouteStepId ? { fabRouteStepId: input.fabRouteStepId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted != null ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.fabRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteParameter.fabRouteStepId },
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
            details: `Updated parameter "${fabRouteParameter.name}" fields: ${changedFields.join(", ")} in fabrication step "${step.sequenceNumber} - ${step.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_FABROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteParameter",
        recordId: String(parsedId),
        description: "Updated FabRouteParameter record",
        values: fabRouteParameter as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRouteParameter: fabRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<FabRouteParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteParameter = await this.prisma.fabRouteParameter.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.fabRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteParameter.fabRouteStepId },
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
            details: `Deleted parameter "${fabRouteParameter.name}" from fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_FABROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteParameter",
        recordId: String(parsedId),
        description: "Deleted FabRouteParameter record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteParameter: fabRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<FabRouteParameterPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRouteParameter = await this.prisma.fabRouteParameter.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.fabRouteParameterLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const step = await this.prisma.fabRouteStep.findUnique({
        where: { id: fabRouteParameter.fabRouteStepId },
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
            details: `Restored parameter "${fabRouteParameter.name}" in fabrication step "${step.sequenceNumber} - ${step.name}" in route "${step.fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_FABROUTEPARAMETER",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRouteParameter",
        recordId: String(parsedId),
        description: "Restored FabRouteParameter record",
        ipAddress,
        userAgent,
      });

      return {
        fabRouteParameter: fabRouteParameter as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRouteParameter: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
