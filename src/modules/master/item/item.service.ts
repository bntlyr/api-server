import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma//prisma.service.js";
import { AuditTrailService } from "../../../auth//services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql//common/context.helper.js";
import type {
  CreateItemInput,
  ItemFilterInput,
  PaginationInput,
  UpdateItemInput,
  ItemConnection,
  ItemPayload,
} from "../../../generated//graphql/types.js";
import { createError } from "../../../graphql//common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql//common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql//common/pagination.helper.js";
import { validateCreateItemInput, validateUpdateItemInput } from "./helpers/item.helper.js";
import { copyDefaultRouteToItem } from "../default-route-step/helpers/route-step-sync.helper.js";
import { ItemLoader } from "./item.loader.js";

@Injectable()
export class ItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.itemLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ItemFilterInput | null,
    context?: any,
  ): Promise<ItemConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["itemCode", "itemName", "japaneseName", "colorCode", "color", "specification", "endUser", "description", "itemImage", "drawingProductNo", "drawingRevisionNo", "coatingPattern", "similarItem", "remarks", "ecnNo"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.item.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.item.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ItemConnection;
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
      } as unknown as ItemConnection;
    }
  }

  async create(input: CreateItemInput, context?: any): Promise<ItemPayload> {
    const validationError = validateCreateItemInput(input);
    if (validationError) {
      return {
        item: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const item = await this.prisma.$transaction(async (tx) => {
        const created = await tx.item.create({
          data: {
            itemCode: input.itemCode,
            itemName: input.itemName,
            japaneseName: input.japaneseName ?? null,
            colorCode: input.colorCode,
            color: input.color,
            specification: input.specification,
            ...(input.endUser ? { endUser: input.endUser } : {}),
            description: input.description ?? null,
            itemImage: input.itemImage ?? null,
            ...(input.stdItemWt != null ? { stdItemWt: input.stdItemWt } : {}),
            ...(input.castingWt != null ? { castingWt: input.castingWt } : {}),
            castingTemp: input.castingTemp ?? null,
            mouldTemp: input.mouldTemp ?? null,
            ...(input.cost != null ? { cost: input.cost } : {}),
            ...(input.sellingPrice != null ? { sellingPrice: input.sellingPrice } : {}),
            ...(input.materialPrice != null ? { materialPrice: input.materialPrice } : {}),
            ...(input.heatPrice != null ? { heatPrice: input.heatPrice } : {}),
            ...(input.platePrice != null ? { platePrice: input.platePrice } : {}),
            ...(input.otherPrice != null ? { otherPrice: input.otherPrice } : {}),
            ...(input.unitPrice != null ? { unitPrice: input.unitPrice } : {}),
            ...(input.rejectionRate != null ? { rejectionRate: input.rejectionRate } : {}),
            ...(input.qtyPerTree != null ? { qtyPerTree: input.qtyPerTree } : {}),
            ...(input.qtyPerShot != null ? { qtyPerShot: input.qtyPerShot } : {}),
            ...(input.autoSplitQty != null ? { autoSplitQty: input.autoSplitQty } : {}),
            drawingProductNo: input.drawingProductNo,
            drawingRevisionNo: input.drawingRevisionNo,
            coatingPattern: input.coatingPattern ?? null,
            ...(input.stamping != null ? { stamping: input.stamping } : {}),
            ...(input.soluble != null ? { soluble: input.soluble } : {}),
            ...(input.sizeCheck != null ? { sizeCheck: input.sizeCheck } : {}),
            similarItem: input.similarItem ?? null,
            remarks: input.remarks ?? null,
            ecnNo: input.ecnNo ?? null,
            customerId: input.customerId ?? null,
            itemTypeId: input.itemTypeId ?? null,
            rawMaterialId: input.rawMaterialId ?? null,
            boxTypeId: input.boxTypeId ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        if (input.mouldIds && input.mouldIds.length > 0) {
          await tx.mouldItem.createMany({
            data: input.mouldIds.map((mouldId) => ({
              itemId: created.id,
              mouldId,
              createdBy: userId !== "SYSTEM" ? userId : null,
              updatedBy: userId !== "SYSTEM" ? userId : null,
            })),
            skipDuplicates: true,
          });
        }

        if (created.itemTypeId != null && tx.itemType && tx.itemRoute) {
          await copyDefaultRouteToItem(
            tx,
            created.itemTypeId,
            created.id,
            created.itemCode,
            userId,
          );
        }

        await tx.itemRevision.create({
          data: {
            itemId: created.id,
            ecnNo: created.ecnNo ?? null,
            details: "Initial item creation",
            createdBy: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        return created;
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_ITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "Item",
        recordId: String(item.id),
        description: "Created Item record",
        values: item as any,
        ipAddress,
        userAgent,
      });

      return {
        item: item as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        item: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateItemInput,
    context?: any,
  ): Promise<ItemPayload> {
    const validationError = validateUpdateItemInput(input);
    if (validationError) {
      return {
        item: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const item = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.item.update({
          where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
          data: {
            ...(input.itemCode ? { itemCode: input.itemCode } : {}),
            ...(input.itemName ? { itemName: input.itemName } : {}),
            ...(input.japaneseName !== undefined ? { japaneseName: input.japaneseName ?? null } : {}),
            ...(input.colorCode ? { colorCode: input.colorCode } : {}),
            ...(input.color ? { color: input.color } : {}),
            ...(input.specification ? { specification: input.specification } : {}),
            ...(input.endUser ? { endUser: input.endUser } : {}),
            ...(input.description !== undefined ? { description: input.description ?? null } : {}),
            ...(input.itemImage !== undefined ? { itemImage: input.itemImage ?? null } : {}),
            ...(input.stdItemWt != null ? { stdItemWt: input.stdItemWt } : {}),
            ...(input.castingWt != null ? { castingWt: input.castingWt } : {}),
            ...(input.castingTemp !== undefined ? { castingTemp: input.castingTemp ?? null } : {}),
            ...(input.mouldTemp !== undefined ? { mouldTemp: input.mouldTemp ?? null } : {}),
            ...(input.cost != null ? { cost: input.cost } : {}),
            ...(input.sellingPrice != null ? { sellingPrice: input.sellingPrice } : {}),
            ...(input.materialPrice != null ? { materialPrice: input.materialPrice } : {}),
            ...(input.heatPrice != null ? { heatPrice: input.heatPrice } : {}),
            ...(input.platePrice != null ? { platePrice: input.platePrice } : {}),
            ...(input.otherPrice != null ? { otherPrice: input.otherPrice } : {}),
            ...(input.unitPrice != null ? { unitPrice: input.unitPrice } : {}),
            ...(input.rejectionRate != null ? { rejectionRate: input.rejectionRate } : {}),
            ...(input.qtyPerTree != null ? { qtyPerTree: input.qtyPerTree } : {}),
            ...(input.qtyPerShot != null ? { qtyPerShot: input.qtyPerShot } : {}),
            ...(input.autoSplitQty != null ? { autoSplitQty: input.autoSplitQty } : {}),
            ...(input.drawingProductNo ? { drawingProductNo: input.drawingProductNo } : {}),
            ...(input.drawingRevisionNo ? { drawingRevisionNo: input.drawingRevisionNo } : {}),
            ...(input.coatingPattern !== undefined ? { coatingPattern: input.coatingPattern ?? null } : {}),
            ...(input.stamping != null ? { stamping: input.stamping } : {}),
            ...(input.soluble != null ? { soluble: input.soluble } : {}),
            ...(input.sizeCheck != null ? { sizeCheck: input.sizeCheck } : {}),
            ...(input.similarItem !== undefined ? { similarItem: input.similarItem ?? null } : {}),
            ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
            ...(input.ecnNo !== undefined ? { ecnNo: input.ecnNo ?? null } : {}),
            ...(input.customerId !== undefined ? { customerId: input.customerId ?? null } : {}),
            ...(input.itemTypeId !== undefined ? { itemTypeId: input.itemTypeId ?? null } : {}),
            ...(input.rawMaterialId !== undefined ? { rawMaterialId: input.rawMaterialId ?? null } : {}),
            ...(input.boxTypeId !== undefined ? { boxTypeId: input.boxTypeId ?? null } : {}),
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        if (input.mouldIds !== undefined) {
          await tx.mouldItem.deleteMany({
            where: { itemId: updated.id },
          });
          if (input.mouldIds && input.mouldIds.length > 0) {
            await tx.mouldItem.createMany({
              data: input.mouldIds.map((mouldId) => ({
                itemId: updated.id,
                mouldId,
                createdBy: userId !== "SYSTEM" ? userId : null,
                updatedBy: userId !== "SYSTEM" ? userId : null,
              })),
              skipDuplicates: true,
            });
          }
        }

        return updated;
      });

      this.itemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      const changedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
      await this.prisma.itemRevision.create({
        data: {
          itemId: item.id,
          ecnNo: item.ecnNo ?? null,
          details: `Updated item fields: ${changedFields.join(", ")}`,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_ITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "Item",
        recordId: String(parsedId),
        description: "Updated Item record",
        values: item as any,
        ipAddress,
        userAgent,
      });

      return {
        item: item as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        item: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<ItemPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const item = await this.prisma.item.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.itemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_ITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "Item",
        recordId: String(parsedId),
        description: "Deleted Item record",
        ipAddress,
        userAgent,
      });

      return {
        item: item as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        item: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<ItemPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const item = await this.prisma.item.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.itemLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_ITEM",
        method: "GRAPHQL_MUTATION",
        tableName: "Item",
        recordId: String(parsedId),
        description: "Restored Item record",
        ipAddress,
        userAgent,
      });

      return {
        item: item as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        item: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
