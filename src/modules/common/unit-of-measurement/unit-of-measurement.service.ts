import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma//prisma.service.js';
import { AuditTrailService } from '../../../auth//services/audit-trail.service.js';
import { extractContextInfo } from '../../../graphql//common/context.helper.js';
import type {
  CreateUnitOfMeasurementInput,
  UnitOfMeasurementFilterInput,
  PaginationInput,
  UpdateUnitOfMeasurementInput,
  UnitOfMeasurementConnection,
  UnitOfMeasurementPayload,
} from '../../../generated//graphql/types.js';
import { createError } from '../../../graphql//common/error.helper.js';
import { buildPrismaWhere } from '../../../graphql//common/filter.helper.js';
import {
  getPrismaPaginationArgs,
  toConnection,
} from '../../../graphql//common/pagination.helper.js';
import {
  validateCreateUnitOfMeasurementInput,
  validateUpdateUnitOfMeasurementInput,
} from './helpers/unit-of-measurement.helper.js';
import { UnitOfMeasurementLoader } from './unit-of-measurement.loader.js';

@Injectable()
export class UnitOfMeasurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfMeasurementLoader: UnitOfMeasurementLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
    return this.unitOfMeasurementLoader.byId.load(
      Number.isNaN(parsedId) ? (id as any) : parsedId,
    );
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: UnitOfMeasurementFilterInput | null,
    context?: any,
  ): Promise<UnitOfMeasurementConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(
        pagination,
        {
          isNumericId: true,
        },
      );

      const where = buildPrismaWhere(filter, [
        'name',
        'code',
        'type',
        'description',
      ]);

      const [items, totalCount] = await Promise.all([
        this.prisma.unitOfMeasurement.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.unitOfMeasurement.count({ where }),
      ]);

      const connection = toConnection(
        items,
        limit,
        totalCount,
        Boolean(pagination?.after),
      );

      return {
        ...connection,
        userErrors: [],
      } as unknown as UnitOfMeasurementConnection;
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
      } as unknown as UnitOfMeasurementConnection;
    }
  }

  async create(
    input: CreateUnitOfMeasurementInput,
    context?: any,
  ): Promise<UnitOfMeasurementPayload> {
    const validationError = validateCreateUnitOfMeasurementInput(input);
    if (validationError) {
      return {
        unitOfMeasurement: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const unitOfMeasurement = await this.prisma.unitOfMeasurement.create({
        data: {
          name: input.name,
          code: input.code,
          ...(input.type ? { type: input.type } : {}),
          description: input.description ?? null,
          createdBy: userId !== 'SYSTEM' ? userId : null,
          updatedBy: userId !== 'SYSTEM' ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'CREATE_UNITOFMEASUREMENT',
        method: 'GRAPHQL_MUTATION',
        tableName: 'UnitOfMeasurement',
        recordId: String(unitOfMeasurement.id),
        description: 'Created UnitOfMeasurement record',
        values: unitOfMeasurement as any,
        ipAddress,
        userAgent,
      });

      return {
        unitOfMeasurement: unitOfMeasurement as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        unitOfMeasurement: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateUnitOfMeasurementInput,
    context?: any,
  ): Promise<UnitOfMeasurementPayload> {
    const validationError = validateUpdateUnitOfMeasurementInput(input);
    if (validationError) {
      return {
        unitOfMeasurement: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      const unitOfMeasurement = await this.prisma.unitOfMeasurement.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.description !== undefined
            ? { description: input.description ?? null }
            : {}),
          updatedBy: userId !== 'SYSTEM' ? userId : undefined,
        },
      });

      this.unitOfMeasurementLoader.clear(
        Number.isNaN(parsedId) ? (id as any) : parsedId,
      );

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'UPDATE_UNITOFMEASUREMENT',
        method: 'GRAPHQL_MUTATION',
        tableName: 'UnitOfMeasurement',
        recordId: String(parsedId),
        description: 'Updated UnitOfMeasurement record',
        values: unitOfMeasurement as any,
        ipAddress,
        userAgent,
      });

      return {
        unitOfMeasurement: unitOfMeasurement as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        unitOfMeasurement: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(
    id: number | string,
    context?: any,
  ): Promise<UnitOfMeasurementPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      const unitOfMeasurement = await this.prisma.unitOfMeasurement.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.unitOfMeasurementLoader.clear(
        Number.isNaN(parsedId) ? (id as any) : parsedId,
      );

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'DELETE_UNITOFMEASUREMENT',
        method: 'GRAPHQL_MUTATION',
        tableName: 'UnitOfMeasurement',
        recordId: String(parsedId),
        description: 'Deleted UnitOfMeasurement record',
        ipAddress,
        userAgent,
      });

      return {
        unitOfMeasurement: unitOfMeasurement as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        unitOfMeasurement: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(
    id: number | string,
    context?: any,
  ): Promise<UnitOfMeasurementPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      const unitOfMeasurement = await this.prisma.unitOfMeasurement.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.unitOfMeasurementLoader.clear(
        Number.isNaN(parsedId) ? (id as any) : parsedId,
      );

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'RESTORE_UNITOFMEASUREMENT',
        method: 'GRAPHQL_MUTATION',
        tableName: 'UnitOfMeasurement',
        recordId: String(parsedId),
        description: 'Restored UnitOfMeasurement record',
        ipAddress,
        userAgent,
      });

      return {
        unitOfMeasurement: unitOfMeasurement as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        unitOfMeasurement: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
