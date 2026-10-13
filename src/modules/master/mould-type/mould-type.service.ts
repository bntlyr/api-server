import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMouldTypeInput,
  MouldTypeFilterInput,
  PaginationInput,
  UpdateMouldTypeInput,
  MouldTypeConnection,
  MouldTypePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMouldTypeInput, validateUpdateMouldTypeInput } from "./helpers/mould-type.helper.js";

import { MouldTypeLoader } from "./mould-type.loader.js";

@Injectable()
export class MouldTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mouldTypeLoader: MouldTypeLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.mouldTypeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MouldTypeFilterInput | null,
    context?: any,
  ): Promise<MouldTypeConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.mouldType.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.mouldType.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MouldTypeConnection;
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
      } as unknown as MouldTypeConnection;
    }
  }

  async create(input: CreateMouldTypeInput, context?: any): Promise<MouldTypePayload> {
    const validationError = validateCreateMouldTypeInput(input);
    if (validationError) {
      return {
        mouldType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const mouldType = await this.prisma.mouldType.create({
        data: {
          name: input.name,
          itemTypeId: input.itemTypeId ?? null,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MOULDTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldType",
        recordId: String(mouldType.id),
        description: "Created MouldType record",
        values: mouldType as any,
        ipAddress,
        userAgent,
      });

      return {
        mouldType: mouldType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMouldTypeInput,
    context?: any,
  ): Promise<MouldTypePayload> {
    const validationError = validateUpdateMouldTypeInput(input);
    if (validationError) {
      return {
        mouldType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mouldType = await this.prisma.mouldType.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.itemTypeId !== undefined ? { itemTypeId: input.itemTypeId ?? null } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.mouldTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MOULDTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldType",
        recordId: String(parsedId),
        description: "Updated MouldType record",
        values: mouldType as any,
        ipAddress,
        userAgent,
      });

      return {
        mouldType: mouldType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MouldTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mouldType = await this.prisma.mouldType.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.mouldTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MOULDTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldType",
        recordId: String(parsedId),
        description: "Deleted MouldType record",
        ipAddress,
        userAgent,
      });

      return {
        mouldType: mouldType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MouldTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mouldType = await this.prisma.mouldType.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.mouldTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MOULDTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "MouldType",
        recordId: String(parsedId),
        description: "Restored MouldType record",
        ipAddress,
        userAgent,
      });

      return {
        mouldType: mouldType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mouldType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
