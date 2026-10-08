import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreatePositionInput,
  PositionFilterInput,
  PaginationInput,
  UpdatePositionInput,
  PositionConnection,
  PositionPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreatePositionInput, validateUpdatePositionInput } from "./helpers/position.helper.js";

import { PositionLoader } from "./position.loader.js";

@Injectable()
export class PositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly positionLoader: PositionLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.positionLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: PositionFilterInput | null,
  ): Promise<PositionConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "description"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.position.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.position.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as PositionConnection;
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
      } as unknown as PositionConnection;
    }
  }

  async create(input: CreatePositionInput, context?: any): Promise<PositionPayload> {
    const validationError = validateCreatePositionInput(input);
    if (validationError) {
      return {
        position: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const position = await this.prisma.position.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          sectionId: input.sectionId ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_POSITION",
        method: "GRAPHQL_MUTATION",
        tableName: "Position",
        recordId: String(position.id),
        description: "Created Position record",
        values: position as any,
        ipAddress,
        userAgent,
      });

      return {
        position: position as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        position: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdatePositionInput,
    context?: any,
  ): Promise<PositionPayload> {
    const validationError = validateUpdatePositionInput(input);
    if (validationError) {
      return {
        position: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const position = await this.prisma.position.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.sectionId !== undefined ? { sectionId: input.sectionId ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.positionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_POSITION",
        method: "GRAPHQL_MUTATION",
        tableName: "Position",
        recordId: String(parsedId),
        description: "Updated Position record",
        values: position as any,
        ipAddress,
        userAgent,
      });

      return {
        position: position as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        position: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<PositionPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const position = await this.prisma.position.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.positionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_POSITION",
        method: "GRAPHQL_MUTATION",
        tableName: "Position",
        recordId: String(parsedId),
        description: "Deleted Position record",
        ipAddress,
        userAgent,
      });

      return {
        position: position as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        position: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<PositionPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const position = await this.prisma.position.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.positionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_POSITION",
        method: "GRAPHQL_MUTATION",
        tableName: "Position",
        recordId: String(parsedId),
        description: "Restored Position record",
        ipAddress,
        userAgent,
      });

      return {
        position: position as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        position: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
