import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { MouldType as PrismaMouldType } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MouldTypeLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMouldType | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.mouldType.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemTypeId = new DataLoader<number, PrismaMouldType[]>(
    async (itemTypeIds: readonly (number)[]) => {
      const rows = await this.prisma.mouldType.findMany({
        where: { itemTypeId: { in: [...itemTypeIds] } },
      });
      const groupMap = new Map<number, PrismaMouldType[]>();
      for (const row of rows) {
        if (row.itemTypeId != null) {
          const list = groupMap.get(row.itemTypeId) ?? [];
          list.push(row);
          groupMap.set(row.itemTypeId, list);
        }
      }
      return itemTypeIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byItemTypeId) this.byItemTypeId.clearAll();
    }
  }
}
