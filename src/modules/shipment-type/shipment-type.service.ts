import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateShipmentTypeInput,
  ShipmentTypeFilterInput,
  PaginationInput,
  UpdateShipmentTypeInput,
  ShipmentTypeConnection,
  ShipmentTypePayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateShipmentTypeInput, validateUpdateShipmentTypeInput } from "./helpers/shipment-type.helper.js";

import { ShipmentTypeLoader } from "./shipment-type.loader.js";

@Injectable()
export class ShipmentTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipmentTypeLoader: ShipmentTypeLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.shipmentTypeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ShipmentTypeFilterInput | null,
  ): Promise<ShipmentTypeConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "description"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.shipmentType.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.shipmentType.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ShipmentTypeConnection;
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
      } as unknown as ShipmentTypeConnection;
    }
  }

  async create(input: CreateShipmentTypeInput, context?: any): Promise<ShipmentTypePayload> {
    const validationError = validateCreateShipmentTypeInput(input);
    if (validationError) {
      return {
        shipmentType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const shipmentType = await this.prisma.shipmentType.create({
        data: {
          name: input.name,
          description: input.description,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_SHIPMENTTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ShipmentType",
        recordId: String(shipmentType.id),
        description: "Created ShipmentType record",
        values: shipmentType as any,
        ipAddress,
        userAgent,
      });

      return {
        shipmentType: shipmentType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipmentType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateShipmentTypeInput,
    context?: any,
  ): Promise<ShipmentTypePayload> {
    const validationError = validateUpdateShipmentTypeInput(input);
    if (validationError) {
      return {
        shipmentType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const shipmentType = await this.prisma.shipmentType.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description ? { description: input.description } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.shipmentTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_SHIPMENTTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ShipmentType",
        recordId: String(parsedId),
        description: "Updated ShipmentType record",
        values: shipmentType as any,
        ipAddress,
        userAgent,
      });

      return {
        shipmentType: shipmentType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipmentType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ShipmentTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const shipmentType = await this.prisma.shipmentType.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.shipmentTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_SHIPMENTTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ShipmentType",
        recordId: String(parsedId),
        description: "Deleted ShipmentType record",
        ipAddress,
        userAgent,
      });

      return {
        shipmentType: shipmentType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipmentType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ShipmentTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const shipmentType = await this.prisma.shipmentType.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.shipmentTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_SHIPMENTTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "ShipmentType",
        recordId: String(parsedId),
        description: "Restored ShipmentType record",
        ipAddress,
        userAgent,
      });

      return {
        shipmentType: shipmentType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipmentType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
