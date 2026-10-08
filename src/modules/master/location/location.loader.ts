import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { Location as PrismaLocation } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class LocationLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaLocation | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.location.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byAreaId = new DataLoader<number, PrismaLocation[]>(
    async (areaIds: readonly (number)[]) => {
      const rows = await this.prisma.location.findMany({
        where: { areaId: { in: [...areaIds] } },
      });
      const groupMap = new Map<number, PrismaLocation[]>();
      for (const row of rows) {
        if (row.areaId != null) {
          const list = groupMap.get(row.areaId) ?? [];
          list.push(row);
          groupMap.set(row.areaId, list);
        }
      }
      return areaIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byAreaId) this.byAreaId.clearAll();
    }
  }
}
