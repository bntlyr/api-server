import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateDefaultRouteInput,
  DefaultRouteFilterInput,
  PaginationInput,
  UpdateDefaultRouteInput,
  DefaultRouteConnection,
  DefaultRoutePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateDefaultRouteInput, validateUpdateDefaultRouteInput } from "./helpers/default-route.helper.js";
import { syncDefaultRouteSteps } from "../default-route-step/helpers/route-step-sync.helper.js";
import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { DefaultRouteLoader } from "./default-route.loader.js";

@Injectable()
export class DefaultRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteLoader: DefaultRouteLoader,
    private readonly auditService: AuditTrailService,
    private readonly defaultRouteStepLoader?: DefaultRouteStepLoader,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.defaultRouteLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: DefaultRouteFilterInput | null,
    context?: any,
  ): Promise<DefaultRouteConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "description"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.defaultRoute.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.defaultRoute.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as DefaultRouteConnection;
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
      } as unknown as DefaultRouteConnection;
    }
  }

  async create(input: CreateDefaultRouteInput, context?: any): Promise<DefaultRoutePayload> {
    const validationError = validateCreateDefaultRouteInput(input);
    if (validationError) {
      return {
        defaultRoute: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const executeCreate = async (tx: any) => {
        const created = await tx.defaultRoute.create({
          data: {
            name: input.name,
            description: input.description ?? null,
            itemTypeId: input.itemTypeId,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        if (input.steps != null) {
          await syncDefaultRouteSteps(tx, created.id, input.steps, userId);
        }

        return created;
      };

      const defaultRoute =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeCreate)
          : await executeCreate(this.prisma);

      this.defaultRouteLoader.byItemTypeId.clear(defaultRoute.itemTypeId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_DEFAULTROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRoute",
        recordId: String(defaultRoute.id),
        description: "Created DefaultRoute record",
        values: defaultRoute as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRoute: defaultRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateDefaultRouteInput,
    context?: any,
  ): Promise<DefaultRoutePayload> {
    const validationError = validateUpdateDefaultRouteInput(input);
    if (validationError) {
      return {
        defaultRoute: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const targetId = Number.isNaN(parsedId) ? (id as any) : parsedId;

      const executeUpdate = async (tx: any) => {
        const updated = await tx.defaultRoute.update({
          where: { id: targetId },
          data: {
            ...(input.name ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description ?? null } : {}),
            ...(input.itemTypeId ? { itemTypeId: input.itemTypeId } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.steps != null) {
          await syncDefaultRouteSteps(tx, updated.id, input.steps, userId);
        }

        return updated;
      };

      const defaultRoute =
        typeof this.prisma.$transaction === "function"
          ? await this.prisma.$transaction(executeUpdate)
          : await executeUpdate(this.prisma);

      this.defaultRouteLoader.clear(targetId);
      this.defaultRouteLoader.byItemTypeId.clear(defaultRoute.itemTypeId);
      this.defaultRouteStepLoader?.byDefaultRouteId?.clear(targetId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_DEFAULTROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRoute",
        recordId: String(parsedId),
        description: "Updated DefaultRoute record",
        values: defaultRoute as any,
        ipAddress,
        userAgent,
      });

      return {
        defaultRoute: defaultRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<DefaultRoutePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRoute = await this.prisma.defaultRoute.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.defaultRouteLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_DEFAULTROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRoute",
        recordId: String(parsedId),
        description: "Deleted DefaultRoute record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRoute: defaultRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<DefaultRoutePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const defaultRoute = await this.prisma.defaultRoute.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.defaultRouteLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_DEFAULTROUTE",
        method: "GRAPHQL_MUTATION",
        tableName: "DefaultRoute",
        recordId: String(parsedId),
        description: "Restored DefaultRoute record",
        ipAddress,
        userAgent,
      });

      return {
        defaultRoute: defaultRoute as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        defaultRoute: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
