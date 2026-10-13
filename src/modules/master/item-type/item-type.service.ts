import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateItemTypeInput,
  ItemTypeFilterInput,
  PaginationInput,
  UpdateItemTypeInput,
  ItemTypeConnection,
  ItemTypePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateItemTypeInput, validateUpdateItemTypeInput } from "./helpers/item-type.helper.js";
import { syncDefaultRouteSteps } from "../default-route-step/helpers/route-step-sync.helper.js";
import { DefaultRouteLoader } from "../default-route/default-route.loader.js";
import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { ItemTypeLoader } from "./item-type.loader.js";

@Injectable()
export class ItemTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemTypeLoader: ItemTypeLoader,
    private readonly auditService: AuditTrailService,
    private readonly defaultRouteLoader?: DefaultRouteLoader,
    private readonly defaultRouteStepLoader?: DefaultRouteStepLoader,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemTypeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemTypeFilterInput | null,
    context?: any,
  ): Promise<ItemTypeConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "cycleType"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.itemType.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.itemType.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemTypeConnection;
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
      } as unknown as ItemTypeConnection;
    }
  }

  async create(input: CreateItemTypeInput, context?: any): Promise<ItemTypePayload> {
    const validationError = validateCreateItemTypeInput(input);
    if (validationError) {
      return {
        itemType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const actorId = userId !== "SYSTEM" ? userId : null;

      const executeCreate = async (tx: any) => {
        const created = await tx.itemType.create({
          data: {
            name: input.name,
            code: input.code,
            ...(input.cycleType ? { cycleType: input.cycleType } : {}),
            ...(input.routeSetUp != null ? { routeSetUp: input.routeSetUp } : {}),
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        if (created.routeSetUp && input.steps && input.steps.length > 0 && tx.defaultRoute) {
          const defaultRoute = await tx.defaultRoute.create({
            data: {
              name: `${created.code} Default Route`,
              description: `Default route for ${created.name}`,
              itemTypeId: created.id,
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
          await syncDefaultRouteSteps(tx, defaultRoute.id, input.steps, userId);
        }

        return created;
      };

      const itemType =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeCreate)
          : await executeCreate(this.prisma);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(itemType.id),
        description: "Created ItemType record",
        values: itemType as any,
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemTypeInput,
    context?: any,
  ): Promise<ItemTypePayload> {
    const validationError = validateUpdateItemTypeInput(input);
    if (validationError) {
      return {
        itemType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const actorId = userId !== "SYSTEM" ? userId : null;
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const targetId = Number.isNaN(parsedId) ? (id as any) : parsedId;

      let syncedDefaultRouteId: number | null = null;

      const executeUpdate = async (tx: any) => {
        const updated = await tx.itemType.update({
          where: { id: targetId },
          data: {
            ...(input.name ? { name: input.name } : {}),
            ...(input.code ? { code: input.code } : {}),
            ...(input.cycleType ? { cycleType: input.cycleType } : {}),
            ...(input.routeSetUp != null ? { routeSetUp: input.routeSetUp } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (tx.defaultRoute) {
          if (input.routeSetUp === false) {
            const existingRoute = await tx.defaultRoute.findFirst({
              where: { itemTypeId: updated.id },
            });
            if (existingRoute) {
              syncedDefaultRouteId = existingRoute.id;
              await syncDefaultRouteSteps(tx, existingRoute.id, [], userId);
            }
          } else if (input.steps != null) {
            let defaultRoute = await tx.defaultRoute.findFirst({
              where: { itemTypeId: updated.id },
            });
            if (!defaultRoute) {
              defaultRoute = await tx.defaultRoute.create({
                data: {
                  name: `${updated.code} Default Route`,
                  description: `Default route for ${updated.name}`,
                  itemTypeId: updated.id,
                  createdBy: actorId,
                  updatedBy: actorId,
                },
              });
            }
            syncedDefaultRouteId = defaultRoute.id;
            await syncDefaultRouteSteps(tx, defaultRoute.id, input.steps, userId);
          }
        }

        return updated;
      };

      const itemType =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeUpdate)
          : await executeUpdate(this.prisma);

      this.itemTypeLoader.clear(targetId);
      this.defaultRouteLoader?.byItemTypeId?.clear(targetId);
      if (syncedDefaultRouteId != null) {
        this.defaultRouteLoader?.clear(syncedDefaultRouteId);
        this.defaultRouteStepLoader?.byDefaultRouteId?.clear(syncedDefaultRouteId);
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(parsedId),
        description: "Updated ItemType record",
        values: itemType as any,
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemType = await this.prisma.itemType.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(parsedId),
        description: "Deleted ItemType record",
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const itemType = await this.prisma.itemType.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEMTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ItemType",
        recordId: String(parsedId),
        description: "Restored ItemType record",
        ipAddress,
        userAgent,
      });

      return {
        itemType: itemType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        itemType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
