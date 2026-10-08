import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { FabRouteMachining as PrismaFabRouteMachining } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FabRouteMachiningLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaFabRouteMachining | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteMachining.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byFabRouteStepId = new DataLoader<number, PrismaFabRouteMachining[]>(
    async (fabRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteMachining.findMany({
        where: { fabRouteStepId: { in: [...fabRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaFabRouteMachining[]>();
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

    public readonly byMachineId = new DataLoader<number, PrismaFabRouteMachining[]>(
    async (machineIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteMachining.findMany({
        where: { machineId: { in: [...machineIds] } },
      });
      const groupMap = new Map<number, PrismaFabRouteMachining[]>();
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
    if (this.byFabRouteStepId) this.byFabRouteStepId.clearAll();
    }
  }
}
