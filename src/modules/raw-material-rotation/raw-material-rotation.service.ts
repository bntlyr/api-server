import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateRawMaterialRotationInput,
  RawMaterialRotationFilterInput,
  PaginationInput,
  UpdateRawMaterialRotationInput,
  RawMaterialRotationConnection,
  RawMaterialRotationPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateRawMaterialRotationInput, validateUpdateRawMaterialRotationInput } from "./helpers/raw-material-rotation.helper.js";

import { RawMaterialRotationLoader } from "./raw-material-rotation.loader.js";

@Injectable()
export class RawMaterialRotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterialRotationLoader: RawMaterialRotationLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.rawMaterialRotationLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: RawMaterialRotationFilterInput | null,
  ): Promise<RawMaterialRotationConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["materialClass", "stamping", "createdById", "updatedById"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.rawMaterialRotation.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.rawMaterialRotation.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as RawMaterialRotationConnection;
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
      } as unknown as RawMaterialRotationConnection;
    }
  }

  async create(input: CreateRawMaterialRotationInput, context?: any): Promise<RawMaterialRotationPayload> {
    const validationError = validateCreateRawMaterialRotationInput(input);
    if (validationError) {
      return {
        rawMaterialRotation: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const rawMaterialRotation = await this.prisma.rawMaterialRotation.create({
        data: {
          materialClass: input.materialClass,
          rawMaterialId: input.rawMaterialId,
          stamping: input.stamping,
          priority: input.priority,
          createdById: input.createdById ?? null,
          updatedById: input.updatedById ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_RAWMATERIALROTATION",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterialRotation",
        recordId: String(rawMaterialRotation.id),
        description: "Created RawMaterialRotation record",
        values: rawMaterialRotation as any,
        ipAddress,
        userAgent,
      });

      return {
        rawMaterialRotation: rawMaterialRotation as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterialRotation: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateRawMaterialRotationInput,
    context?: any,
  ): Promise<RawMaterialRotationPayload> {
    const validationError = validateUpdateRawMaterialRotationInput(input);
    if (validationError) {
      return {
        rawMaterialRotation: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const rawMaterialRotation = await this.prisma.rawMaterialRotation.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.materialClass ? { materialClass: input.materialClass } : {}),
          ...(input.rawMaterialId ? { rawMaterialId: input.rawMaterialId } : {}),
          ...(input.stamping ? { stamping: input.stamping } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.createdById !== undefined ? { createdById: input.createdById ?? null } : {}),
          ...(input.updatedById !== undefined ? { updatedById: input.updatedById ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.rawMaterialRotationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_RAWMATERIALROTATION",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterialRotation",
        recordId: String(parsedId),
        description: "Updated RawMaterialRotation record",
        values: rawMaterialRotation as any,
        ipAddress,
        userAgent,
      });

      return {
        rawMaterialRotation: rawMaterialRotation as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterialRotation: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<RawMaterialRotationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const rawMaterialRotation = await this.prisma.rawMaterialRotation.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.rawMaterialRotationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_RAWMATERIALROTATION",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterialRotation",
        recordId: String(parsedId),
        description: "Deleted RawMaterialRotation record",
        ipAddress,
        userAgent,
      });

      return {
        rawMaterialRotation: rawMaterialRotation as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterialRotation: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<RawMaterialRotationPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const rawMaterialRotation = await this.prisma.rawMaterialRotation.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.rawMaterialRotationLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_RAWMATERIALROTATION",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterialRotation",
        recordId: String(parsedId),
        description: "Restored RawMaterialRotation record",
        ipAddress,
        userAgent,
      });

      return {
        rawMaterialRotation: rawMaterialRotation as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterialRotation: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
