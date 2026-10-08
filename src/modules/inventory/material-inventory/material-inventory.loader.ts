import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type {
  MaterialInventoryLot as PrismaMaterialInventoryLot,
  MaterialInventoryTransaction as PrismaMaterialInventoryTransaction,
} from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MaterialInventoryLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly lotById = new DataLoader<number, PrismaMaterialInventoryLot | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.materialInventoryLot.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly lotsByMaterialId = new DataLoader<number, PrismaMaterialInventoryLot[]>(
    async (materialIds: readonly number[]) => {
      const rows = await this.prisma.materialInventoryLot.findMany({
        where: { materialId: { in: [...materialIds] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaMaterialInventoryLot[]>();
      for (const row of rows) {
        const list = map.get(row.materialId) ?? [];
        list.push(row);
        map.set(row.materialId, list);
      }
      return materialIds.map((id) => map.get(id) ?? []);
    },
  );

  public readonly transactionById = new DataLoader<number, PrismaMaterialInventoryTransaction | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.materialInventoryTransaction.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly transactionsByLotId = new DataLoader<number, PrismaMaterialInventoryTransaction[]>(
    async (lotIds: readonly number[]) => {
      const rows = await this.prisma.materialInventoryTransaction.findMany({
        where: { materialInventoryLotId: { in: [...lotIds] } },
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaMaterialInventoryTransaction[]>();
      for (const row of rows) {
        if (row.materialInventoryLotId != null) {
          const list = map.get(row.materialInventoryLotId) ?? [];
          list.push(row);
          map.set(row.materialInventoryLotId, list);
        }
      }
      return lotIds.map((id) => map.get(id) ?? []);
    },
  );

  public readonly transactionsByMaterialId = new DataLoader<number, PrismaMaterialInventoryTransaction[]>(
    async (materialIds: readonly number[]) => {
      const rows = await this.prisma.materialInventoryTransaction.findMany({
        where: { materialId: { in: [...materialIds] } },
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      });
      const map = new Map<number, PrismaMaterialInventoryTransaction[]>();
      for (const row of rows) {
        const list = map.get(row.materialId) ?? [];
        list.push(row);
        map.set(row.materialId, list);
      }
      return materialIds.map((id) => map.get(id) ?? []);
    },
  );

  clear(lotId?: number) {
    if (lotId != null) {
      this.lotById.clear(lotId);
    } else {
      this.lotById.clearAll();
      this.lotsByMaterialId.clearAll();
      this.transactionById.clearAll();
      this.transactionsByLotId.clearAll();
      this.transactionsByMaterialId.clearAll();
    }
  }
}
