import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { DefaultRoute as PrismaDefaultRoute } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class DefaultRouteLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaDefaultRoute | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.defaultRoute.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemTypeId = new DataLoader<number, PrismaDefaultRoute | null>(
    async (itemTypeIds: readonly (number)[]) => {
      const rows = await this.prisma.defaultRoute.findMany({
        where: { itemTypeId: { in: [...itemTypeIds] } },
      });
      const map = new Map(rows.map((row) => [row.itemTypeId, row]));
      return itemTypeIds.map((id) => (id != null ? map.get(id) ?? null : null));
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
