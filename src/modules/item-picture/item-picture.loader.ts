import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { ItemPicture as PrismaItemPicture } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ItemPictureLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaItemPicture | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.itemPicture.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemId = new DataLoader<number, PrismaItemPicture[]>(
    async (itemIds: readonly (number)[]) => {
      const rows = await this.prisma.itemPicture.findMany({
        where: { itemId: { in: [...itemIds] } },
      });
      const groupMap = new Map<number, PrismaItemPicture[]>();
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

    public readonly byProcessId = new DataLoader<number, PrismaItemPicture[]>(
    async (processIds: readonly (number)[]) => {
      const rows = await this.prisma.itemPicture.findMany({
        where: { processId: { in: [...processIds] } },
      });
      const groupMap = new Map<number, PrismaItemPicture[]>();
      for (const row of rows) {
        if (row.processId != null) {
          const list = groupMap.get(row.processId) ?? [];
          list.push(row);
          groupMap.set(row.processId, list);
        }
      }
      return processIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byProcessId) this.byProcessId.clearAll();
    if (this.byItemId) this.byItemId.clearAll();
    }
  }
}
