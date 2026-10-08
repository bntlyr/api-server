import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { ItemRouteIteration as PrismaItemRouteIteration } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ItemRouteIterationLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaItemRouteIteration | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteIteration.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemRouteStepId = new DataLoader<number, PrismaItemRouteIteration[]>(
    async (itemRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteIteration.findMany({
        where: { itemRouteStepId: { in: [...itemRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaItemRouteIteration[]>();
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
