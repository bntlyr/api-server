import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { DefaultRouteParameter as PrismaDefaultRouteParameter } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class DefaultRouteParameterLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaDefaultRouteParameter | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteParameter.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byDefaultRouteStepId = new DataLoader<number, PrismaDefaultRouteParameter[]>(
    async (defaultRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteParameter.findMany({
        where: { defaultRouteStepId: { in: [...defaultRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaDefaultRouteParameter[]>();
      for (const row of rows) {
        if (row.defaultRouteStepId != null) {
          const list = groupMap.get(row.defaultRouteStepId) ?? [];
          list.push(row);
          groupMap.set(row.defaultRouteStepId, list);
        }
      }
      return defaultRouteStepIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byDefaultRouteStepId) this.byDefaultRouteStepId.clearAll();
    }
  }
}
