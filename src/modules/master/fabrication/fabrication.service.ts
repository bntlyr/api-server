import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateFabricationInput,
  FabricationFilterInput,
  PaginationInput,
  UpdateFabricationInput,
  FabricationConnection,
  FabricationPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateFabricationInput, validateUpdateFabricationInput } from "./helpers/fabrication.helper.js";
import { syncFabRouteSteps } from "../default-route-step/helpers/route-step-sync.helper.js";
import { FabRouteLoader } from "../fab-route/fab-route.loader.js";
import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { FabricationLoader } from "./fabrication.loader.js";

@Injectable()
export class FabricationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabricationLoader: FabricationLoader,
    private readonly auditService: AuditTrailService,
    private readonly fabRouteLoader?: FabRouteLoader,
    private readonly fabRouteStepLoader?: FabRouteStepLoader,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.fabricationLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: FabricationFilterInput | null,
    context?: any,
  ): Promise<FabricationConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["code", "fabImage"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.fabrication.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.fabrication.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as FabricationConnection;
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
      } as unknown as FabricationConnection;
    }
  }

  async create(input: CreateFabricationInput, context?: any): Promise<FabricationPayload> {
    const validationError = validateCreateFabricationInput(input);
    if (validationError) {
      return {
        fabrication: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const actorId = userId !== "SYSTEM" ? userId : null;

      const executeCreate = async (tx: any) => {
        const created = await tx.fabrication.create({
          data: {
            code: input.code,
            itemId: input.itemId,
            ...(input.sellingPrice != null ? { sellingPrice: input.sellingPrice } : {}),
            ...(input.unitPrice != null ? { unitPrice: input.unitPrice } : {}),
            fabImage: input.fabImage ?? null,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        if (input.steps != null && tx.fabRoute) {
          const defaultFabRoute = await tx.fabRoute.create({
            data: {
              name: `${created.code} Route`,
              type: "Default",
              fabricationId: created.id,
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
          await syncFabRouteSteps(tx, defaultFabRoute.id, input.steps, userId);
        }

        return created;
      };

      const fabrication =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeCreate)
          : await executeCreate(this.prisma);

      this.fabricationLoader.byItemId.clear(fabrication.itemId);

      const item = await this.prisma.item.findUnique({
        where: { id: fabrication.itemId },
        select: { ecnNo: true },
      });

      await this.prisma.itemRevision.create({
        data: {
          itemId: fabrication.itemId,
          ecnNo: input.ecnNo ?? item?.ecnNo ?? null,
          details: `Created fabrication "${fabrication.code}"`,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_FABRICATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Fabrication",
        recordId: String(fabrication.id),
        description: "Created Fabrication record",
        values: fabrication as any,
        ipAddress,
        userAgent,
      });

      return {
        fabrication: fabrication as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabrication: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateFabricationInput,
    context?: any,
  ): Promise<FabricationPayload> {
    const validationError = validateUpdateFabricationInput(input);
    if (validationError) {
      return {
        fabrication: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const actorId = userId !== "SYSTEM" ? userId : null;
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const targetId = Number.isNaN(parsedId) ? (id as any) : parsedId;

      let syncedFabRouteId: number | null = null;

      const executeUpdate = async (tx: any) => {
        const updated = await tx.fabrication.update({
          where: { id: targetId },
          data: {
            ...(input.code ? { code: input.code } : {}),
            ...(input.itemId ? { itemId: input.itemId } : {}),
            ...(input.sellingPrice != null ? { sellingPrice: input.sellingPrice } : {}),
            ...(input.unitPrice != null ? { unitPrice: input.unitPrice } : {}),
            ...(input.fabImage !== undefined ? { fabImage: input.fabImage ?? null } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.steps != null && tx.fabRoute) {
          let defaultFabRoute = await tx.fabRoute.findFirst({
            where: { fabricationId: updated.id, type: "Default" },
          });
          if (!defaultFabRoute) {
            defaultFabRoute = await tx.fabRoute.create({
              data: {
                name: `${updated.code} Route`,
                type: "Default",
                fabricationId: updated.id,
                createdBy: actorId,
                updatedBy: actorId,
              },
            });
          }
          syncedFabRouteId = defaultFabRoute.id;
          await syncFabRouteSteps(tx, defaultFabRoute.id, input.steps, userId);
        }

        return updated;
      };

      const fabrication =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeUpdate)
          : await executeUpdate(this.prisma);

      this.fabricationLoader.clear(targetId);
      this.fabricationLoader.byItemId.clear(fabrication.itemId);
      this.fabRouteLoader?.byFabricationId?.clear(targetId);
      if (syncedFabRouteId != null) {
        this.fabRouteLoader?.clear(syncedFabRouteId);
        this.fabRouteStepLoader?.byFabRouteId?.clear(syncedFabRouteId);
      }

      const item = await this.prisma.item.findUnique({
        where: { id: fabrication.itemId },
        select: { ecnNo: true },
      });

      const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
      await this.prisma.itemRevision.create({
        data: {
          itemId: fabrication.itemId,
          ecnNo: input.ecnNo ?? item?.ecnNo ?? null,
          details: `Updated fabrication "${fabrication.code}" fields: ${changedFields.join(", ")}`,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_FABRICATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Fabrication",
        recordId: String(parsedId),
        description: "Updated Fabrication record",
        values: fabrication as any,
        ipAddress,
        userAgent,
      });

      return {
        fabrication: fabrication as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabrication: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<FabricationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabrication = await this.prisma.fabrication.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.fabricationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const item = await this.prisma.item.findUnique({
        where: { id: fabrication.itemId },
        select: { ecnNo: true },
      });

      await this.prisma.itemRevision.create({
        data: {
          itemId: fabrication.itemId,
          ecnNo: item?.ecnNo ?? null,
          details: `Deleted fabrication "${fabrication.code}"`,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_FABRICATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Fabrication",
        recordId: String(parsedId),
        description: "Deleted Fabrication record",
        ipAddress,
        userAgent,
      });

      return {
        fabrication: fabrication as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabrication: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<FabricationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const fabrication = await this.prisma.fabrication.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.fabricationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const item = await this.prisma.item.findUnique({
        where: { id: fabrication.itemId },
        select: { ecnNo: true },
      });

      await this.prisma.itemRevision.create({
        data: {
          itemId: fabrication.itemId,
          ecnNo: item?.ecnNo ?? null,
          details: `Restored fabrication "${fabrication.code}"`,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_FABRICATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Fabrication",
        recordId: String(parsedId),
        description: "Restored Fabrication record",
        ipAddress,
        userAgent,
      });

      return {
        fabrication: fabrication as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        fabrication: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
