import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateBoxTypeInput,
  BoxTypeFilterInput,
  PaginationInput,
  UpdateBoxTypeInput,
  BoxTypeConnection,
  BoxTypePayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateBoxTypeInput, validateUpdateBoxTypeInput } from "./helpers/box-type.helper.js";

import { BoxTypeLoader } from "./box-type.loader.js";

@Injectable()
export class BoxTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boxTypeLoader: BoxTypeLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.boxTypeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: BoxTypeFilterInput | null,
  ): Promise<BoxTypeConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "description"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.boxType.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.boxType.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as BoxTypeConnection;
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
      } as unknown as BoxTypeConnection;
    }
  }

  async create(input: CreateBoxTypeInput, context?: any): Promise<BoxTypePayload> {
    const validationError = validateCreateBoxTypeInput(input);
    if (validationError) {
      return {
        boxType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const boxType = await this.prisma.boxType.create({
        data: {
          name: input.name,
          code: input.code,
          description: input.description ?? null,
          ...(input.weight ? { weight: input.weight } : {}),
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_BOXTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxType",
        recordId: String(boxType.id),
        description: "Created BoxType record",
        values: boxType as any,
        ipAddress,
        userAgent,
      });

      return {
        boxType: boxType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateBoxTypeInput,
    context?: any,
  ): Promise<BoxTypePayload> {
    const validationError = validateUpdateBoxTypeInput(input);
    if (validationError) {
      return {
        boxType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxType = await this.prisma.boxType.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.weight ? { weight: input.weight } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.boxTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_BOXTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxType",
        recordId: String(parsedId),
        description: "Updated BoxType record",
        values: boxType as any,
        ipAddress,
        userAgent,
      });

      return {
        boxType: boxType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<BoxTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxType = await this.prisma.boxType.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.boxTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_BOXTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxType",
        recordId: String(parsedId),
        description: "Deleted BoxType record",
        ipAddress,
        userAgent,
      });

      return {
        boxType: boxType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<BoxTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxType = await this.prisma.boxType.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.boxTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_BOXTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxType",
        recordId: String(parsedId),
        description: "Restored BoxType record",
        ipAddress,
        userAgent,
      });

      return {
        boxType: boxType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
