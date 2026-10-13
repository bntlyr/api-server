import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateHolidayInput,
  HolidayFilterInput,
  PaginationInput,
  UpdateHolidayInput,
  HolidayConnection,
  HolidayPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateHolidayInput, validateUpdateHolidayInput } from "./helpers/holiday.helper.js";

import { HolidayLoader } from "./holiday.loader.js";

@Injectable()
export class HolidayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holidayLoader: HolidayLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.holidayLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: HolidayFilterInput | null,
    context?: any,
  ): Promise<HolidayConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.holiday.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.holiday.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as HolidayConnection;
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
      } as unknown as HolidayConnection;
    }
  }

  async create(input: CreateHolidayInput, context?: any): Promise<HolidayPayload> {
    const validationError = validateCreateHolidayInput(input);
    if (validationError) {
      return {
        holiday: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const holiday = await this.prisma.holiday.create({
        data: {
          name: input.name,
          date: input.date,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_HOLIDAY",
        method: "GRAPHQL_MUTATION",
        tableName: "Holiday",
        recordId: String(holiday.id),
        description: "Created Holiday record",
        values: holiday as any,
        ipAddress,
        userAgent,
      });

      return {
        holiday: holiday as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        holiday: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateHolidayInput,
    context?: any,
  ): Promise<HolidayPayload> {
    const validationError = validateUpdateHolidayInput(input);
    if (validationError) {
      return {
        holiday: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const holiday = await this.prisma.holiday.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.date ? { date: input.date } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.holidayLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_HOLIDAY",
        method: "GRAPHQL_MUTATION",
        tableName: "Holiday",
        recordId: String(parsedId),
        description: "Updated Holiday record",
        values: holiday as any,
        ipAddress,
        userAgent,
      });

      return {
        holiday: holiday as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        holiday: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<HolidayPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const holiday = await this.prisma.holiday.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.holidayLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_HOLIDAY",
        method: "GRAPHQL_MUTATION",
        tableName: "Holiday",
        recordId: String(parsedId),
        description: "Deleted Holiday record",
        ipAddress,
        userAgent,
      });

      return {
        holiday: holiday as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        holiday: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<HolidayPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const holiday = await this.prisma.holiday.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.holidayLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_HOLIDAY",
        method: "GRAPHQL_MUTATION",
        tableName: "Holiday",
        recordId: String(parsedId),
        description: "Restored Holiday record",
        ipAddress,
        userAgent,
      });

      return {
        holiday: holiday as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        holiday: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
