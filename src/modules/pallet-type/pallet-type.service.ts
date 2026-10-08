import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreatePalletTypeInput,
  PalletTypeFilterInput,
  PaginationInput,
  UpdatePalletTypeInput,
  PalletTypeConnection,
  PalletTypePayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreatePalletTypeInput, validateUpdatePalletTypeInput } from "./helpers/pallet-type.helper.js";

import { PalletTypeLoader } from "./pallet-type.loader.js";

@Injectable()
export class PalletTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly palletTypeLoader: PalletTypeLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.palletTypeLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: PalletTypeFilterInput | null,
  ): Promise<PalletTypeConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "description"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.palletType.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.palletType.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as PalletTypeConnection;
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
      } as unknown as PalletTypeConnection;
    }
  }

  async create(input: CreatePalletTypeInput, context?: any): Promise<PalletTypePayload> {
    const validationError = validateCreatePalletTypeInput(input);
    if (validationError) {
      return {
        palletType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const palletType = await this.prisma.palletType.create({
        data: {
          name: input.name,
          description: input.description,
          ...(input.unitPrice ? { unitPrice: input.unitPrice } : {}),
          ...(input.weight ? { weight: input.weight } : {}),
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PALLETTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletType",
        recordId: String(palletType.id),
        description: "Created PalletType record",
        values: palletType as any,
        ipAddress,
        userAgent,
      });

      return {
        palletType: palletType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdatePalletTypeInput,
    context?: any,
  ): Promise<PalletTypePayload> {
    const validationError = validateUpdatePalletTypeInput(input);
    if (validationError) {
      return {
        palletType: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const palletType = await this.prisma.palletType.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description ? { description: input.description } : {}),
          ...(input.unitPrice ? { unitPrice: input.unitPrice } : {}),
          ...(input.weight ? { weight: input.weight } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.palletTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PALLETTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletType",
        recordId: String(parsedId),
        description: "Updated PalletType record",
        values: palletType as any,
        ipAddress,
        userAgent,
      });

      return {
        palletType: palletType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<PalletTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const palletType = await this.prisma.palletType.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.palletTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PALLETTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletType",
        recordId: String(parsedId),
        description: "Deleted PalletType record",
        ipAddress,
        userAgent,
      });

      return {
        palletType: palletType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<PalletTypePayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const palletType = await this.prisma.palletType.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.palletTypeLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PALLETTYPE",
        method: "GRAPHQL_MUTATION",
        tableName: "PalletType",
        recordId: String(parsedId),
        description: "Restored PalletType record",
        ipAddress,
        userAgent,
      });

      return {
        palletType: palletType as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        palletType: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
