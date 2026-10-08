import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { DefaultRouteMachining as PrismaDefaultRouteMachining } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class DefaultRouteMachiningLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaDefaultRouteMachining | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteMachining.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byDefaultRouteStepId = new DataLoader<number, PrismaDefaultRouteMachining[]>(
    async (defaultRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteMachining.findMany({
        where: { defaultRouteStepId: { in: [...defaultRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaDefaultRouteMachining[]>();
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

    public readonly byMachineId = new DataLoader<number, PrismaDefaultRouteMachining[]>(
    async (machineIds: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteMachining.findMany({
        where: { machineId: { in: [...machineIds] } },
      });
      const groupMap = new Map<number, PrismaDefaultRouteMachining[]>();
      for (const row of rows) {
        if (row.machineId != null) {
          const list = groupMap.get(row.machineId) ?? [];
          list.push(row);
          groupMap.set(row.machineId, list);
        }
      }
      return machineIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byMachineId) this.byMachineId.clearAll();
    if (this.byDefaultRouteStepId) this.byDefaultRouteStepId.clearAll();
    }
  }
}
