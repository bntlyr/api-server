import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { ItemRevision as PrismaItemRevision } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ItemRevisionLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaItemRevision | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.itemRevision.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemId = new DataLoader<number, PrismaItemRevision[]>(
    async (itemIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRevision.findMany({
        where: { itemId: { in: [...itemIds] } },
      });
      const groupMap = new Map<number, PrismaItemRevision[]>();
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
    if (this.byItemId) this.byItemId.clearAll();
    }
  }
}
