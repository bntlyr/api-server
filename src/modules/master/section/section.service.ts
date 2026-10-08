import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateSectionInput,
  SectionFilterInput,
  PaginationInput,
  UpdateSectionInput,
  SectionConnection,
  SectionPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateSectionInput, validateUpdateSectionInput } from "./helpers/section.helper.js";

import { SectionLoader } from "./section.loader.js";

@Injectable()
export class SectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sectionLoader: SectionLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.sectionLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: SectionFilterInput | null,
  ): Promise<SectionConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "description"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.section.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.section.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as SectionConnection;
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
      } as unknown as SectionConnection;
    }
  }

  async create(input: CreateSectionInput, context?: any): Promise<SectionPayload> {
    const validationError = validateCreateSectionInput(input);
    if (validationError) {
      return {
        section: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const section = await this.prisma.section.create({
        data: {
          name: input.name,
          ...(input.code ? { code: input.code } : {}),
          description: input.description ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_SECTION",
        method: "GRAPHQL_MUTATION",
        tableName: "Section",
        recordId: String(section.id),
        description: "Created Section record",
        values: section as any,
        ipAddress,
        userAgent,
      });

      return {
        section: section as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        section: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateSectionInput,
    context?: any,
  ): Promise<SectionPayload> {
    const validationError = validateUpdateSectionInput(input);
    if (validationError) {
      return {
        section: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const section = await this.prisma.section.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.sectionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_SECTION",
        method: "GRAPHQL_MUTATION",
        tableName: "Section",
        recordId: String(parsedId),
        description: "Updated Section record",
        values: section as any,
        ipAddress,
        userAgent,
      });

      return {
        section: section as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        section: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<SectionPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const section = await this.prisma.section.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.sectionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_SECTION",
        method: "GRAPHQL_MUTATION",
        tableName: "Section",
        recordId: String(parsedId),
        description: "Deleted Section record",
        ipAddress,
        userAgent,
      });

      return {
        section: section as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        section: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<SectionPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const section = await this.prisma.section.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.sectionLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_SECTION",
        method: "GRAPHQL_MUTATION",
        tableName: "Section",
        recordId: String(parsedId),
        description: "Restored Section record",
        ipAddress,
        userAgent,
      });

      return {
        section: section as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        section: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
