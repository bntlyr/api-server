import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateSupplierInput,
  SupplierFilterInput,
  PaginationInput,
  UpdateSupplierInput,
  SupplierConnection,
  SupplierPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateSupplierInput, validateUpdateSupplierInput } from "./helpers/supplier.helper.js";

import { SupplierLoader } from "./supplier.loader.js";

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierLoader: SupplierLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.supplierLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: SupplierFilterInput | null,
  ): Promise<SupplierConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "type", "serviceType", "contactPerson", "contactNumber", "telephoneNumber", "faxNumber", "emailAddress", "address", "country", "taxId", "paymentTerms", "currency", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.supplier.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.supplier.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as SupplierConnection;
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
      } as unknown as SupplierConnection;
    }
  }

  async create(input: CreateSupplierInput, context?: any): Promise<SupplierPayload> {
    const validationError = validateCreateSupplierInput(input);
    if (validationError) {
      return {
        supplier: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const supplier = await this.prisma.supplier.create({
        data: {
          name: input.name,
          code: input.code,
          ...(input.type ? { type: input.type } : {}),
          serviceType: input.serviceType,
          contactPerson: input.contactPerson,
          contactNumber: input.contactNumber,
          telephoneNumber: input.telephoneNumber,
          faxNumber: input.faxNumber,
          emailAddress: input.emailAddress,
          address: input.address,
          country: input.country,
          ...(input.taxId ? { taxId: input.taxId } : {}),
          paymentTerms: input.paymentTerms,
          currency: input.currency,
          statusCodeId: input.statusCodeId ?? null,
          ...(input.remarks ? { remarks: input.remarks } : {}),
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_SUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "Supplier",
        recordId: String(supplier.id),
        description: "Created Supplier record",
        values: supplier as any,
        ipAddress,
        userAgent,
      });

      return {
        supplier: supplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        supplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateSupplierInput,
    context?: any,
  ): Promise<SupplierPayload> {
    const validationError = validateUpdateSupplierInput(input);
    if (validationError) {
      return {
        supplier: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const supplier = await this.prisma.supplier.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.serviceType ? { serviceType: input.serviceType } : {}),
          ...(input.contactPerson ? { contactPerson: input.contactPerson } : {}),
          ...(input.contactNumber ? { contactNumber: input.contactNumber } : {}),
          ...(input.telephoneNumber ? { telephoneNumber: input.telephoneNumber } : {}),
          ...(input.faxNumber ? { faxNumber: input.faxNumber } : {}),
          ...(input.emailAddress ? { emailAddress: input.emailAddress } : {}),
          ...(input.address ? { address: input.address } : {}),
          ...(input.country ? { country: input.country } : {}),
          ...(input.taxId ? { taxId: input.taxId } : {}),
          ...(input.paymentTerms ? { paymentTerms: input.paymentTerms } : {}),
          ...(input.currency ? { currency: input.currency } : {}),
          ...(input.statusCodeId !== undefined ? { statusCodeId: input.statusCodeId ?? null } : {}),
          ...(input.remarks ? { remarks: input.remarks } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.supplierLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_SUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "Supplier",
        recordId: String(parsedId),
        description: "Updated Supplier record",
        values: supplier as any,
        ipAddress,
        userAgent,
      });

      return {
        supplier: supplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        supplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<SupplierPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const supplier = await this.prisma.supplier.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.supplierLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_SUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "Supplier",
        recordId: String(parsedId),
        description: "Deleted Supplier record",
        ipAddress,
        userAgent,
      });

      return {
        supplier: supplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        supplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<SupplierPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const supplier = await this.prisma.supplier.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.supplierLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_SUPPLIER",
        method: "GRAPHQL_MUTATION",
        tableName: "Supplier",
        recordId: String(parsedId),
        description: "Restored Supplier record",
        ipAddress,
        userAgent,
      });

      return {
        supplier: supplier as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        supplier: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
