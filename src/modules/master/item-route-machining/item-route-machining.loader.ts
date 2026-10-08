import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { ItemRouteMachining as PrismaItemRouteMachining } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ItemRouteMachiningLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaItemRouteMachining | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteMachining.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemRouteStepId = new DataLoader<number, PrismaItemRouteMachining[]>(
    async (itemRouteStepIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteMachining.findMany({
        where: { itemRouteStepId: { in: [...itemRouteStepIds] } },
      });
      const groupMap = new Map<number, PrismaItemRouteMachining[]>();
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

    public readonly byMachineId = new DataLoader<number, PrismaItemRouteMachining[]>(
    async (machineIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteMachining.findMany({
        where: { machineId: { in: [...machineIds] } },
      });
      const groupMap = new Map<number, PrismaItemRouteMachining[]>();
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
    if (this.byItemRouteStepId) this.byItemRouteStepId.clearAll();
    }
  }
}
