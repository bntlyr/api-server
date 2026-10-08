import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import type {
  CreateCustomerInput,
  CustomerFilterInput,
  PaginationInput,
  UpdateCustomerInput,
  CustomerConnection,
  CustomerPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateCustomerInput, validateUpdateCustomerInput } from "./helpers/customer.helper.js";

import { CustomerLoader } from "./customer.loader.js";

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerLoader: CustomerLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.customerLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: CustomerFilterInput | null,
  ): Promise<CustomerConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["name", "code", "type", "contactPerson", "contactNumber", "telephoneNumber", "faxNumber", "emailAddress", "address", "country", "taxId", "paymentTerms", "shippingAddress", "shippingContactPerson", "shippingContactNumber", "shippingEmailAddress", "currency", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.customer.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as CustomerConnection;
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
      } as unknown as CustomerConnection;
    }
  }

  async create(input: CreateCustomerInput, context?: any): Promise<CustomerPayload> {
    const validationError = validateCreateCustomerInput(input);
    if (validationError) {
      return {
        customer: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const customer = await this.prisma.customer.create({
        data: {
          name: input.name,
          code: input.code,
          ...(input.type ? { type: input.type } : {}),
          contactPerson: input.contactPerson,
          contactNumber: input.contactNumber,
          telephoneNumber: input.telephoneNumber,
          faxNumber: input.faxNumber,
          emailAddress: input.emailAddress,
          address: input.address,
          country: input.country,
          taxId: input.taxId,
          paymentTerms: input.paymentTerms,
          shippingAddress: input.shippingAddress,
          shippingContactPerson: input.shippingContactPerson,
          shippingContactNumber: input.shippingContactNumber,
          shippingEmailAddress: input.shippingEmailAddress,
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
        action: "CREATE_CUSTOMER",
        method: "GRAPHQL_MUTATION",
        tableName: "Customer",
        recordId: String(customer.id),
        description: "Created Customer record",
        values: customer as any,
        ipAddress,
        userAgent,
      });

      return {
        customer: customer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        customer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateCustomerInput,
    context?: any,
  ): Promise<CustomerPayload> {
    const validationError = validateUpdateCustomerInput(input);
    if (validationError) {
      return {
        customer: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const customer = await this.prisma.customer.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.code ? { code: input.code } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.contactPerson ? { contactPerson: input.contactPerson } : {}),
          ...(input.contactNumber ? { contactNumber: input.contactNumber } : {}),
          ...(input.telephoneNumber ? { telephoneNumber: input.telephoneNumber } : {}),
          ...(input.faxNumber ? { faxNumber: input.faxNumber } : {}),
          ...(input.emailAddress ? { emailAddress: input.emailAddress } : {}),
          ...(input.address ? { address: input.address } : {}),
          ...(input.country ? { country: input.country } : {}),
          ...(input.taxId ? { taxId: input.taxId } : {}),
          ...(input.paymentTerms ? { paymentTerms: input.paymentTerms } : {}),
          ...(input.shippingAddress ? { shippingAddress: input.shippingAddress } : {}),
          ...(input.shippingContactPerson ? { shippingContactPerson: input.shippingContactPerson } : {}),
          ...(input.shippingContactNumber ? { shippingContactNumber: input.shippingContactNumber } : {}),
          ...(input.shippingEmailAddress ? { shippingEmailAddress: input.shippingEmailAddress } : {}),
          ...(input.currency ? { currency: input.currency } : {}),
          ...(input.statusCodeId !== undefined ? { statusCodeId: input.statusCodeId ?? null } : {}),
          ...(input.remarks ? { remarks: input.remarks } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.customerLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_CUSTOMER",
        method: "GRAPHQL_MUTATION",
        tableName: "Customer",
        recordId: String(parsedId),
        description: "Updated Customer record",
        values: customer as any,
        ipAddress,
        userAgent,
      });

      return {
        customer: customer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        customer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<CustomerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const customer = await this.prisma.customer.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.customerLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_CUSTOMER",
        method: "GRAPHQL_MUTATION",
        tableName: "Customer",
        recordId: String(parsedId),
        description: "Deleted Customer record",
        ipAddress,
        userAgent,
      });

      return {
        customer: customer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        customer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<CustomerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const customer = await this.prisma.customer.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.customerLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_CUSTOMER",
        method: "GRAPHQL_MUTATION",
        tableName: "Customer",
        recordId: String(parsedId),
        description: "Restored Customer record",
        ipAddress,
        userAgent,
      });

      return {
        customer: customer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        customer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
