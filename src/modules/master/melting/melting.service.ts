import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMeltingInput,
  MeltingFilterInput,
  PaginationInput,
  UpdateMeltingInput,
  MeltingConnection,
  MeltingPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMeltingInput, validateUpdateMeltingInput } from "./helpers/melting.helper.js";

import { MeltingLoader } from "./melting.loader.js";

@Injectable()
export class MeltingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meltingLoader: MeltingLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.meltingLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MeltingFilterInput | null,
  ): Promise<MeltingConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["mixture", "materialRatio", "additives", "deoxidizer", "createdById", "updatedById"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.melting.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.melting.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MeltingConnection;
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
      } as unknown as MeltingConnection;
    }
  }

  async create(input: CreateMeltingInput, context?: any): Promise<MeltingPayload> {
    const validationError = validateCreateMeltingInput(input);
    if (validationError) {
      return {
        melting: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const melting = await this.prisma.melting.create({
        data: {
          rawMaterialId: input.rawMaterialId,
          mixture: input.mixture ?? null,
          materialRatio: input.materialRatio ?? null,
          meltingWeight: input.meltingWeight ?? null,
          temperature: input.temperature ?? null,
          additives: input.additives ?? null,
          deoxidizer: input.deoxidizer ?? null,
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
        action: "CREATE_MELTING",
        method: "GRAPHQL_MUTATION",
        tableName: "Melting",
        recordId: String(melting.id),
        description: "Created Melting record",
        values: melting as any,
        ipAddress,
        userAgent,
      });

      return {
        melting: melting as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        melting: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMeltingInput,
    context?: any,
  ): Promise<MeltingPayload> {
    const validationError = validateUpdateMeltingInput(input);
    if (validationError) {
      return {
        melting: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const melting = await this.prisma.melting.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.rawMaterialId ? { rawMaterialId: input.rawMaterialId } : {}),
          ...(input.mixture !== undefined ? { mixture: input.mixture ?? null } : {}),
          ...(input.materialRatio !== undefined ? { materialRatio: input.materialRatio ?? null } : {}),
          ...(input.meltingWeight !== undefined ? { meltingWeight: input.meltingWeight ?? null } : {}),
          ...(input.temperature !== undefined ? { temperature: input.temperature ?? null } : {}),
          ...(input.additives !== undefined ? { additives: input.additives ?? null } : {}),
          ...(input.deoxidizer !== undefined ? { deoxidizer: input.deoxidizer ?? null } : {}),
          ...(input.createdById !== undefined ? { createdById: input.createdById ?? null } : {}),
          ...(input.updatedById !== undefined ? { updatedById: input.updatedById ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.meltingLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MELTING",
        method: "GRAPHQL_MUTATION",
        tableName: "Melting",
        recordId: String(parsedId),
        description: "Updated Melting record",
        values: melting as any,
        ipAddress,
        userAgent,
      });

      return {
        melting: melting as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        melting: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MeltingPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const melting = await this.prisma.melting.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.meltingLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MELTING",
        method: "GRAPHQL_MUTATION",
        tableName: "Melting",
        recordId: String(parsedId),
        description: "Deleted Melting record",
        ipAddress,
        userAgent,
      });

      return {
        melting: melting as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        melting: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MeltingPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const melting = await this.prisma.melting.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.meltingLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MELTING",
        method: "GRAPHQL_MUTATION",
        tableName: "Melting",
        recordId: String(parsedId),
        description: "Restored Melting record",
        ipAddress,
        userAgent,
      });

      return {
        melting: melting as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        melting: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
