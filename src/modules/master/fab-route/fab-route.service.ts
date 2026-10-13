import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateFabRouteInput,
  FabRouteFilterInput,
  PaginationInput,
  UpdateFabRouteInput,
  FabRouteConnection,
  FabRoutePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateFabRouteInput, validateUpdateFabRouteInput } from "./helpers/fab-route.helper.js";
import { syncFabRouteSteps } from "../default-route-step/helpers/route-step-sync.helper.js";
import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { FabRouteLoader } from "./fab-route.loader.js";

@Injectable()
export class FabRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteLoader: FabRouteLoader,
    private readonly auditService: AuditTrailService,
    private readonly fabRouteStepLoader?: FabRouteStepLoader,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.fabRouteLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: FabRouteFilterInput | null,
    context?: any,
  ): Promise<FabRouteConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "type"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.fabRoute.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.fabRoute.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as FabRouteConnection;
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
      } as unknown as FabRouteConnection;
    }
  }

  async create(input: CreateFabRouteInput, context?: any): Promise<FabRoutePayload> {
    const validationError = validateCreateFabRouteInput(input);
    if (validationError) {
      return {
        fabRoute: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const executeCreate = async (tx: any) => {
        const created = await tx.fabRoute.create({
          data: {
            name: input.name,
            ...(input.type ? { type: input.type } : {}),
            fabricationId: input.fabricationId,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        if (input.steps != null) {
          await syncFabRouteSteps(tx, created.id, input.steps, userId);
        }

        return created;
      };

      const fabRoute =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeCreate)
          : await executeCreate(this.prisma);

      this.fabRouteLoader.byFabricationId.clear(fabRoute.fabricationId);

      const fab = await this.prisma.fabrication.findUnique({
        where: { id: fabRoute.fabricationId },
        include: { item: { select: { ecnNo: true } } },
      });

      if (fab) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: fab.itemId,
            ecnNo: input.ecnNo ?? fab.item.ecnNo ?? null,
            details: `Created ${fabRoute.type} fabrication route "${fabRoute.name}" for fabrication "${fab.code}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_FABROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRoute",
        recordId: String(fabRoute.id),
        description: "Created FabRoute record",
        values: fabRoute as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRoute: fabRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateFabRouteInput,
    context?: any,
  ): Promise<FabRoutePayload> {
    const validationError = validateUpdateFabRouteInput(input);
    if (validationError) {
      return {
        fabRoute: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const targetId = Number.isNaN(parsedId) ? (id as any) : parsedId;

      const executeUpdate = async (tx: any) => {
        const updated = await tx.fabRoute.update({
          where: { id: targetId },
          data: {
            ...(input.name ? { name: input.name } : {}),
            ...(input.type ? { type: input.type } : {}),
            ...(input.fabricationId ? { fabricationId: input.fabricationId } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.steps != null) {
          await syncFabRouteSteps(tx, updated.id, input.steps, userId);
        }

        return updated;
      };

      const fabRoute =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeUpdate)
          : await executeUpdate(this.prisma);

      this.fabRouteLoader.clear(targetId);
      this.fabRouteLoader.byFabricationId.clear(fabRoute.fabricationId);
      this.fabRouteStepLoader?.byFabRouteId?.clear(targetId);

      const fab = await this.prisma.fabrication.findUnique({
        where: { id: fabRoute.fabricationId },
        include: { item: { select: { ecnNo: true } } },
      });

      if (fab) {
        const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
        await this.prisma.itemRevision.create({
          data: {
            itemId: fab.itemId,
            ecnNo: input.ecnNo ?? fab.item.ecnNo ?? null,
            details: `Updated fabrication route "${fabRoute.name}" fields: ${changedFields.join(", ")}`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_FABROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRoute",
        recordId: String(parsedId),
        description: "Updated FabRoute record",
        values: fabRoute as any,
        ipAddress,
        userAgent,
      });

      return {
        fabRoute: fabRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<FabRoutePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRoute = await this.prisma.fabRoute.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.fabRouteLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const fab = await this.prisma.fabrication.findUnique({
        where: { id: fabRoute.fabricationId },
        include: { item: { select: { ecnNo: true } } },
      });

      if (fab) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: fab.itemId,
            ecnNo: fab.item.ecnNo ?? null,
            details: `Deleted fabrication route "${fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_FABROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRoute",
        recordId: String(parsedId),
        description: "Deleted FabRoute record",
        ipAddress,
        userAgent,
      });

      return {
        fabRoute: fabRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<FabRoutePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabRoute = await this.prisma.fabRoute.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.fabRouteLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const fab = await this.prisma.fabrication.findUnique({
        where: { id: fabRoute.fabricationId },
        include: { item: { select: { ecnNo: true } } },
      });

      if (fab) {
        await this.prisma.itemRevision.create({
          data: {
            itemId: fab.itemId,
            ecnNo: fab.item.ecnNo ?? null,
            details: `Restored fabrication route "${fabRoute.name}"`,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_FABROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "FabRoute",
        recordId: String(parsedId),
        description: "Restored FabRoute record",
        ipAddress,
        userAgent,
      });

      return {
        fabRoute: fabRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
