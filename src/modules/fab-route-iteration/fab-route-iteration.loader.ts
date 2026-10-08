import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { FabRouteIteration as PrismaFabRouteIteration } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FabRouteIterationLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaFabRouteIteration | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteIteration.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byFabRouteStepId = new DataLoader<number, PrismaFabRouteIteration[]>(
    async (fabRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteIteration.findMany({
        where: { fabRouteStepId: { in: [...fabRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaFabRouteIteration[]>();
      for (const row of rows) {
        if (row.fabRouteStepId != null) {
          const list = groupMap.get(row.fabRouteStepId) ?? [];
          list.push(row);
          groupMap.set(row.fabRouteStepId, list);
        }
      }
      return fabRouteStepIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byFabRouteStepId) this.byFabRouteStepId.clearAll();
    }
  }
}
