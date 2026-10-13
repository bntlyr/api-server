import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMaterialInput,
  MaterialFilterInput,
  PaginationInput,
  UpdateMaterialInput,
  MaterialConnection,
  MaterialPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMaterialInput, validateUpdateMaterialInput } from "./helpers/material.helper.js";

import { MaterialLoader } from "./material.loader.js";

@Injectable()
export class MaterialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialLoader: MaterialLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.materialLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MaterialFilterInput | null,
    context?: any,
  ): Promise<MaterialConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "oldCode", "note", "modelNo", "stockKeepingUnit", "description", "category", "type", "unitOfMeasurement", "weightUom"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.material.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.material.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MaterialConnection;
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
      } as unknown as MaterialConnection;
    }
  }

  async create(input: CreateMaterialInput, context?: any): Promise<MaterialPayload> {
    const validationError = validateCreateMaterialInput(input);
    if (validationError) {
      return {
        material: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const material = await this.prisma.$transaction(async (tx) => {
        const created = await tx.material.create({
          data: {
            name: input.name,
            oldCode: input.oldCode ?? null,
            ...(input.minStock != null ? { minStock: input.minStock } : {}),
            note: input.note ?? null,
            modelNo: input.modelNo ?? null,
            shelfLife: input.shelfLife ?? null,
            stockKeepingUnit: input.stockKeepingUnit,
            description: input.description ?? null,
            category: input.category,
            type: input.type,
            ...(input.unitOfMeasurement != null ? { unitOfMeasurement: input.unitOfMeasurement } : {}),
            ...(input.weight != null ? { weight: input.weight } : {}),
            ...(input.weightUom != null ? { weightUom: input.weightUom } : {}),
            ...(input.cost != null ? { cost: input.cost } : {}),
            materialGroupId: input.materialGroupId ?? null,
            sectionId: input.sectionId ?? null,
            rawMaterialId: input.rawMaterialId ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        if (input.supplierIds && input.supplierIds.length > 0) {
          await tx.materialSupplier.createMany({
            data: input.supplierIds.map((supplierId) => ({
              materialId: created.id,
              supplierId,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
            skipDuplicates: true,
          });
        }

        return created;
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "Material",
        recordId: String(material.id),
        description: "Created Material record",
        values: material as any,
        ipAddress,
        userAgent,
      });

      return {
        material: material as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        material: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMaterialInput,
    context?: any,
  ): Promise<MaterialPayload> {
    const validationError = validateUpdateMaterialInput(input);
    if (validationError) {
      return {
        material: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const material = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.material.update({
          where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
          data: {
            ...(input.name != null ? { name: input.name } : {}),
            ...(input.oldCode !== undefined ? { oldCode: input.oldCode ?? null } : {}),
            ...(input.minStock != null ? { minStock: input.minStock } : {}),
            ...(input.note !== undefined ? { note: input.note ?? null } : {}),
            ...(input.modelNo !== undefined ? { modelNo: input.modelNo ?? null } : {}),
            ...(input.shelfLife !== undefined ? { shelfLife: input.shelfLife ?? null } : {}),
            ...(input.stockKeepingUnit != null ? { stockKeepingUnit: input.stockKeepingUnit } : {}),
            ...(input.description !== undefined ? { description: input.description ?? null } : {}),
            ...(input.category != null ? { category: input.category } : {}),
            ...(input.type != null ? { type: input.type } : {}),
            ...(input.unitOfMeasurement != null ? { unitOfMeasurement: input.unitOfMeasurement } : {}),
            ...(input.weight != null ? { weight: input.weight } : {}),
            ...(input.weightUom != null ? { weightUom: input.weightUom } : {}),
            ...(input.cost != null ? { cost: input.cost } : {}),
            ...(input.materialGroupId !== undefined ? { materialGroupId: input.materialGroupId ?? null } : {}),
            ...(input.sectionId !== undefined ? { sectionId: input.sectionId ?? null } : {}),
            ...(input.rawMaterialId !== undefined ? { rawMaterialId: input.rawMaterialId ?? null } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.supplierIds !== undefined) {
          await tx.materialSupplier.deleteMany({
            where: { materialId: updated.id },
          });
          if (input.supplierIds && input.supplierIds.length > 0) {
            await tx.materialSupplier.createMany({
              data: input.supplierIds.map((supplierId) => ({
                materialId: updated.id,
                supplierId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        return updated;
      });

      this.materialLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "Material",
        recordId: String(parsedId),
        description: "Updated Material record",
        values: material as any,
        ipAddress,
        userAgent,
      });

      return {
        material: material as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        material: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MaterialPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const material = await this.prisma.material.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.materialLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "Material",
        recordId: String(parsedId),
        description: "Deleted Material record",
        ipAddress,
        userAgent,
      });

      return {
        material: material as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        material: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MaterialPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const material = await this.prisma.material.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.materialLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MATERIAL",
        method: "GRAPHQL_MUTATION",
        tableName: "Material",
        recordId: String(parsedId),
        description: "Restored Material record",
        ipAddress,
        userAgent,
      });

      return {
        material: material as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        material: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
