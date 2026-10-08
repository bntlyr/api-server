import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateMouldInput,
  MouldFilterInput,
  PaginationInput,
  UpdateMouldInput,
  MouldConnection,
  MouldPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateMouldInput, validateUpdateMouldInput } from "./helpers/mould.helper.js";

import { MouldLoader } from "./mould.loader.js";

@Injectable()
export class MouldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mouldLoader: MouldLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.mouldLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MouldFilterInput | null,
  ): Promise<MouldConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.mould.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.mould.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MouldConnection;
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
      } as unknown as MouldConnection;
    }
  }

  async create(input: CreateMouldInput, context?: any): Promise<MouldPayload> {
    const validationError = validateCreateMouldInput(input);
    if (validationError) {
      return {
        mould: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const mould = await this.prisma.$transaction(async (tx) => {
        const created = await tx.mould.create({
          data: {
            name: input.name,
            code: input.code,
            numberOfCopies: input.numberOfCopies,
            ...(input.compatibleItems ? { compatibleItems: input.compatibleItems } : {}),
            mouldTypeId: input.mouldTypeId ?? null,
            createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            ...(input.deleted ? { deleted: input.deleted } : {}),
            deletedBy: input.deletedBy ?? null,
          },
        });

        if (input.itemIds && input.itemIds.length > 0) {
          await tx.mouldItem.createMany({
            data: input.itemIds.map((itemId) => ({
              mouldId: created.id,
              itemId,
              createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
              updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
            })),
            skipDuplicates: true,
          });
        }

        return created;
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MOULD",
        method: "GRAPHQL_MUTATION",
        tableName: "Mould",
        recordId: String(mould.id),
        description: "Created Mould record",
        values: mould as any,
        ipAddress,
        userAgent,
      });

      return {
        mould: mould as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mould: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateMouldInput,
    context?: any,
  ): Promise<MouldPayload> {
    const validationError = validateUpdateMouldInput(input);
    if (validationError) {
      return {
        mould: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const mould = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.mould.update({
          where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
          data: {
            ...(input.name ? { name: input.name } : {}),
            ...(input.code ? { code: input.code } : {}),
            ...(input.numberOfCopies ? { numberOfCopies: input.numberOfCopies } : {}),
            ...(input.compatibleItems ? { compatibleItems: input.compatibleItems } : {}),
            ...(input.mouldTypeId !== undefined ? { mouldTypeId: input.mouldTypeId ?? null } : {}),
            ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
            updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
            ...(input.deleted ? { deleted: input.deleted } : {}),
            ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
          },
        });

        if (input.itemIds !== undefined) {
          await tx.mouldItem.deleteMany({
            where: { mouldId: updated.id },
          });
          if (input.itemIds && input.itemIds.length > 0) {
            await tx.mouldItem.createMany({
              data: input.itemIds.map((itemId) => ({
                mouldId: updated.id,
                itemId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        return updated;
      });

      this.mouldLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_MOULD",
        method: "GRAPHQL_MUTATION",
        tableName: "Mould",
        recordId: String(parsedId),
        description: "Updated Mould record",
        values: mould as any,
        ipAddress,
        userAgent,
      });

      return {
        mould: mould as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mould: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<MouldPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mould = await this.prisma.mould.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.mouldLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_MOULD",
        method: "GRAPHQL_MUTATION",
        tableName: "Mould",
        recordId: String(parsedId),
        description: "Deleted Mould record",
        ipAddress,
        userAgent,
      });

      return {
        mould: mould as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mould: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<MouldPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const mould = await this.prisma.mould.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.mouldLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_MOULD",
        method: "GRAPHQL_MUTATION",
        tableName: "Mould",
        recordId: String(parsedId),
        description: "Restored Mould record",
        ipAddress,
        userAgent,
      });

      return {
        mould: mould as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        mould: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
