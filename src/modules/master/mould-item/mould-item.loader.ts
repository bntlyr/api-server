import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { MouldItem as PrismaMouldItem } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MouldItemLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMouldItem | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.mouldItem.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly byMouldId = new DataLoader<number, PrismaMouldItem[]>(
    async (mouldIds: readonly number[]) => {
      const rows = await this.prisma.mouldItem.findMany({
        where: { mouldId: { in: [...mouldIds] } },
      });
      const groupMap = new Map<number, PrismaMouldItem[]>();
      for (const row of rows) {
        if (row.mouldId != null) {
          const list = groupMap.get(row.mouldId) ?? [];
          list.push(row);
          groupMap.set(row.mouldId, list);
        }
      }
      return mouldIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  public readonly byItemId = new DataLoader<number, PrismaMouldItem[]>(
    async (itemIds: readonly number[]) => {
      const rows = await this.prisma.mouldItem.findMany({
        where: { itemId: { in: [...itemIds] } },
      });
      const groupMap = new Map<number, PrismaMouldItem[]>();
      for (const row of rows) {
        if (row.itemId != null) {
          const list = groupMap.get(row.itemId) ?? [];
          list.push(row);
          groupMap.set(row.itemId, list);
        }
      }
      return itemIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.byMouldId.clearAll();
      this.byItemId.clearAll();
    }
  }
}
