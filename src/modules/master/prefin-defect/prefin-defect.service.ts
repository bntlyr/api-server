import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreatePrefinDefectInput,
  PrefinDefectFilterInput,
  PaginationInput,
  UpdatePrefinDefectInput,
  PrefinDefectConnection,
  PrefinDefectPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreatePrefinDefectInput, validateUpdatePrefinDefectInput } from "./helpers/prefin-defect.helper.js";

import { PrefinDefectLoader } from "./prefin-defect.loader.js";

@Injectable()
export class PrefinDefectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prefinDefectLoader: PrefinDefectLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.prefinDefectLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: PrefinDefectFilterInput | null,
  ): Promise<PrefinDefectConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["itemCode", "remarks"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.prefinDefect.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.prefinDefect.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as PrefinDefectConnection;
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
      } as unknown as PrefinDefectConnection;
    }
  }

  async create(input: CreatePrefinDefectInput, context?: any): Promise<PrefinDefectPayload> {
    const validationError = validateCreatePrefinDefectInput(input);
    if (validationError) {
      return {
        prefinDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const prefinDefect = await this.prisma.prefinDefect.create({
        data: {
          bookingId: input.bookingId,
          productionSlipId: input.productionSlipId,
          salesOrderId: input.salesOrderId,
          itemId: input.itemId,
          itemCode: input.itemCode,
          ...(input.aOCut ? { aOCut: input.aOCut } : {}),
          ...(input.eOCut ? { eOCut: input.eOCut } : {}),
          ...(input.aOverShot ? { aOverShot: input.aOverShot } : {}),
          ...(input.eOverShot ? { eOverShot: input.eOverShot } : {}),
          ...(input.aOverSandBlast ? { aOverSandBlast: input.aOverSandBlast } : {}),
          ...(input.eOverSandBlast ? { eOverSandBlast: input.eOverSandBlast } : {}),
          ...(input.remainingCeramics ? { remainingCeramics: input.remainingCeramics } : {}),
          ...(input.gateBurry ? { gateBurry: input.gateBurry } : {}),
          ...(input.aOGrnd ? { aOGrnd: input.aOGrnd } : {}),
          ...(input.eOGrnd ? { eOGrnd: input.eOGrnd } : {}),
          ...(input.overRepair ? { overRepair: input.overRepair } : {}),
          ...(input.aNGSpotTigWeld ? { aNGSpotTigWeld: input.aNGSpotTigWeld } : {}),
          ...(input.eNGSpotTigWeld ? { eNGSpotTigWeld: input.eNGSpotTigWeld } : {}),
          ...(input.aMachineDamage ? { aMachineDamage: input.aMachineDamage } : {}),
          ...(input.eMachineDamage ? { eMachineDamage: input.eMachineDamage } : {}),
          ...(input.aStrainMarks ? { aStrainMarks: input.aStrainMarks } : {}),
          ...(input.eStrainMarks ? { eStrainMarks: input.eStrainMarks } : {}),
          ...(input.eDeformationSA ? { eDeformationSA: input.eDeformationSA } : {}),
          ...(input.eOverGrindStrain ? { eOverGrindStrain: input.eOverGrindStrain } : {}),
          ...(input.aBruise ? { aBruise: input.aBruise } : {}),
          ...(input.eBruise ? { eBruise: input.eBruise } : {}),
          ...(input.aWaxResidue ? { aWaxResidue: input.aWaxResidue } : {}),
          ...(input.eWaxResidue ? { eWaxResidue: input.eWaxResidue } : {}),
          ...(input.aOther ? { aOther: input.aOther } : {}),
          ...(input.eOther ? { eOther: input.eOther } : {}),
          ...(input.miss ? { miss: input.miss } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          ...(input.isTrial ? { isTrial: input.isTrial } : {}),
          remarks: input.remarks ?? null,
          createdBy: input.createdBy ?? (userId !== "SYSTEM" ? userId : null),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : null),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          deletedBy: input.deletedBy ?? null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_PREFINDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "PrefinDefect",
        recordId: String(prefinDefect.id),
        description: "Created PrefinDefect record",
        values: prefinDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        prefinDefect: prefinDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        prefinDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdatePrefinDefectInput,
    context?: any,
  ): Promise<PrefinDefectPayload> {
    const validationError = validateUpdatePrefinDefectInput(input);
    if (validationError) {
      return {
        prefinDefect: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const prefinDefect = await this.prisma.prefinDefect.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.bookingId ? { bookingId: input.bookingId } : {}),
          ...(input.productionSlipId ? { productionSlipId: input.productionSlipId } : {}),
          ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.itemCode ? { itemCode: input.itemCode } : {}),
          ...(input.aOCut ? { aOCut: input.aOCut } : {}),
          ...(input.eOCut ? { eOCut: input.eOCut } : {}),
          ...(input.aOverShot ? { aOverShot: input.aOverShot } : {}),
          ...(input.eOverShot ? { eOverShot: input.eOverShot } : {}),
          ...(input.aOverSandBlast ? { aOverSandBlast: input.aOverSandBlast } : {}),
          ...(input.eOverSandBlast ? { eOverSandBlast: input.eOverSandBlast } : {}),
          ...(input.remainingCeramics ? { remainingCeramics: input.remainingCeramics } : {}),
          ...(input.gateBurry ? { gateBurry: input.gateBurry } : {}),
          ...(input.aOGrnd ? { aOGrnd: input.aOGrnd } : {}),
          ...(input.eOGrnd ? { eOGrnd: input.eOGrnd } : {}),
          ...(input.overRepair ? { overRepair: input.overRepair } : {}),
          ...(input.aNGSpotTigWeld ? { aNGSpotTigWeld: input.aNGSpotTigWeld } : {}),
          ...(input.eNGSpotTigWeld ? { eNGSpotTigWeld: input.eNGSpotTigWeld } : {}),
          ...(input.aMachineDamage ? { aMachineDamage: input.aMachineDamage } : {}),
          ...(input.eMachineDamage ? { eMachineDamage: input.eMachineDamage } : {}),
          ...(input.aStrainMarks ? { aStrainMarks: input.aStrainMarks } : {}),
          ...(input.eStrainMarks ? { eStrainMarks: input.eStrainMarks } : {}),
          ...(input.eDeformationSA ? { eDeformationSA: input.eDeformationSA } : {}),
          ...(input.eOverGrindStrain ? { eOverGrindStrain: input.eOverGrindStrain } : {}),
          ...(input.aBruise ? { aBruise: input.aBruise } : {}),
          ...(input.eBruise ? { eBruise: input.eBruise } : {}),
          ...(input.aWaxResidue ? { aWaxResidue: input.aWaxResidue } : {}),
          ...(input.eWaxResidue ? { eWaxResidue: input.eWaxResidue } : {}),
          ...(input.aOther ? { aOther: input.aOther } : {}),
          ...(input.eOther ? { eOther: input.eOther } : {}),
          ...(input.miss ? { miss: input.miss } : {}),
          ...(input.totalDefects ? { totalDefects: input.totalDefects } : {}),
          ...(input.isTrial ? { isTrial: input.isTrial } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.createdBy !== undefined ? { createdBy: input.createdBy ?? null } : {}),
          updatedBy: input.updatedBy ?? (userId !== "SYSTEM" ? userId : undefined),
          ...(input.deleted ? { deleted: input.deleted } : {}),
          ...(input.deletedBy !== undefined ? { deletedBy: input.deletedBy ?? null } : {}),
        },
      });

      this.prefinDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_PREFINDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "PrefinDefect",
        recordId: String(parsedId),
        description: "Updated PrefinDefect record",
        values: prefinDefect as any,
        ipAddress,
        userAgent,
      });

      return {
        prefinDefect: prefinDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        prefinDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<PrefinDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const prefinDefect = await this.prisma.prefinDefect.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.prefinDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_PREFINDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "PrefinDefect",
        recordId: String(parsedId),
        description: "Deleted PrefinDefect record",
        ipAddress,
        userAgent,
      });

      return {
        prefinDefect: prefinDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        prefinDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<PrefinDefectPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const prefinDefect = await this.prisma.prefinDefect.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.prefinDefectLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_PREFINDEFECT",
        method: "GRAPHQL_MUTATION",
        tableName: "PrefinDefect",
        recordId: String(parsedId),
        description: "Restored PrefinDefect record",
        ipAddress,
        userAgent,
      });

      return {
        prefinDefect: prefinDefect as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        prefinDefect: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
