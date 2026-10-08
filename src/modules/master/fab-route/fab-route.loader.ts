import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { FabRoute as PrismaFabRoute } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FabRouteLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaFabRoute | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.fabRoute.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byFabricationId = new DataLoader<number, PrismaFabRoute[]>(
    async (fabricationIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRoute.findMany({
        where: { fabricationId: { in: [...fabricationIds] } },
      });
      const groupMap = new Map<number, PrismaFabRoute[]>();
      for (const row of rows) {
        if (row.fabricationId != null) {
          const list = groupMap.get(row.fabricationId) ?? [];
          list.push(row);
          groupMap.set(row.fabricationId, list);
        }
      }
      return fabricationIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byFabricationId) this.byFabricationId.clearAll();
    }
  }
}
