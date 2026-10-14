import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditTrailService } from '../../../auth/services/audit-trail.service.js';
import { extractContextInfo } from '../../../graphql/common/context.helper.js';
import { createError } from '../../../graphql/common/error.helper.js';
import {
  getPrismaPaginationArgs,
  toConnection,
} from '../../../graphql/common/pagination.helper.js';
import type {
  BatchFinishedGoodsPayload,
  BatchManualInFinishedGoodsInput,
  BatchMoveFinishedGoodsInput,
  ChangeFinishedGoodsStatusInput,
  DiscardFinishedGoodsInput,
  FinishedGoodsLotConnection,
  FinishedGoodsLotFilterInput,
  FinishedGoodsLotPayload,
  FinishedGoodsSummary,
  FinishedGoodsSummaryConnection,
  FinishedGoodsSummaryFilterInput,
  FinishedGoodsTransactionConnection,
  FinishedGoodsTransactionFilterInput,
  ManualInFinishedGoodsInput,
  ManualOutFinishedGoodsInput,
  MoveFinishedGoodsInput,
  PaginationInput,
  PrintFinishedGoodsStickerInput,
  UpdateFinishedGoodsBoxTypeInput,
} from '../../../generated/graphql/types.js';
import {
  buildFGLotWhereClause,
  buildFGSummaryWhereClause,
  buildFGTransactionWhereClause,
  formatFGItemCode,
  generateFGTransactionNo,
  validateBatchManualInInput,
  validateBatchMoveInput,
  validateChangeStatusInput,
  validateDiscardInput,
  validateManualInInput,
  validateManualOutInput,
  validateMoveInput,
  validateUpdateBoxTypeInput,
} from './helpers/finished-goods-inventory.helper.js';
import { FinishedGoodsInventoryLoader } from './finished-goods-inventory.loader.js';
import { Prisma } from '../../../generated/prisma/client.js';

@Injectable()
export class FinishedGoodsInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: FinishedGoodsInventoryLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  // ----------------------------------------------------
  // QUERIES: Lots
  // ----------------------------------------------------
  async findLotById(id: number | string) {
    const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.loader.lotById.load(parsedId);
  }

  async findLots(
    pagination?: PaginationInput | null,
    filter?: FinishedGoodsLotFilterInput | null,
  ): Promise<FinishedGoodsLotConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(
        pagination,
        {
          isNumericId: true,
        },
      );

      const where = buildFGLotWhereClause(filter);

      const [items, totalCount] = await Promise.all([
        this.prisma.finishedGoodsLot.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        this.prisma.finishedGoodsLot.count({ where }),
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
      } as unknown as FinishedGoodsLotConnection;
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
      } as unknown as FinishedGoodsLotConnection;
    }
  }

  async findLotsByItemAndFab(
    itemId: number | string,
    fabricationId: number | string,
    pagination?: PaginationInput | null,
    filter?: FinishedGoodsLotFilterInput | null,
  ): Promise<FinishedGoodsLotConnection> {
    const parsedItemId =
      typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    const parsedFabId =
      typeof fabricationId === 'string'
        ? parseInt(fabricationId, 10)
        : fabricationId;
    if (Number.isNaN(parsedItemId) || Number.isNaN(parsedFabId)) {
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
        userErrors: [
          createError(
            'Invalid Item ID or Fabrication ID',
            undefined,
            'INVALID_INPUT',
          ),
        ],
      } as unknown as FinishedGoodsLotConnection;
    }

    const mergedFilter: FinishedGoodsLotFilterInput = {
      ...filter,
      itemId: { equals: parsedItemId },
      fabricationId: { equals: parsedFabId },
    };

    return this.findLots(pagination, mergedFilter);
  }

  // ----------------------------------------------------
  // QUERIES: Transactions
  // ----------------------------------------------------
  async findTransactionById(id: number | string) {
    const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.loader.transactionById.load(parsedId);
  }

  async findTransactions(
    pagination?: PaginationInput | null,
    filter?: FinishedGoodsTransactionFilterInput | null,
  ): Promise<FinishedGoodsTransactionConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(
        pagination,
        {
          isNumericId: true,
        },
      );

      const where = buildFGTransactionWhereClause(filter);

      const [items, totalCount] = await Promise.all([
        this.prisma.finishedGoodsTransaction.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        }),
        this.prisma.finishedGoodsTransaction.count({ where }),
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
      } as unknown as FinishedGoodsTransactionConnection;
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
      } as unknown as FinishedGoodsTransactionConnection;
    }
  }

  // ----------------------------------------------------
  // QUERIES: Summaries / Inventory List
  // ----------------------------------------------------
  async findSummaryByItemAndFab(
    itemId: number | string,
    fabricationId: number | string,
  ): Promise<FinishedGoodsSummary | null> {
    const parsedItemId =
      typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    const parsedFabId =
      typeof fabricationId === 'string'
        ? parseInt(fabricationId, 10)
        : fabricationId;
    if (Number.isNaN(parsedItemId) || Number.isNaN(parsedFabId)) return null;

    const [item, fabrication, lots] = await Promise.all([
      this.prisma.item.findUnique({ where: { id: parsedItemId } }),
      this.prisma.fabrication.findUnique({ where: { id: parsedFabId } }),
      this.prisma.finishedGoodsLot.findMany({
        where: { itemId: parsedItemId, fabricationId: parsedFabId },
        include: { area: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    if (!item || !fabrication) return null;

    let packingAvailableQty = 0;
    let packingAllocatedQty = 0;
    let packingCheckingQty = 0;
    let packingDefectiveQty = 0;

    let stockAvailableQty = 0;
    let stockAllocatedQty = 0;
    let stockCheckingQty = 0;
    let stockDefectiveQty = 0;

    for (const lot of lots) {
      const isPacking = lot.area?.category?.toUpperCase().includes('PACKING');
      const avl = Number(lot.availableQty);
      const alc = Number(lot.allocatedQty);
      const chk = Number(lot.checkingQty);
      const def = Number(lot.defectiveQty);

      if (isPacking) {
        packingAvailableQty += avl;
        packingAllocatedQty += alc;
        packingCheckingQty += chk;
        packingDefectiveQty += def;
      } else {
        stockAvailableQty += avl;
        stockAllocatedQty += alc;
        stockCheckingQty += chk;
        stockDefectiveQty += def;
      }
    }

    const packingTotalQty =
      packingAvailableQty +
      packingAllocatedQty +
      packingCheckingQty +
      packingDefectiveQty;
    const stockTotalQty =
      stockAvailableQty +
      stockAllocatedQty +
      stockCheckingQty +
      stockDefectiveQty;

    const totalAvailableQty = packingAvailableQty + stockAvailableQty;
    const totalAllocatedQty = packingAllocatedQty + stockAllocatedQty;
    const totalCheckingQty = packingCheckingQty + stockCheckingQty;
    const totalDefectiveQty = packingDefectiveQty + stockDefectiveQty;
    const totalOnHandQty =
      totalAvailableQty +
      totalAllocatedQty +
      totalCheckingQty +
      totalDefectiveQty;

    const formattedItemCode = formatFGItemCode(item.itemCode, fabrication.code);
    const unitPrice = Number(
      fabrication.unitPrice && Number(fabrication.unitPrice) > 0
        ? fabrication.unitPrice
        : (item.unitPrice ?? 0),
    );
    const stdItemWt = Number(item.stdItemWt ?? 0);
    const totalWeight = totalOnHandQty * stdItemWt;
    const totalPrice = totalOnHandQty * unitPrice;

    return {
      id: `${item.id}-${fabrication.id}`,
      itemId: item.id,
      item: item as any,
      fabricationId: fabrication.id,
      fabrication: fabrication as any,
      itemCode: formattedItemCode,
      displayItemCode: formattedItemCode,
      itemName: item.itemName,
      description: item.description ?? '',
      noLots: lots.length,
      lotCount: lots.length,
      stdItemWt,
      totalWeight,
      totalQty: totalOnHandQty,
      unitPrice,
      totalPrice,
      packingAvailableQty,
      packingAllocatedQty,
      packingCheckingQty,
      packingDefectiveQty,
      packingTotalQty,
      stockAvailableQty,
      stockAllocatedQty,
      stockCheckingQty,
      stockDefectiveQty,
      stockTotalQty,
      totalAvailableQty,
      totalAllocatedQty,
      totalCheckingQty,
      totalDefectiveQty,
      totalOnHandQty,
      lots: lots as any,
    };
  }

  async findSummaries(
    pagination?: PaginationInput | null,
    filter?: FinishedGoodsSummaryFilterInput | null,
  ): Promise<FinishedGoodsSummaryConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(
        pagination,
        {
          isNumericId: true,
        },
      );

      const where = buildFGSummaryWhereClause(filter);

      const [fabrications, totalCount] = await Promise.all([
        this.prisma.fabrication.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            item: true,
            finishedGoodsLots: {
              include: { area: true },
            },
          },
        }),
        this.prisma.fabrication.count({ where }),
      ]);

      const summaries: FinishedGoodsSummary[] = fabrications.map((fab) => {
        let packingAvailableQty = 0;
        let packingAllocatedQty = 0;
        let packingCheckingQty = 0;
        let packingDefectiveQty = 0;

        let stockAvailableQty = 0;
        let stockAllocatedQty = 0;
        let stockCheckingQty = 0;
        let stockDefectiveQty = 0;

        for (const lot of fab.finishedGoodsLots) {
          const isPacking = lot.area?.category
            ?.toUpperCase()
            .includes('PACKING');
          const avl = Number(lot.availableQty);
          const alc = Number(lot.allocatedQty);
          const chk = Number(lot.checkingQty);
          const def = Number(lot.defectiveQty);

          if (isPacking) {
            packingAvailableQty += avl;
            packingAllocatedQty += alc;
            packingCheckingQty += chk;
            packingDefectiveQty += def;
          } else {
            stockAvailableQty += avl;
            stockAllocatedQty += alc;
            stockCheckingQty += chk;
            stockDefectiveQty += def;
          }
        }

        const packingTotalQty =
          packingAvailableQty +
          packingAllocatedQty +
          packingCheckingQty +
          packingDefectiveQty;
        const stockTotalQty =
          stockAvailableQty +
          stockAllocatedQty +
          stockCheckingQty +
          stockDefectiveQty;

        const totalAvailableQty = packingAvailableQty + stockAvailableQty;
        const totalAllocatedQty = packingAllocatedQty + stockAllocatedQty;
        const totalCheckingQty = packingCheckingQty + stockCheckingQty;
        const totalDefectiveQty = packingDefectiveQty + stockDefectiveQty;
        const totalOnHandQty =
          totalAvailableQty +
          totalAllocatedQty +
          totalCheckingQty +
          totalDefectiveQty;

        const formattedItemCode = formatFGItemCode(fab.item.itemCode, fab.code);
        const unitPrice = Number(
          fab.unitPrice && Number(fab.unitPrice) > 0
            ? fab.unitPrice
            : (fab.item.unitPrice ?? 0),
        );
        const stdItemWt = Number(fab.item.stdItemWt ?? 0);
        const totalWeight = totalOnHandQty * stdItemWt;
        const totalPrice = totalOnHandQty * unitPrice;

        return {
          id: `${fab.itemId}-${fab.id}`,
          itemId: fab.itemId,
          item: fab.item as any,
          fabricationId: fab.id,
          fabrication: fab as any,
          itemCode: formattedItemCode,
          displayItemCode: formattedItemCode,
          itemName: fab.item.itemName,
          description: fab.item.description ?? '',
          noLots: fab.finishedGoodsLots.length,
          lotCount: fab.finishedGoodsLots.length,
          stdItemWt,
          totalWeight,
          totalQty: totalOnHandQty,
          unitPrice,
          totalPrice,
          packingAvailableQty,
          packingAllocatedQty,
          packingCheckingQty,
          packingDefectiveQty,
          packingTotalQty,
          stockAvailableQty,
          stockAllocatedQty,
          stockCheckingQty,
          stockDefectiveQty,
          stockTotalQty,
          totalAvailableQty,
          totalAllocatedQty,
          totalCheckingQty,
          totalDefectiveQty,
          totalOnHandQty,
          lots: fab.finishedGoodsLots as any,
        };
      });

      const connection = toConnection(
        summaries,
        limit,
        totalCount,
        Boolean(pagination?.after),
      );

      return {
        ...connection,
        userErrors: [],
      } as unknown as FinishedGoodsSummaryConnection;
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
      } as unknown as FinishedGoodsSummaryConnection;
    }
  }

  private async upsertLot(
    tx: any,
    params: {
      itemId: number;
      fabricationId: number;
      orderNo: string;
      lotNo: string;
      chargeNo: string;
      areaId: number;
      locationId: number;
      boxId?: number | null;
      qtyField: string;
      qty: Prisma.Decimal;
      trialLotNo?: string;
      invoiceNo?: string | null;
      incomingDate?: Date | null;
      manufactureDate?: Date | null;
      reason?: string;
      remarks?: string | null;
      userId?: string | null;
    },
  ) {
    const boxId = params.boxId ?? null;

    if (boxId !== null) {
      return tx.finishedGoodsLot.upsert({
        where: {
          itemId_fabricationId_orderNo_lotNo_chargeNo_areaId_locationId_boxId: {
            itemId: params.itemId,
            fabricationId: params.fabricationId,
            orderNo: params.orderNo,
            lotNo: params.lotNo,
            chargeNo: params.chargeNo,
            areaId: params.areaId,
            locationId: params.locationId,
            boxId,
          },
        },
        update: {
          [params.qtyField]: { increment: params.qty },
          ...(params.trialLotNo !== undefined ? { trialLotNo: params.trialLotNo } : {}),
          ...(params.invoiceNo ? { invoiceNo: params.invoiceNo } : {}),
          ...(params.incomingDate ? { incomingDate: params.incomingDate } : {}),
          ...(params.manufactureDate ? { manufactureDate: params.manufactureDate } : {}),
          ...(params.reason ? { reason: params.reason } : {}),
          ...(params.remarks !== undefined ? { remarks: params.remarks } : {}),
          updatedBy: params.userId,
        },
        create: {
          itemId: params.itemId,
          fabricationId: params.fabricationId,
          orderNo: params.orderNo,
          lotNo: params.lotNo,
          chargeNo: params.chargeNo,
          trialLotNo: params.trialLotNo ?? '',
          invoiceNo: params.invoiceNo ?? null,
          areaId: params.areaId,
          locationId: params.locationId,
          boxId,
          [params.qtyField]: params.qty,
          incomingDate: params.incomingDate ?? null,
          manufactureDate: params.manufactureDate ?? null,
          reason: params.reason ?? '-',
          remarks: params.remarks ?? null,
          createdBy: params.userId,
        },
      });
    }

    const existing = await tx.finishedGoodsLot.findFirst({
      where: {
        itemId: params.itemId,
        fabricationId: params.fabricationId,
        orderNo: params.orderNo,
        lotNo: params.lotNo,
        chargeNo: params.chargeNo,
        areaId: params.areaId,
        locationId: params.locationId,
        boxId: null,
      },
    });

    if (existing) {
      return tx.finishedGoodsLot.update({
        where: { id: existing.id },
        data: {
          [params.qtyField]: { increment: params.qty },
          ...(params.trialLotNo !== undefined ? { trialLotNo: params.trialLotNo } : {}),
          ...(params.invoiceNo ? { invoiceNo: params.invoiceNo } : {}),
          ...(params.incomingDate ? { incomingDate: params.incomingDate } : {}),
          ...(params.manufactureDate ? { manufactureDate: params.manufactureDate } : {}),
          ...(params.reason ? { reason: params.reason } : {}),
          ...(params.remarks !== undefined ? { remarks: params.remarks } : {}),
          updatedBy: params.userId,
        },
      });
    }

    return tx.finishedGoodsLot.create({
      data: {
        itemId: params.itemId,
        fabricationId: params.fabricationId,
        orderNo: params.orderNo,
        lotNo: params.lotNo,
        chargeNo: params.chargeNo,
        trialLotNo: params.trialLotNo ?? '',
        invoiceNo: params.invoiceNo ?? null,
        areaId: params.areaId,
        locationId: params.locationId,
        boxId: null,
        [params.qtyField]: params.qty,
        incomingDate: params.incomingDate ?? null,
        manufactureDate: params.manufactureDate ?? null,
        reason: params.reason ?? '-',
        remarks: params.remarks ?? null,
        createdBy: params.userId,
      },
    });
  }

  // ----------------------------------------------------
  // MUTATION: 1. Manual-In
  // ----------------------------------------------------
  async manualIn(
    input: ManualInFinishedGoodsInput,
    context?: any,
  ): Promise<FinishedGoodsLotPayload> {
    const validationError = validateManualInInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);
      const qtyField =
        input.status === 'AVAILABLE'
          ? 'availableQty'
          : input.status === 'CHECKING'
            ? 'checkingQty'
            : 'defectiveQty';

      const txNo = generateFGTransactionNo('MIN');

      const result = await this.prisma.$transaction(async (tx) => {
        const lot = await this.upsertLot(tx, {
          itemId: input.itemId,
          fabricationId: input.fabricationId,
          orderNo: input.orderNo.trim(),
          lotNo: input.lotNo.trim(),
          chargeNo: input.chargeNo.trim(),
          areaId: input.areaId,
          locationId: input.locationId,
          boxId: input.boxId,
          qtyField,
          qty,
          trialLotNo: input.trialLotNo?.trim() ?? '',
          invoiceNo: input.invoiceNo?.trim() ?? null,
          incomingDate: input.incomingDate ? new Date(input.incomingDate) : null,
          manufactureDate: input.manufactureDate
            ? new Date(input.manufactureDate)
            : null,
          reason: input.reason.trim(),
          remarks: input.remarks?.trim() ?? null,
          userId: userId !== 'SYSTEM' ? userId : null,
        });

        const transaction = await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: 'MANUAL_IN',
            direction: 'INBOUND',
            transactionDate: new Date(),
            itemId: input.itemId,
            fabricationId: input.fabricationId,
            finishedGoodsLotId: lot.id,
            orderNo: lot.orderNo,
            lotNo: lot.lotNo,
            chargeNo: lot.chargeNo,
            invoiceNo: input.invoiceNo?.trim() ?? lot.invoiceNo ?? null,
            toAreaId: input.areaId,
            toLocationId: input.locationId,
            toBoxId: input.boxId ?? null,
            toStatus: input.status,
            quantity: qty,
            balanceAfter: Number(lot[qtyField]),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            referenceNo: input.orderNo.trim(),
            createdBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        return { lot, transaction };
      });

      this.loader.clear(result.lot.id);

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_MANUAL_IN',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: String(result.lot.id),
        description: `Manual In ${input.quantity} of Lot ${input.lotNo} as ${input.status}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 2. Batch Manual-In
  // ----------------------------------------------------
  async batchManualIn(
    input: BatchManualInFinishedGoodsInput,
    context?: any,
  ): Promise<BatchFinishedGoodsPayload> {
    const validationError = validateBatchManualInInput(input);
    if (validationError) {
      return {
        lots: [],
        transactions: [],
        count: 0,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const result = await this.prisma.$transaction(async (tx) => {
        const lots = [];
        const transactions = [];

        for (const item of input.items) {
          const qty = new Prisma.Decimal(item.quantity);
          const qtyField =
            item.status === 'AVAILABLE'
              ? 'availableQty'
              : item.status === 'CHECKING'
                ? 'checkingQty'
                : 'defectiveQty';

          const txNo = generateFGTransactionNo('BMIN');

          const lot = await this.upsertLot(tx, {
            itemId: input.itemId,
            fabricationId: input.fabricationId,
            orderNo: input.orderNo.trim(),
            lotNo: item.lotNo.trim(),
            chargeNo: item.chargeNo.trim(),
            areaId: item.areaId,
            locationId: item.locationId,
            boxId: item.boxId,
            qtyField,
            qty,
            trialLotNo: item.trialLotNo?.trim() ?? '',
            invoiceNo: item.invoiceNo?.trim() ?? null,
            incomingDate: item.incomingDate
              ? new Date(item.incomingDate)
              : null,
            manufactureDate: item.manufactureDate
              ? new Date(item.manufactureDate)
              : null,
            reason: item.reason?.trim() ?? input.reason.trim(),
            remarks: item.remarks?.trim() ?? input.remarks?.trim() ?? null,
            userId: userId !== 'SYSTEM' ? userId : null,
          });

          const transaction = await tx.finishedGoodsTransaction.create({
            data: {
              transactionNo: txNo,
              transactionType: 'BATCH_IN',
              direction: 'INBOUND',
              transactionDate: new Date(),
              itemId: input.itemId,
              fabricationId: input.fabricationId,
              finishedGoodsLotId: lot.id,
              orderNo: lot.orderNo,
              lotNo: lot.lotNo,
              chargeNo: lot.chargeNo,
              invoiceNo: item.invoiceNo?.trim() ?? lot.invoiceNo ?? null,
              toAreaId: item.areaId,
              toLocationId: item.locationId,
              toBoxId: item.boxId ?? null,
              toStatus: item.status,
              quantity: qty,
              balanceAfter: Number(lot[qtyField]),
              reason: item.reason?.trim() ?? input.reason.trim(),
              remarks: item.remarks?.trim() ?? input.remarks?.trim() ?? null,
              referenceNo: input.orderNo.trim(),
              createdBy: userId !== 'SYSTEM' ? userId : null,
            },
          });

          lots.push(lot);
          transactions.push(transaction);
        }

        return { lots, transactions };
      });

      this.loader.clear();

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_BATCH_MANUAL_IN',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: `${input.itemId}-${input.fabricationId}`,
        description: `Batch Manual In ${result.lots.length} lots for Order ${input.orderNo}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lots: result.lots as any,
        transactions: result.transactions as any,
        count: result.lots.length,
        userErrors: [],
      };
    } catch (error) {
      return {
        lots: [],
        transactions: [],
        count: 0,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 3. Change Status
  // ----------------------------------------------------
  async changeStatus(
    input: ChangeFinishedGoodsStatusInput,
    context?: any,
  ): Promise<FinishedGoodsLotPayload> {
    const validationError = validateChangeStatusInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);

      const fromField =
        input.fromStatus === 'AVAILABLE'
          ? 'availableQty'
          : input.fromStatus === 'ALLOCATED'
            ? 'allocatedQty'
            : input.fromStatus === 'CHECKING'
              ? 'checkingQty'
              : 'defectiveQty';

      const toField =
        input.toStatus === 'AVAILABLE'
          ? 'availableQty'
          : input.toStatus === 'ALLOCATED'
            ? 'allocatedQty'
            : input.toStatus === 'CHECKING'
              ? 'checkingQty'
              : 'defectiveQty';

      const txNo = generateFGTransactionNo('STAT');

      const result = await this.prisma.$transaction(async (tx) => {
        const currentLot = await tx.finishedGoodsLot.findUnique({
          where: { id: input.finishedGoodsLotId },
        });

        if (!currentLot) {
          throw new Error(
            `Finished Goods Lot with ID ${input.finishedGoodsLotId} not found`,
          );
        }

        const currentFromQty = new Prisma.Decimal(currentLot[fromField]);
        if (currentFromQty.lessThan(qty)) {
          throw new Error(
            `Insufficient ${input.fromStatus} quantity. Requested: ${input.quantity}, Available in lot: ${currentFromQty.toString()}`,
          );
        }

        const updatedLot = await tx.finishedGoodsLot.update({
          where: { id: input.finishedGoodsLotId },
          data: {
            [fromField]: { decrement: qty },
            [toField]: { increment: qty },
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? currentLot.remarks,
            updatedBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        const transaction = await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: 'STATUS_CHANGE',
            direction: 'INTERNAL',
            transactionDate: new Date(),
            itemId: updatedLot.itemId,
            fabricationId: updatedLot.fabricationId,
            finishedGoodsLotId: updatedLot.id,
            orderNo: updatedLot.orderNo,
            lotNo: updatedLot.lotNo,
            chargeNo: updatedLot.chargeNo,
            invoiceNo: updatedLot.invoiceNo,
            fromAreaId: updatedLot.areaId,
            toAreaId: updatedLot.areaId,
            fromLocationId: updatedLot.locationId,
            toLocationId: updatedLot.locationId,
            fromBoxId: updatedLot.boxId,
            toBoxId: updatedLot.boxId,
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
            quantity: qty,
            balanceAfter: Number(updatedLot[toField]),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        return { lot: updatedLot, transaction };
      });

      this.loader.clear(result.lot.id);

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_STATUS_CHANGE',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: String(result.lot.id),
        description: `Status change for Lot ${result.lot.lotNo}: ${input.quantity} from ${input.fromStatus} to ${input.toStatus}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 4. Manual-Out (Deducts strictly from AVAILABLE)
  // ----------------------------------------------------
  async manualOut(
    input: ManualOutFinishedGoodsInput,
    context?: any,
  ): Promise<FinishedGoodsLotPayload> {
    const validationError = validateManualOutInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);
      const txNo = generateFGTransactionNo('MOUT');

      const result = await this.prisma.$transaction(async (tx) => {
        const currentLot = await tx.finishedGoodsLot.findUnique({
          where: { id: input.finishedGoodsLotId },
        });

        if (!currentLot) {
          throw new Error(
            `Finished Goods Lot with ID ${input.finishedGoodsLotId} not found`,
          );
        }

        const availableQty = new Prisma.Decimal(currentLot.availableQty);
        if (availableQty.lessThan(qty)) {
          throw new Error(
            `Insufficient AVAILABLE quantity for manual out. Requested: ${input.quantity}, Available: ${availableQty.toString()}`,
          );
        }

        const updatedLot = await tx.finishedGoodsLot.update({
          where: { id: input.finishedGoodsLotId },
          data: {
            availableQty: { decrement: qty },
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? currentLot.remarks,
            updatedBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        const transaction = await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: 'MANUAL_OUT',
            direction: 'OUTBOUND',
            transactionDate: new Date(),
            itemId: updatedLot.itemId,
            fabricationId: updatedLot.fabricationId,
            finishedGoodsLotId: updatedLot.id,
            orderNo: updatedLot.orderNo,
            lotNo: updatedLot.lotNo,
            chargeNo: updatedLot.chargeNo,
            invoiceNo: input.invoiceNo?.trim() ?? updatedLot.invoiceNo ?? null,
            fromAreaId: updatedLot.areaId,
            fromLocationId: updatedLot.locationId,
            fromBoxId: updatedLot.boxId,
            fromStatus: 'AVAILABLE',
            quantity: qty,
            balanceAfter: Number(updatedLot.availableQty),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            referenceNo: input.referenceNo?.trim() ?? updatedLot.orderNo,
            createdBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        return { lot: updatedLot, transaction };
      });

      this.loader.clear(result.lot.id);

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_MANUAL_OUT',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: String(result.lot.id),
        description: `Manual Out ${input.quantity} from Lot ${result.lot.lotNo}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 5. Discard (Deducts strictly from DEFECTIVE)
  // ----------------------------------------------------
  async discard(
    input: DiscardFinishedGoodsInput,
    context?: any,
  ): Promise<FinishedGoodsLotPayload> {
    const validationError = validateDiscardInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);
      const txNo = generateFGTransactionNo('DISC');

      const result = await this.prisma.$transaction(async (tx) => {
        const currentLot = await tx.finishedGoodsLot.findUnique({
          where: { id: input.finishedGoodsLotId },
        });

        if (!currentLot) {
          throw new Error(
            `Finished Goods Lot with ID ${input.finishedGoodsLotId} not found`,
          );
        }

        const defectiveQty = new Prisma.Decimal(currentLot.defectiveQty);
        if (defectiveQty.lessThan(qty)) {
          throw new Error(
            `Insufficient DEFECTIVE quantity for discard. Requested: ${input.quantity}, Defective: ${defectiveQty.toString()}`,
          );
        }

        const updatedLot = await tx.finishedGoodsLot.update({
          where: { id: input.finishedGoodsLotId },
          data: {
            defectiveQty: { decrement: qty },
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? currentLot.remarks,
            updatedBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        const transaction = await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: 'DISCARD',
            direction: 'OUTBOUND',
            transactionDate: new Date(),
            itemId: updatedLot.itemId,
            fabricationId: updatedLot.fabricationId,
            finishedGoodsLotId: updatedLot.id,
            orderNo: updatedLot.orderNo,
            lotNo: updatedLot.lotNo,
            chargeNo: updatedLot.chargeNo,
            invoiceNo: updatedLot.invoiceNo,
            fromAreaId: updatedLot.areaId,
            fromLocationId: updatedLot.locationId,
            fromBoxId: updatedLot.boxId,
            fromStatus: 'DEFECTIVE',
            quantity: qty,
            balanceAfter: Number(updatedLot.defectiveQty),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        return { lot: updatedLot, transaction };
      });

      this.loader.clear(result.lot.id);

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_DISCARD',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: String(result.lot.id),
        description: `Discarded ${input.quantity} defective units from Lot ${result.lot.lotNo}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 6. Movement / Transfer (Source Lot -> Dest Lot)
  // ----------------------------------------------------
  async move(
    input: MoveFinishedGoodsInput,
    context?: any,
  ): Promise<FinishedGoodsLotPayload> {
    const validationError = validateMoveInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);
      const statusToMove = input.status ?? 'AVAILABLE';
      const qtyField =
        statusToMove === 'AVAILABLE'
          ? 'availableQty'
          : statusToMove === 'ALLOCATED'
            ? 'allocatedQty'
            : statusToMove === 'CHECKING'
              ? 'checkingQty'
              : 'defectiveQty';

      const txNo = generateFGTransactionNo('MOV');

      const result = await this.prisma.$transaction(async (tx) => {
        const sourceLot = await tx.finishedGoodsLot.findUnique({
          where: { id: input.finishedGoodsLotId },
        });

        if (!sourceLot) {
          throw new Error(
            `Source Finished Goods Lot with ID ${input.finishedGoodsLotId} not found`,
          );
        }

        if (
          sourceLot.areaId === input.toAreaId &&
          sourceLot.locationId === input.toLocationId
        ) {
          throw new Error(
            'Destination Area and Location must be different from source',
          );
        }

        const currentQty = new Prisma.Decimal(sourceLot[qtyField]);
        if (currentQty.lessThan(qty)) {
          throw new Error(
            `Insufficient ${statusToMove} quantity to transfer. Available: ${currentQty.toString()}, Requested: ${input.quantity}`,
          );
        }

        const updatedSourceLot = await tx.finishedGoodsLot.update({
          where: { id: sourceLot.id },
          data: {
            [qtyField]: { decrement: qty },
            updatedBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        const destinationLot = await this.upsertLot(tx, {
          itemId: sourceLot.itemId,
          fabricationId: sourceLot.fabricationId,
          orderNo: sourceLot.orderNo,
          lotNo: sourceLot.lotNo,
          chargeNo: sourceLot.chargeNo,
          areaId: input.toAreaId,
          locationId: input.toLocationId,
          boxId: sourceLot.boxId,
          qtyField,
          qty,
          trialLotNo: sourceLot.trialLotNo ?? undefined,
          invoiceNo: sourceLot.invoiceNo,
          incomingDate: sourceLot.incomingDate,
          manufactureDate: sourceLot.manufactureDate,
          reason:
            input.reason?.trim() ??
            `Transfer from Area ${sourceLot.areaId}/Loc ${sourceLot.locationId}`,
          remarks: input.remarks?.trim() ?? sourceLot.remarks,
          userId: userId !== 'SYSTEM' ? userId : null,
        });

        const transaction = await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: 'MOVEMENT',
            direction: 'INTERNAL',
            transactionDate: new Date(),
            itemId: sourceLot.itemId,
            fabricationId: sourceLot.fabricationId,
            finishedGoodsLotId: sourceLot.id,
            orderNo: sourceLot.orderNo,
            lotNo: sourceLot.lotNo,
            chargeNo: sourceLot.chargeNo,
            invoiceNo: sourceLot.invoiceNo,
            fromAreaId: sourceLot.areaId,
            fromLocationId: sourceLot.locationId,
            fromBoxId: sourceLot.boxId,
            toAreaId: input.toAreaId,
            toLocationId: input.toLocationId,
            toBoxId: sourceLot.boxId,
            fromStatus: statusToMove,
            toStatus: statusToMove,
            quantity: qty,
            balanceAfter: Number(updatedSourceLot[qtyField]),
            reason: input.reason?.trim() ?? null,
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        return { sourceLot: updatedSourceLot, destinationLot, transaction };
      });

      this.loader.clear(result.sourceLot.id);
      this.loader.clear(result.destinationLot.id);

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_MOVEMENT',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: String(result.sourceLot.id),
        description: `Moved ${input.quantity} of Lot ${result.sourceLot.lotNo} from Area ${result.sourceLot.areaId}/Loc ${result.sourceLot.locationId} to Area ${input.toAreaId}/Loc ${input.toLocationId}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.sourceLot as any,
        destinationLot: result.destinationLot as any,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 7. Batch Movement
  // ----------------------------------------------------
  async batchMove(
    input: BatchMoveFinishedGoodsInput,
    context?: any,
  ): Promise<BatchFinishedGoodsPayload> {
    const validationError = validateBatchMoveInput(input);
    if (validationError) {
      return {
        lots: [],
        transactions: [],
        count: 0,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);

      const result = await this.prisma.$transaction(async (tx) => {
        const lots = [];
        const transactions = [];

        for (const item of input.items) {
          const qty = new Prisma.Decimal(item.quantity);
          const statusToMove = item.status ?? 'AVAILABLE';
          const qtyField =
            statusToMove === 'AVAILABLE'
              ? 'availableQty'
              : statusToMove === 'ALLOCATED'
                ? 'allocatedQty'
                : statusToMove === 'CHECKING'
                  ? 'checkingQty'
                  : 'defectiveQty';

          const txNo = generateFGTransactionNo('BMOV');

          const sourceLot = await tx.finishedGoodsLot.findUnique({
            where: { id: item.finishedGoodsLotId },
          });

          if (!sourceLot) {
            throw new Error(
              `Source Lot with ID ${item.finishedGoodsLotId} not found`,
            );
          }

          const currentQty = new Prisma.Decimal(sourceLot[qtyField]);
          if (currentQty.lessThan(qty)) {
            throw new Error(
              `Insufficient ${statusToMove} quantity in Lot ${sourceLot.lotNo}. Available: ${currentQty.toString()}, Requested: ${item.quantity}`,
            );
          }

          const updatedSourceLot = await tx.finishedGoodsLot.update({
            where: { id: sourceLot.id },
            data: {
              [qtyField]: { decrement: qty },
              updatedBy: userId !== 'SYSTEM' ? userId : null,
            },
          });

          const destinationLot = await this.upsertLot(tx, {
            itemId: sourceLot.itemId,
            fabricationId: sourceLot.fabricationId,
            orderNo: sourceLot.orderNo,
            lotNo: sourceLot.lotNo,
            chargeNo: sourceLot.chargeNo,
            areaId: input.toAreaId,
            locationId: input.toLocationId,
            boxId: sourceLot.boxId,
            qtyField,
            qty,
            trialLotNo: sourceLot.trialLotNo ?? undefined,
            invoiceNo: sourceLot.invoiceNo,
            incomingDate: sourceLot.incomingDate,
            manufactureDate: sourceLot.manufactureDate,
            reason:
              input.reason?.trim() ??
              `Batch transfer to Area ${input.toAreaId}`,
            remarks: input.remarks?.trim() ?? sourceLot.remarks,
            userId: userId !== 'SYSTEM' ? userId : null,
          });

          const transaction = await tx.finishedGoodsTransaction.create({
            data: {
              transactionNo: txNo,
              transactionType: 'MOVEMENT',
              direction: 'INTERNAL',
              transactionDate: new Date(),
              itemId: sourceLot.itemId,
              fabricationId: sourceLot.fabricationId,
              finishedGoodsLotId: sourceLot.id,
              orderNo: sourceLot.orderNo,
              lotNo: sourceLot.lotNo,
              chargeNo: sourceLot.chargeNo,
              invoiceNo: sourceLot.invoiceNo,
              fromAreaId: sourceLot.areaId,
              fromLocationId: sourceLot.locationId,
              fromBoxId: sourceLot.boxId,
              toAreaId: input.toAreaId,
              toLocationId: input.toLocationId,
              toBoxId: sourceLot.boxId,
              fromStatus: statusToMove,
              toStatus: statusToMove,
              quantity: qty,
              balanceAfter: Number(updatedSourceLot[qtyField]),
              reason: input.reason?.trim() ?? null,
              remarks: input.remarks?.trim() ?? null,
              createdBy: userId !== 'SYSTEM' ? userId : null,
            },
          });

          lots.push(destinationLot);
          transactions.push(transaction);
        }

        return { lots, transactions };
      });

      this.loader.clear();

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_BATCH_MOVEMENT',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: `${input.toAreaId}-${input.toLocationId}`,
        description: `Batch moved ${result.lots.length} lots to Area ${input.toAreaId}/Loc ${input.toLocationId}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lots: result.lots as any,
        transactions: result.transactions as any,
        count: result.lots.length,
        userErrors: [],
      };
    } catch (error) {
      return {
        lots: [],
        transactions: [],
        count: 0,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 8. Update Box Type
  // ----------------------------------------------------
  async updateBoxType(
    input: UpdateFinishedGoodsBoxTypeInput,
    context?: any,
  ): Promise<FinishedGoodsLotPayload> {
    const validationError = validateUpdateBoxTypeInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, 'INVALID_INPUT')],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const txNo = generateFGTransactionNo('BOX');

      const result = await this.prisma.$transaction(async (tx) => {
        const currentLot = await tx.finishedGoodsLot.findUnique({
          where: { id: input.finishedGoodsLotId },
        });

        if (!currentLot) {
          throw new Error(
            `Finished Goods Lot with ID ${input.finishedGoodsLotId} not found`,
          );
        }

        const oldBoxId = currentLot.boxId;
        const newBoxId = input.boxId ?? null;

        if (oldBoxId === newBoxId) {
          return { lot: currentLot, destinationLot: null, transaction: null };
        }

        const statusField =
          input.status === 'AVAILABLE'
            ? 'availableQty'
            : input.status === 'ALLOCATED'
              ? 'allocatedQty'
              : input.status === 'CHECKING'
                ? 'checkingQty'
                : input.status === 'DEFECTIVE'
                  ? 'defectiveQty'
                  : null;

        if (statusField) {
          const statusQty = Number(currentLot[statusField]);
          const targetQty =
            input.quantity != null && input.quantity > 0
              ? input.quantity
              : statusQty;

          if (targetQty <= 0) {
            throw new Error(
              `Lot ${currentLot.lotNo} has no quantity in status ${input.status}`,
            );
          }
          if (targetQty > statusQty) {
            throw new Error(
              `Requested quantity (${targetQty}) exceeds quantity in status ${input.status} (${statusQty})`,
            );
          }

          const hasOtherStatuses =
            (statusField !== 'availableQty' && Number(currentLot.availableQty) > 0) ||
            (statusField !== 'allocatedQty' && Number(currentLot.allocatedQty) > 0) ||
            (statusField !== 'checkingQty' && Number(currentLot.checkingQty) > 0) ||
            (statusField !== 'defectiveQty' && Number(currentLot.defectiveQty) > 0) ||
            targetQty < statusQty;

          if (hasOtherStatuses) {
            const updatedSourceLot = await tx.finishedGoodsLot.update({
              where: { id: currentLot.id },
              data: {
                [statusField]: { decrement: new Prisma.Decimal(targetQty) },
                updatedBy: userId !== 'SYSTEM' ? userId : null,
              },
            });

            const destinationLot = await this.upsertLot(tx, {
              itemId: currentLot.itemId,
              fabricationId: currentLot.fabricationId,
              orderNo: currentLot.orderNo,
              lotNo: currentLot.lotNo,
              chargeNo: currentLot.chargeNo,
              areaId: currentLot.areaId,
              locationId: currentLot.locationId,
              boxId: newBoxId,
              qtyField: statusField,
              qty: new Prisma.Decimal(targetQty),
              trialLotNo: currentLot.trialLotNo ?? '',
              invoiceNo: currentLot.invoiceNo,
              incomingDate: currentLot.incomingDate,
              manufactureDate: currentLot.manufactureDate,
              reason: input.reason?.trim() ?? 'Updated Box Type',
              remarks: input.remarks?.trim() ?? currentLot.remarks,
              userId: userId !== 'SYSTEM' ? userId : null,
            });

            const transaction = await tx.finishedGoodsTransaction.create({
              data: {
                transactionNo: txNo,
                transactionType: 'BOX_UPDATE',
                direction: 'INTERNAL',
                transactionDate: new Date(),
                itemId: currentLot.itemId,
                fabricationId: currentLot.fabricationId,
                finishedGoodsLotId: destinationLot.id,
                orderNo: currentLot.orderNo,
                lotNo: currentLot.lotNo,
                chargeNo: currentLot.chargeNo,
                invoiceNo: currentLot.invoiceNo,
                fromAreaId: currentLot.areaId,
                toAreaId: currentLot.areaId,
                fromLocationId: currentLot.locationId,
                toLocationId: currentLot.locationId,
                fromBoxId: oldBoxId,
                toBoxId: newBoxId,
                fromStatus: input.status,
                toStatus: input.status,
                quantity: new Prisma.Decimal(targetQty),
                balanceAfter: Number(destinationLot[statusField]),
                reason: input.reason?.trim() ?? 'Updated Box Type',
                remarks: input.remarks?.trim() ?? null,
                createdBy: userId !== 'SYSTEM' ? userId : null,
              },
            });

            return { lot: updatedSourceLot, destinationLot, transaction };
          }
        }

        // Entire lot is being reboxed (or only status present is the targeted one)
        let existingDest: any = null;
        if (newBoxId !== null) {
          existingDest = await tx.finishedGoodsLot.findUnique({
            where: {
              itemId_fabricationId_orderNo_lotNo_chargeNo_areaId_locationId_boxId: {
                itemId: currentLot.itemId,
                fabricationId: currentLot.fabricationId,
                orderNo: currentLot.orderNo,
                lotNo: currentLot.lotNo,
                chargeNo: currentLot.chargeNo,
                areaId: currentLot.areaId,
                locationId: currentLot.locationId,
                boxId: newBoxId,
              },
            },
          });
        } else {
          existingDest = await tx.finishedGoodsLot.findFirst({
            where: {
              itemId: currentLot.itemId,
              fabricationId: currentLot.fabricationId,
              orderNo: currentLot.orderNo,
              lotNo: currentLot.lotNo,
              chargeNo: currentLot.chargeNo,
              areaId: currentLot.areaId,
              locationId: currentLot.locationId,
              boxId: null,
            },
          });
        }

        let updatedLot: any;
        if (existingDest && existingDest.id !== currentLot.id) {
          updatedLot = await tx.finishedGoodsLot.update({
            where: { id: existingDest.id },
            data: {
              availableQty: { increment: currentLot.availableQty },
              allocatedQty: { increment: currentLot.allocatedQty },
              checkingQty: { increment: currentLot.checkingQty },
              defectiveQty: { increment: currentLot.defectiveQty },
              updatedBy: userId !== 'SYSTEM' ? userId : null,
            },
          });

          await tx.finishedGoodsLot.delete({
            where: { id: currentLot.id },
          });
        } else {
          updatedLot = await tx.finishedGoodsLot.update({
            where: { id: currentLot.id },
            data: {
              boxId: newBoxId,
              reason: input.reason?.trim() ?? currentLot.reason,
              remarks: input.remarks?.trim() ?? currentLot.remarks,
              updatedBy: userId !== 'SYSTEM' ? userId : null,
            },
          });
        }

        const totalQty =
          Number(updatedLot.availableQty) +
          Number(updatedLot.allocatedQty) +
          Number(updatedLot.checkingQty) +
          Number(updatedLot.defectiveQty);

        const transaction = await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: 'BOX_UPDATE',
            direction: 'INTERNAL',
            transactionDate: new Date(),
            itemId: updatedLot.itemId,
            fabricationId: updatedLot.fabricationId,
            finishedGoodsLotId: updatedLot.id,
            orderNo: updatedLot.orderNo,
            lotNo: updatedLot.lotNo,
            chargeNo: updatedLot.chargeNo,
            invoiceNo: updatedLot.invoiceNo,
            fromAreaId: updatedLot.areaId,
            toAreaId: updatedLot.areaId,
            fromLocationId: updatedLot.locationId,
            toLocationId: updatedLot.locationId,
            fromBoxId: oldBoxId,
            toBoxId: newBoxId,
            quantity: new Prisma.Decimal(totalQty),
            balanceAfter: totalQty,
            reason: input.reason?.trim() ?? 'Updated Box Type',
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        return { lot: updatedLot, destinationLot: null, transaction };
      });

      this.loader.clear(result.lot.id);
      if (result.destinationLot) {
        this.loader.clear(result.destinationLot.id);
      }

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_UPDATE_BOX_TYPE',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: String(result.lot.id),
        description: `Updated Box Type for Lot ${result.lot.lotNo} to Box ID ${input.boxId}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: (result.destinationLot ?? null) as any,
        transaction: (result.transaction ?? null) as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 9. Print Sticker
  // ----------------------------------------------------
  async printSticker(
    input: PrintFinishedGoodsStickerInput,
    context?: any,
  ): Promise<FinishedGoodsLotPayload> {
    if (!input.finishedGoodsLotId || input.finishedGoodsLotId <= 0) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [
          createError(
            'Valid Finished Goods Lot ID is required',
            undefined,
            'INVALID_INPUT',
          ),
        ],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const txNo = generateFGTransactionNo('STK');

      const result = await this.prisma.$transaction(async (tx) => {
        const currentLot = await tx.finishedGoodsLot.findUnique({
          where: { id: input.finishedGoodsLotId },
        });

        if (!currentLot) {
          throw new Error(
            `Finished Goods Lot with ID ${input.finishedGoodsLotId} not found`,
          );
        }

        const updatedLot = await tx.finishedGoodsLot.update({
          where: { id: currentLot.id },
          data: {
            stickerPrinted: true,
            stickerPrintedAt: new Date(),
            stickerPrintedBy: userId !== 'SYSTEM' ? userId : 'SYSTEM',
            updatedBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        const totalQty =
          Number(updatedLot.availableQty) +
          Number(updatedLot.allocatedQty) +
          Number(updatedLot.checkingQty) +
          Number(updatedLot.defectiveQty);

        const transaction = await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: 'STICKER_PRINT',
            direction: 'INTERNAL',
            transactionDate: new Date(),
            itemId: updatedLot.itemId,
            fabricationId: updatedLot.fabricationId,
            finishedGoodsLotId: updatedLot.id,
            orderNo: updatedLot.orderNo,
            lotNo: updatedLot.lotNo,
            chargeNo: updatedLot.chargeNo,
            invoiceNo: updatedLot.invoiceNo,
            fromAreaId: updatedLot.areaId,
            toAreaId: updatedLot.areaId,
            fromLocationId: updatedLot.locationId,
            toLocationId: updatedLot.locationId,
            fromBoxId: updatedLot.boxId,
            toBoxId: updatedLot.boxId,
            quantity: new Prisma.Decimal(totalQty),
            balanceAfter: totalQty,
            reason: 'Sticker Printed',
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== 'SYSTEM' ? userId : null,
          },
        });

        return { lot: updatedLot, transaction };
      });

      this.loader.clear(result.lot.id);

      await this.auditService.log({
        userId: userId ?? 'SYSTEM',
        action: 'FINISHED_GOODS_PRINT_STICKER',
        method: 'GRAPHQL_MUTATION',
        tableName: 'FinishedGoodsLot',
        recordId: String(result.lot.id),
        description: `Printed sticker for Lot ${result.lot.lotNo}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
