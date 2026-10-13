import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import type {
  CreateBoxContainerInput,
  BoxContainerFilterInput,
  PaginationInput,
  UpdateBoxContainerInput,
  BoxContainerConnection,
  BoxContainerPayload,
} from "../../../generated/graphql/types.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import { validateCreateBoxContainerInput, validateUpdateBoxContainerInput } from "./helpers/box-container.helper.js";

import { BoxContainerLoader } from "./box-container.loader.js";

@Injectable()
export class BoxContainerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boxContainerLoader: BoxContainerLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.boxContainerLoader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: BoxContainerFilterInput | null,
    context?: any,
  ): Promise<BoxContainerConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, ["boxNo", "orderNo", "status", "remarks", "closedById"]);

      const [items, totalCount] = await Promise.all([
        this.prisma.boxContainer.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.boxContainer.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as BoxContainerConnection;
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
      } as unknown as BoxContainerConnection;
    }
  }

  async create(input: CreateBoxContainerInput, context?: any): Promise<BoxContainerPayload> {
    const validationError = validateCreateBoxContainerInput(input);
    if (validationError) {
      return {
        boxContainer: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const boxContainer = await this.prisma.boxContainer.create({
        data: {
          boxNo: input.boxNo,
          salesOrderId: input.salesOrderId ?? null,
          orderNo: input.orderNo ?? null,
          boxTypeId: input.boxTypeId,
          ...(input.status ? { status: input.status } : {}),
          areaId: input.areaId,
          locationId: input.locationId,
          ...(input.totalQty ? { totalQty: input.totalQty } : {}),
          ...(input.grossWeight ? { grossWeight: input.grossWeight } : {}),
          ...(input.netWeight ? { netWeight: input.netWeight } : {}),
          remarks: input.remarks ?? null,
          closedAt: input.closedAt ?? null,
          closedById: input.closedById ?? null,
          createdBy: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : null,
        },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_BOXCONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainer",
        recordId: String(boxContainer.id),
        description: "Created BoxContainer record",
        values: boxContainer as any,
        ipAddress,
        userAgent,
      });

      return {
        boxContainer: boxContainer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async update(
    id: number | string,
    input: UpdateBoxContainerInput,
    context?: any,
  ): Promise<BoxContainerPayload> {
    const validationError = validateUpdateBoxContainerInput(input);
    if (validationError) {
      return {
        boxContainer: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxContainer = await this.prisma.boxContainer.update({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
        data: {
          ...(input.boxNo ? { boxNo: input.boxNo } : {}),
          ...(input.salesOrderId !== undefined ? { salesOrderId: input.salesOrderId ?? null } : {}),
          ...(input.orderNo !== undefined ? { orderNo: input.orderNo ?? null } : {}),
          ...(input.boxTypeId ? { boxTypeId: input.boxTypeId } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.areaId ? { areaId: input.areaId } : {}),
          ...(input.locationId ? { locationId: input.locationId } : {}),
          ...(input.totalQty ? { totalQty: input.totalQty } : {}),
          ...(input.grossWeight ? { grossWeight: input.grossWeight } : {}),
          ...(input.netWeight ? { netWeight: input.netWeight } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
          ...(input.closedAt !== undefined ? { closedAt: input.closedAt ?? null } : {}),
          ...(input.closedById !== undefined ? { closedById: input.closedById ?? null } : {}),
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.boxContainerLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_BOXCONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainer",
        recordId: String(parsedId),
        description: "Updated BoxContainer record",
        values: boxContainer as any,
        ipAddress,
        userAgent,
      });

      return {
        boxContainer: boxContainer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async delete(id: number | string, context?: any): Promise<BoxContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxContainer = await this.prisma.boxContainer.delete({
        where: { id: Number.isNaN(parsedId) ? (id as any) : parsedId },
      });

      this.boxContainerLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_BOXCONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainer",
        recordId: String(parsedId),
        description: "Deleted BoxContainer record",
        ipAddress,
        userAgent,
      });

      return {
        boxContainer: boxContainer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async restore(id: number | string, context?: any): Promise<BoxContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
      const boxContainer = await this.prisma.boxContainer.restore({
        id: Number.isNaN(parsedId) ? (id as any) : parsedId,
      });

      this.boxContainerLoader.clear(Number.isNaN(parsedId) ? (id as any) : parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "RESTORE_BOXCONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainer",
        recordId: String(parsedId),
        description: "Restored BoxContainer record",
        ipAddress,
        userAgent,
      });

      return {
        boxContainer: boxContainer as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async addItems(
    input: any,
    context?: any,
  ): Promise<BoxContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const container = await this.prisma.boxContainer.findUnique({
        where: { id: input.boxContainerId },
        include: {
          boxType: true,
          items: { where: { deleted: false } },
        },
      });

      if (!container || container.deleted) {
        return {
          boxContainer: null,
          userErrors: [createError("Box container not found.", "boxContainerId")],
        };
      }

      if (container.status === "SHIPPED") {
        return {
          boxContainer: null,
          userErrors: [
            createError("Cannot add items to a shipped box container.", "boxContainerId"),
          ],
        };
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        // Create container item records
        for (const itemInput of input.items) {
          await tx.boxContainerItem.create({
            data: {
              boxContainerId: container.id,
              productionSlipId: itemInput.productionSlipId ?? null,
              productionProcessId: itemInput.productionProcessId ?? null,
              salesOrderId: itemInput.salesOrderId,
              itemId: itemInput.itemId,
              fabricationId: itemInput.fabricationId ?? null,
              orderNo: itemInput.orderNo,
              lotNo: itemInput.lotNo,
              chargeNo: itemInput.chargeNo ?? null,
              quantity: itemInput.quantity,
              remarks: itemInput.remarks ?? null,
              createdBy: effectiveUserId,
            },
          });
        }

        // Fetch all active items and items' weight
        const allItems = await tx.boxContainerItem.findMany({
          where: { boxContainerId: container.id, deleted: false },
          include: { item: true },
        });

        let totalQty = 0;
        let netWeight = 0;

        for (const it of allItems) {
          const qty = Number(it.quantity);
          totalQty += qty;
          const unitWt = Number(it.item?.stdItemWt ?? 0);
          netWeight += qty * unitWt;
        }

        const boxWeight = Number(container.boxType?.weight ?? 0);
        const grossWeight = netWeight + boxWeight;

        const res = await tx.boxContainer.update({
          where: { id: container.id },
          data: {
            totalQty,
            netWeight,
            grossWeight,
            updatedBy: effectiveUserId,
          },
        });

        this.boxContainerLoader.clear(container.id);

        await this.auditService.log({
          userId: effectiveUserId,
          action: "ADD_ITEMS_TO_BOX_CONTAINER",
          method: "GRAPHQL_MUTATION",
          tableName: "BoxContainer",
          recordId: String(container.id),
          description: `Added ${input.items.length} item lot(s) to BoxContainer [${container.boxNo}]. Total Qty: ${totalQty}`,
          ipAddress,
          userAgent,
        });

        return res;
      });

      return {
        boxContainer: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async removeItem(
    input: any,
    context?: any,
  ): Promise<BoxContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const item = await this.prisma.boxContainerItem.findUnique({
        where: { id: input.boxContainerItemId },
        include: { boxContainer: { include: { boxType: true } } },
      });

      if (!item || item.deleted) {
        return {
          boxContainer: null,
          userErrors: [createError("Box container item not found.", "boxContainerItemId")],
        };
      }

      const container = item.boxContainer;

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.boxContainerItem.delete({
          where: { id: item.id },
        });

        const remainingItems = await tx.boxContainerItem.findMany({
          where: { boxContainerId: container.id, deleted: false },
          include: { item: true },
        });

        let totalQty = 0;
        let netWeight = 0;

        for (const it of remainingItems) {
          const qty = Number(it.quantity);
          totalQty += qty;
          const unitWt = Number(it.item?.stdItemWt ?? 0);
          netWeight += qty * unitWt;
        }

        const boxWeight = Number(container.boxType?.weight ?? 0);
        const grossWeight = netWeight + boxWeight;

        const res = await tx.boxContainer.update({
          where: { id: container.id },
          data: {
            totalQty,
            netWeight,
            grossWeight,
            updatedBy: effectiveUserId,
          },
        });

        this.boxContainerLoader.clear(container.id);

        await this.auditService.log({
          userId: effectiveUserId,
          action: "REMOVE_ITEM_FROM_BOX_CONTAINER",
          method: "GRAPHQL_MUTATION",
          tableName: "BoxContainer",
          recordId: String(container.id),
          description: `Removed item lot [${item.lotNo}] from BoxContainer [${container.boxNo}]. New Total Qty: ${totalQty}`,
          ipAddress,
          userAgent,
        });

        return res;
      });

      return {
        boxContainer: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async closeBoxContainer(
    input: any,
    context?: any,
  ): Promise<BoxContainerPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const effectiveUserId = userId ?? "SYSTEM";

      const container = await this.prisma.boxContainer.findUnique({
        where: { id: input.boxContainerId },
      });

      if (!container || container.deleted) {
        return {
          boxContainer: null,
          userErrors: [createError("Box container not found.", "boxContainerId")],
        };
      }

      const updated = await this.prisma.boxContainer.update({
        where: { id: container.id },
        data: {
          status: "CLOSED",
          areaId: input.destinationAreaId,
          locationId: input.destinationLocationId,
          remarks: input.remarks ?? container.remarks,
          closedAt: new Date(),
          closedById: effectiveUserId,
          updatedBy: effectiveUserId,
        },
      });

      this.boxContainerLoader.clear(container.id);

      await this.auditService.log({
        userId: effectiveUserId,
        action: "CLOSE_BOX_CONTAINER",
        method: "GRAPHQL_MUTATION",
        tableName: "BoxContainer",
        recordId: String(container.id),
        description: `Closed BoxContainer [${container.boxNo}] and allocated to Area ${input.destinationAreaId}, Location ${input.destinationLocationId}`,
        ipAddress,
        userAgent,
      });

      return {
        boxContainer: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        boxContainer: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  async openBoxContainers(areaId?: number) {
    return this.prisma.boxContainer.findMany({
      where: {
        status: "OPEN",
        ...(areaId ? { areaId } : {}),
        deleted: false,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async boxContainersBySalesOrder(salesOrderId: number) {
    return this.prisma.boxContainer.findMany({
      where: {
        salesOrderId,
        deleted: false,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
