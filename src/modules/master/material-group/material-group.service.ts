import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMaterialGroupInput,
  MaterialGroupFilterInput,
  PaginationInput,
  UpdateMaterialGroupInput,
  MaterialGroupConnection,
  MaterialGroupPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMaterialGroupInput, validateUpdateMaterialGroupInput } from "./helpers/material-group.helper.js";

import { MaterialGroupLoader } from "./material-group.loader.js";

@Injectable()
export class MaterialGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialGroupLoader: MaterialGroupLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.materialGroupLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MaterialGroupFilterInput | null,
    context?: any,
  ): Promise<MaterialGroupConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "createdById", "updatedById"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.materialGroup.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.materialGroup.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MaterialGroupConnection;
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
      } as unknown as MaterialGroupConnection;
    }
  }

  async create(input: CreateMaterialGroupInput, context?: any): Promise<MaterialGroupPayload> {
    const validationError = validateCreateMaterialGroupInput(input);
    if (validationError) {
      return {
        materialGroup: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const materialGroup = await this.prisma.materialGroup.create({
        data: {
          name: input.name,
          code: input.code,
          createdById: userId !== "SYSTEM" ? userId : null,
          updatedById: userId !== "SYSTEM" ? userId : null,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MATERIALGROUP",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialGroup",
        recordId: String(materialGroup.id),
        description: "Created MaterialGroup record",
        values: materialGroup as any,
        ipAddress,
        userAgent,
      });

      return {
        materialGroup: materialGroup as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialGroup: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMaterialGroupInput,
    context?: any,
  ): Promise<MaterialGroupPayload> {
    const validationError = validateUpdateMaterialGroupInput(input);
    if (validationError) {
      return {
        materialGroup: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const materialGroup = await this.prisma.materialGroup.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          updatedById: userId !== "SYSTEM" ? userId : undefined,
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.materialGroupLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MATERIALGROUP",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialGroup",
        recordId: String(parsedId),
        description: "Updated MaterialGroup record",
        values: materialGroup as any,
        ipAddress,
        userAgent,
      });

      return {
        materialGroup: materialGroup as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialGroup: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MaterialGroupPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const materialGroup = await this.prisma.materialGroup.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.materialGroupLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MATERIALGROUP",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialGroup",
        recordId: String(parsedId),
        description: "Deleted MaterialGroup record",
        ipAddress,
        userAgent,
      });

      return {
        materialGroup: materialGroup as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialGroup: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MaterialGroupPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const materialGroup = await this.prisma.materialGroup.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.materialGroupLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MATERIALGROUP",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialGroup",
        recordId: String(parsedId),
        description: "Restored MaterialGroup record",
        ipAddress,
        userAgent,
      });

      return {
        materialGroup: materialGroup as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        materialGroup: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
