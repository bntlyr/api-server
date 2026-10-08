import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type {
  FinishedGoodsLot as PrismaFinishedGoodsLot,
  FinishedGoodsTransaction as PrismaFinishedGoodsTransaction,
} from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FinishedGoodsInventoryLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly lotById = new DataLoader<number, PrismaFinishedGoodsLot | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsLot.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly lotsByItemId = new DataLoader<number, PrismaFinishedGoodsLot[]>(
    async (itemIds: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsLot.findMany({
        where: { itemId: { in: [...itemIds] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaFinishedGoodsLot[]>();
      for (const row of rows) {
        const list = map.get(row.itemId) ?? [];
        list.push(row);
        map.set(row.itemId, list);
      }
      return itemIds.map((id) => map.get(id) ?? []);
    },
  );

  public readonly lotsByFabricationId = new DataLoader<number, PrismaFinishedGoodsLot[]>(
    async (fabIds: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsLot.findMany({
        where: { fabricationId: { in: [...fabIds] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaFinishedGoodsLot[]>();
      for (const row of rows) {
        const list = map.get(row.fabricationId) ?? [];
        list.push(row);
        map.set(row.fabricationId, list);
      }
      return fabIds.map((id) => map.get(id) ?? []);
    },
  );

  public readonly transactionById = new DataLoader<number, PrismaFinishedGoodsTransaction | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsTransaction.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly transactionsByLotId = new DataLoader<number, PrismaFinishedGoodsTransaction[]>(
    async (lotIds: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsTransaction.findMany({
        where: { finishedGoodsLotId: { in: [...lotIds] } },
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaFinishedGoodsTransaction[]>();
      for (const row of rows) {
        if (row.finishedGoodsLotId != null) {
          const list = map.get(row.finishedGoodsLotId) ?? [];
          list.push(row);
          map.set(row.finishedGoodsLotId, list);
        }
      }
      return lotIds.map((id) => map.get(id) ?? []);
    },
  );

  public readonly transactionsByItemId = new DataLoader<number, PrismaFinishedGoodsTransaction[]>(
    async (itemIds: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsTransaction.findMany({
        where: { itemId: { in: [...itemIds] } },
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaFinishedGoodsTransaction[]>();
      for (const row of rows) {
        const list = map.get(row.itemId) ?? [];
        list.push(row);
        map.set(row.itemId, list);
      }
      return itemIds.map((id) => map.get(id) ?? []);
    },
  );

  public readonly transactionsByFabricationId = new DataLoader<number, PrismaFinishedGoodsTransaction[]>(
    async (fabIds: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsTransaction.findMany({
        where: { fabricationId: { in: [...fabIds] } },
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaFinishedGoodsTransaction[]>();
      for (const row of rows) {
        const list = map.get(row.fabricationId) ?? [];
        list.push(row);
        map.set(row.fabricationId, list);
      }
      return fabIds.map((id) => map.get(id) ?? []);
    },
  );

  clear(lotId?: number) {
    if (lotId != null) {
      this.lotById.clear(lotId);
    } else {
      this.lotById.clearAll();
      this.lotsByItemId.clearAll();
      this.lotsByFabricationId.clearAll();
      this.transactionById.clearAll();
      this.transactionsByLotId.clearAll();
      this.transactionsByItemId.clearAll();
      this.transactionsByFabricationId.clearAll();
    }
  }
}
