import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateLocationInput,
  LocationFilterInput,
  PaginationInput,
  UpdateLocationInput,
  LocationConnection,
  LocationPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateLocationInput, validateUpdateLocationInput } from "./helpers/location.helper.js";

import { LocationLoader } from "./location.loader.js";

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationLoader: LocationLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.locationLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: LocationFilterInput | null,
    context?: any,
  ): Promise<LocationConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.location.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.location.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as LocationConnection;
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
      } as unknown as LocationConnection;
    }
  }

  async create(input: CreateLocationInput, context?: any): Promise<LocationPayload> {
    const validationError = validateCreateLocationInput(input);
    if (validationError) {
      return {
        location: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const location = await this.prisma.location.create({
        data: {
          name: input.name,
          areaId: input.areaId,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_LOCATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Location",
        recordId: String(location.id),
        description: "Created Location record",
        values: location as any,
        ipAddress,
        userAgent,
      });

      return {
        location: location as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        location: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateLocationInput,
    context?: any,
  ): Promise<LocationPayload> {
    const validationError = validateUpdateLocationInput(input);
    if (validationError) {
      return {
        location: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const location = await this.prisma.location.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.areaId ? { areaId: input.areaId } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.locationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_LOCATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Location",
        recordId: String(parsedId),
        description: "Updated Location record",
        values: location as any,
        ipAddress,
        userAgent,
      });

      return {
        location: location as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        location: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<LocationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const location = await this.prisma.location.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.locationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_LOCATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Location",
        recordId: String(parsedId),
        description: "Deleted Location record",
        ipAddress,
        userAgent,
      });

      return {
        location: location as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        location: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<LocationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const location = await this.prisma.location.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.locationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_LOCATION",
        method: "GRAPHQL_MUTATION",
        tableName: "Location",
        recordId: String(parsedId),
        description: "Restored Location record",
        ipAddress,
        userAgent,
      });

      return {
        location: location as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        location: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
