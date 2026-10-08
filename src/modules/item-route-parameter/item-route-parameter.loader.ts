import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { ItemRouteParameter as PrismaItemRouteParameter } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ItemRouteParameterLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaItemRouteParameter | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteParameter.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemRouteStepId = new DataLoader<number, PrismaItemRouteParameter[]>(
    async (itemRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteParameter.findMany({
        where: { itemRouteStepId: { in: [...itemRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaItemRouteParameter[]>();
      for (const row of rows) {
        if (row.itemRouteStepId != null) {
          const list = groupMap.get(row.itemRouteStepId) ?? [];
          list.push(row);
          groupMap.set(row.itemRouteStepId, list);
        }
      }
      return itemRouteStepIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byItemRouteStepId) this.byItemRouteStepId.clearAll();
    }
  }
}
