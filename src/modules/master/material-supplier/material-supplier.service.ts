import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMaterialSupplierInput,
  MaterialSupplierFilterInput,
  PaginationInput,
  UpdateMaterialSupplierInput,
  MaterialSupplierConnection,
  MaterialSupplierPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMaterialSupplierInput, validateUpdateMaterialSupplierInput } from "./helpers/material-supplier.helper.js";

import { MaterialSupplierLoader } from "./material-supplier.loader.js";

@Injectable()
export class MaterialSupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialSupplierLoader: MaterialSupplierLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.materialSupplierLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MaterialSupplierFilterInput | null,
  ): Promise<MaterialSupplierConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, []);

      const [items, totalCount] = await Promise.all([
        this.prisma.materialSupplier.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.materialSupplier.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MaterialSupplierConnection;
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
      } as unknown as MaterialSupplierConnection;
    }
  }

  async create(input: CreateMaterialSupplierInput, context?: any): Promise<MaterialSupplierPayload> {
    const validationError = validateCreateMaterialSupplierInput(input);
    if (validationError) {
      return {
        materialSupplier: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const materialSupplier = await this.prisma.materialSupplier.create({
        data: {
          materialId: input.materialId,
          supplierId: input.supplierId,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MATERIALSUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialSupplier",
        recordId: String(materialSupplier.id),
        description: "Created MaterialSupplier record",
        values: materialSupplier as any,
        ipAddress,
        userAgent,
      });

      return {
        materialSupplier: materialSupplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialSupplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMaterialSupplierInput,
    context?: any,
  ): Promise<MaterialSupplierPayload> {
    const validationError = validateUpdateMaterialSupplierInput(input);
    if (validationError) {
      return {
        materialSupplier: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const materialSupplier = await this.prisma.materialSupplier.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.materialId ? { materialId: input.materialId } : {}),
          ...(input.supplierId ? { supplierId: input.supplierId } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.materialSupplierLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MATERIALSUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialSupplier",
        recordId: String(parsedId),
        description: "Updated MaterialSupplier record",
        values: materialSupplier as any,
        ipAddress,
        userAgent,
      });

      return {
        materialSupplier: materialSupplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialSupplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MaterialSupplierPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const materialSupplier = await this.prisma.materialSupplier.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.materialSupplierLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MATERIALSUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialSupplier",
        recordId: String(parsedId),
        description: "Deleted MaterialSupplier record",
        ipAddress,
        userAgent,
      });

      return {
        materialSupplier: materialSupplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialSupplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MaterialSupplierPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const materialSupplier = await this.prisma.materialSupplier.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.materialSupplierLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MATERIALSUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialSupplier",
        recordId: String(parsedId),
        description: "Restored MaterialSupplier record",
        ipAddress,
        userAgent,
      });

      return {
        materialSupplier: materialSupplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialSupplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
