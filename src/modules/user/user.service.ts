import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { TokenService } from "../../auth/services/token.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { pemDecrypt } from "../../auth/helpers/security.helper.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import { UserLoader } from "./user.loader.js";
import type {
  User,
  CreateUserInput,
  UserFilterInput,
  PaginationInput,
  UpdateUserInput,
  UserConnection,
  UserPayload,
} from "../../generated/graphql/types.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { validateCreateUserInput, validateUpdateUserInput } from "./helpers/user.helper.js";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userLoader: UserLoader,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: string, context?: any) {
    extractContextInfo(context);
    return this.userLoader.byId.load(id);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: UserFilterInput | null,
    context?: any,
  ): Promise<UserConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: false,
      });

      const where = buildPrismaWhere(filter, [
        "id",
        "username",
        "email",
        "name",
        "employeeId",
        "employeeName",
        "emailAddress",
        "cellphone",
      ]);

      const [items, totalCount] = await Promise.all([
        this.prisma.user.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.user.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as UserConnection;
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
      } as unknown as UserConnection;
    }
  }

  async create(input: CreateUserInput, context?: any): Promise<UserPayload> {
    const validationError = validateCreateUserInput(input);
    if (validationError) {
      return {
        user: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const rawPassword = pemDecrypt(input.password) || input.password;
      const username = (pemDecrypt(input.username) || input.username).trim();
      const email = (pemDecrypt(input.email) || input.email).trim().toLowerCase();

      // Hash password with 12 salt rounds
      const hashedPassword = await this.tokenService.hashPassword(rawPassword);

      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          name: input.name ?? null,
          password: hashedPassword,
          employeeId: input.employeeId ?? null,
          employeeName: input.employeeName ?? null,
          emailAddress: input.emailAddress ?? null,
          cellphone: input.cellphone ?? null,
          validFrom: input.validFrom ? new Date(input.validFrom) : null,
          lastLoginTS: input.lastLoginTS ? new Date(input.lastLoginTS) : null,
          superAdmin: input.superAdmin ?? false,
          statusCodeId: input.statusCodeId ?? null,
          sectionId: input.sectionId ?? null,
          positionId: input.positionId ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_USER",
        method: "GRAPHQL_MUTATION",
        tableName: "User",
        recordId: user.id,
        description: `Created user ${user.username}`,
        values: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          employeeId: user.employeeId,
          superAdmin: user.superAdmin,
          statusCodeId: user.statusCodeId,
          sectionId: user.sectionId,
          positionId: user.positionId,
        },
        ipAddress,
        userAgent,
      });

      return {
        user: user as unknown as User,
        userErrors: [],
      };
    } catch (error) {
      return {
        user: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(id: string, input: UpdateUserInput, context?: any): Promise<UserPayload> {
    const validationError = validateUpdateUserInput(input);
    if (validationError) {
      return {
        user: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      let hashedPassword = undefined;
      if (input.password) {
        const rawPassword = pemDecrypt(input.password) || input.password;
        hashedPassword = await this.tokenService.hashPassword(rawPassword);
      }

      const cleanUsername = input.username ? (pemDecrypt(input.username) || input.username).trim() : undefined;
      const cleanEmail = input.email ? (pemDecrypt(input.email) || input.email).trim().toLowerCase() : undefined;

      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(cleanUsername ? { username: cleanUsername } : {}),
          ...(cleanEmail ? { email: cleanEmail } : {}),
          ...(input.name !== undefined ? { name: input.name ?? null } : {}),
          ...(input.employeeId !== undefined ? { employeeId: input.employeeId ?? null } : {}),
          ...(input.employeeName !== undefined ? { employeeName: input.employeeName ?? null } : {}),
          ...(input.emailAddress !== undefined ? { emailAddress: input.emailAddress ?? null } : {}),
          ...(input.cellphone !== undefined ? { cellphone: input.cellphone ?? null } : {}),
          ...(input.validFrom !== undefined ? { validFrom: input.validFrom ? new Date(input.validFrom) : null } : {}),
          ...(input.lastLoginTS !== undefined ? { lastLoginTS: input.lastLoginTS ? new Date(input.lastLoginTS) : null } : {}),
          ...(input.superAdmin !== undefined ? { superAdmin: Boolean(input.superAdmin) } : {}),
          ...(input.statusCodeId !== undefined ? { statusCodeId: input.statusCodeId } : {}),
          ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
          ...(input.positionId !== undefined ? { positionId: input.positionId } : {}),
          ...(hashedPassword ? { password: hashedPassword } : {}),
        },
      });

      this.userLoader.clear(id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_USER",
        method: "GRAPHQL_MUTATION",
        tableName: "User",
        recordId: user.id,
        description: `Updated user ${user.username}`,
        values: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          employeeId: user.employeeId,
          superAdmin: user.superAdmin,
          statusCodeId: user.statusCodeId,
          sectionId: user.sectionId,
          positionId: user.positionId,
        },
        ipAddress,
        userAgent,
      });

      return {
        user: user as unknown as User,
        userErrors: [],
      };
    } catch (error) {
      return {
        user: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: string, context?: any): Promise<UserPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const user = await this.prisma.user.delete({
        where: { id },
      });

      this.userLoader.clear(id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_USER",
        method: "GRAPHQL_MUTATION",
        tableName: "User",
        recordId: user.id,
        description: `Deleted user ${user.username}`,
        ipAddress,
        userAgent,
      });

      return {
        user: user as unknown as User,
        userErrors: [],
      };
    } catch (error) {
      return {
        user: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: string, context?: any): Promise<UserPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const user = await this.prisma.user.restore({
        id,
      });

      this.userLoader.clear(id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_USER",
        method: "GRAPHQL_MUTATION",
        tableName: "User",
        recordId: user.id,
        description: `Restored user ${user.username}`,
        ipAddress,
        userAgent,
      });

      return {
        user: user as unknown as User,
        userErrors: [],
      };
    } catch (error) {
      return {
        user: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
