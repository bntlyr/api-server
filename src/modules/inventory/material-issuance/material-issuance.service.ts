import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import type {
  CreateMaterialIssuanceInput,
  MaterialIssuanceConnection,
  MaterialIssuanceFilterInput,
  MaterialIssuancePayload,
  PaginationInput,
} from "../../../generated/graphql/types.js";
import { validateCreateMaterialIssuanceInput } from "./helpers/material-issuance.helper.js";
import { MaterialIssuanceLoader } from "./material-issuance.loader.js";
import { MaterialInventoryLoader } from "../material-inventory/material-inventory.loader.js";
import { generateTransactionNo } from "../material-inventory/helpers/material-inventory.helper.js";
import { Prisma } from "../../../generated/prisma/client.js";

@Injectable()
export class MaterialIssuanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: MaterialIssuanceLoader,
    private readonly lotLoader: MaterialInventoryLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.loader.byId.load(parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: MaterialIssuanceFilterInput | null,
    context?: any,
  ): Promise<MaterialIssuanceConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const searchFields = ["mrsNo", "remarks"];
      const where = buildPrismaWhere(filter, searchFields);

      const [items, totalCount] = await Promise.all([
        this.prisma.materialIssuance.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ mrsDate: "desc" }, { id: "desc" }],
        }),
        this.prisma.materialIssuance.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MaterialIssuanceConnection;
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
      } as unknown as MaterialIssuanceConnection;
    }
  }

  async create(
    input: CreateMaterialIssuanceInput,
    context?: any,
  ): Promise<MaterialIssuancePayload> {
    const validationError = validateCreateMaterialIssuanceInput(input);
    if (validationError) {
      return {
        issuance: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      // Check for duplicate MRS No
      const existing = await this.prisma.materialIssuance.findUnique({
        where: { mrsNo: input.mrsNo.trim() },
      });
      if (existing) {
        return {
          issuance: null,
          userErrors: [createError(`MRS Number '${input.mrsNo}' already exists`, "mrsNo", "DUPLICATE")],
        };
      }

      // Check section exists
      const section = await this.prisma.section.findUnique({
        where: { id: input.sectionId },
      });
      if (!section) {
        return {
          issuance: null,
          userErrors: [createError("Requestor section not found", "sectionId", "NOT_FOUND")],
        };
      }

      // Pre-validate stock availability for all requested items
      const lotIds = input.items.map((it) => it.materialInventoryLotId);
      const lots = await this.prisma.materialInventoryLot.findMany({
        where: { id: { in: lotIds } },
        include: { material: true },
      });
      const lotMap = new Map(lots.map((l) => [l.id, l]));

      let totalQty = 0;
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const lot = lotMap.get(item.materialInventoryLotId);
        if (!lot) {
          return {
            issuance: null,
            userErrors: [
              createError(`Item #${i + 1}: Inventory Lot not found`, `items[${i}].materialInventoryLotId`, "NOT_FOUND"),
            ],
          };
        }

        const avlQty = Number(lot.availableQty);
        if (avlQty < item.quantity) {
          return {
            issuance: null,
            userErrors: [
              createError(
                `Item #${i + 1} (${lot.material.name}, Lot: ${lot.lotNo}): Insufficient Available quantity. Available: ${avlQty}, Requested: ${item.quantity}`,
                `items[${i}].quantity`,
                "INSUFFICIENT_STOCK",
              ),
            ],
          };
        }

        totalQty += item.quantity;
      }

      // Execute issuance in an atomic database transaction
      const issuance = await this.prisma.$transaction(async (tx) => {
        // 1. Create issuance header
        const createdIssuance = await tx.materialIssuance.create({
          data: {
            mrsNo: input.mrsNo.trim(),
            mrsDate: input.mrsDate ? new Date(input.mrsDate) : new Date(),
            sectionId: input.sectionId,
            requestorId: input.requestorId ?? null,
            remarks: input.remarks?.trim() ?? null,
            totalItems: input.items.length,
            totalQty: new Prisma.Decimal(totalQty),
            createdBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        // 2. Process each item: deduct availableQty and record transaction
        for (const item of input.items) {
          const lot = lotMap.get(item.materialInventoryLotId)!;
          const itemQty = new Prisma.Decimal(item.quantity);

          // Deduct from available stock
          const updatedLot = await tx.materialInventoryLot.update({
            where: { id: lot.id },
            data: {
              availableQty: { decrement: itemQty },
              updatedBy: userId !== "SYSTEM" ? userId : null,
            },
          });

          // Insert issuance item
          await tx.materialIssuanceItem.create({
            data: {
              materialIssuanceId: createdIssuance.id,
              materialId: lot.materialId,
              materialInventoryLotId: lot.id,
              lotNo: lot.lotNo,
              areaId: lot.areaId,
              locationId: lot.locationId,
              quantity: itemQty,
              remarks: item.remarks?.trim() ?? null,
              createdBy: userId !== "SYSTEM" ? userId : null,
            },
          });

          // Create ledger transaction entry (Outbound issuance)
          const txNo = generateTransactionNo("ISS");
          await tx.materialInventoryTransaction.create({
            data: {
              transactionNo: txNo,
              transactionType: "ISSUANCE",
              direction: "OUTBOUND",
              transactionDate: createdIssuance.mrsDate,
              materialId: lot.materialId,
              materialInventoryLotId: lot.id,
              lotNo: lot.lotNo,
              fromAreaId: lot.areaId,
              fromLocationId: lot.locationId,
              fromStatus: "AVAILABLE",
              toStatus: null,
              quantity: itemQty,
              balanceAfter: Number(updatedLot.availableQty),
              reason: "Material Requisition Issuance",
              remarks: item.remarks?.trim() ?? input.remarks?.trim() ?? null,
              referenceNo: createdIssuance.mrsNo,
              createdBy: userId !== "SYSTEM" ? userId : null,
            },
          });
        }

        return createdIssuance;
      });

      // Invalidate DataLoader caches
      for (const lotId of lotIds) {
        this.lotLoader.clear(lotId);
      }

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_MATERIAL_ISSUANCE",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialIssuance",
        recordId: String(issuance.id),
        description: `Issued MRS ${issuance.mrsNo} with ${input.items.length} items (Total Qty: ${totalQty}) to Section ID ${input.sectionId}`,
        values: issuance as any,
        ipAddress,
        userAgent,
      });

      return {
        issuance: issuance as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        issuance: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
