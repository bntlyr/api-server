import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateRawMaterialInput,
  RawMaterialFilterInput,
  PaginationInput,
  UpdateRawMaterialInput,
  RawMaterialConnection,
  RawMaterialPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateRawMaterialInput, validateUpdateRawMaterialInput } from "./helpers/raw-material.helper.js";

import { RawMaterialLoader } from "./raw-material.loader.js";

@Injectable()
export class RawMaterialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterialLoader: RawMaterialLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.rawMaterialLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: RawMaterialFilterInput | null,
    context?: any,
  ): Promise<RawMaterialConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "class", "stamping", "pylox", "createdById", "updatedById"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.rawMaterial.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.rawMaterial.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as RawMaterialConnection;
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
      } as unknown as RawMaterialConnection;
    }
  }

  async create(input: CreateRawMaterialInput, context?: any): Promise<RawMaterialPayload> {
    const validationError = validateCreateRawMaterialInput(input);
    if (validationError) {
      return {
        rawMaterial: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const rawMaterial = await this.prisma.rawMaterial.create({
        data: {
          name: input.name,
          code: input.code,
          ...(input.class ? { class: input.class } : {}),
          stamping: input.stamping ?? null,
          pylox: input.pylox ?? null,
          itemTypeId: input.itemTypeId,
          createdById: userId !== "SYSTEM" ? userId : null,
          updatedById: userId !== "SYSTEM" ? userId : null,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_RAWMATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterial",
        recordId: String(rawMaterial.id),
        description: "Created RawMaterial record",
        values: rawMaterial as any,
        ipAddress,
        userAgent,
      });

      return {
        rawMaterial: rawMaterial as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterial: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateRawMaterialInput,
    context?: any,
  ): Promise<RawMaterialPayload> {
    const validationError = validateUpdateRawMaterialInput(input);
    if (validationError) {
      return {
        rawMaterial: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const rawMaterial = await this.prisma.rawMaterial.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          ...(input.class ? { class: input.class } : {}),
          ...(input.stamping !== undefined ? { stamping: input.stamping ?? null } : {}),
          ...(input.pylox !== undefined ? { pylox: input.pylox ?? null } : {}),
          ...(input.itemTypeId ? { itemTypeId: input.itemTypeId } : {}),
          updatedById: userId !== "SYSTEM" ? userId : undefined,
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.rawMaterialLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_RAWMATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterial",
        recordId: String(parsedId),
        description: "Updated RawMaterial record",
        values: rawMaterial as any,
        ipAddress,
        userAgent,
      });

      return {
        rawMaterial: rawMaterial as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterial: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<RawMaterialPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const rawMaterial = await this.prisma.rawMaterial.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.rawMaterialLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_RAWMATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterial",
        recordId: String(parsedId),
        description: "Deleted RawMaterial record",
        ipAddress,
        userAgent,
      });

      return {
        rawMaterial: rawMaterial as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterial: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<RawMaterialPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const rawMaterial = await this.prisma.rawMaterial.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.rawMaterialLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_RAWMATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "RawMaterial",
        recordId: String(parsedId),
        description: "Restored RawMaterial record",
        ipAddress,
        userAgent,
      });

      return {
        rawMaterial: rawMaterial as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        rawMaterial: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
