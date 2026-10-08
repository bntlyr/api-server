import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { FabRouteParameter as PrismaFabRouteParameter } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FabRouteParameterLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaFabRouteParameter | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteParameter.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byFabRouteStepId = new DataLoader<number, PrismaFabRouteParameter[]>(
    async (fabRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteParameter.findMany({
        where: { fabRouteStepId: { in: [...fabRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaFabRouteParameter[]>();
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
