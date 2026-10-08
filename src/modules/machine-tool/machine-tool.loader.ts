import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { MachineTool as PrismaMachineTool } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MachineToolLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMachineTool | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.machineTool.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly byMachineId = new DataLoader<number, PrismaMachineTool[]>(
    async (machineIds: readonly number[]) => {
      const rows = await this.prisma.machineTool.findMany({
        where: { machineId: { in: [...machineIds] } },
      });
      const groupMap = new Map<number, PrismaMachineTool[]>();
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

  public readonly byToolId = new DataLoader<number, PrismaMachineTool[]>(
    async (toolIds: readonly number[]) => {
      const rows = await this.prisma.machineTool.findMany({
        where: { toolId: { in: [...toolIds] } },
      });
      const groupMap = new Map<number, PrismaMachineTool[]>();
      for (const row of rows) {
        if (row.toolId != null) {
          const list = groupMap.get(row.toolId) ?? [];
          list.push(row);
          groupMap.set(row.toolId, list);
        }
      }
      return toolIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.byMachineId.clearAll();
      this.byToolId.clearAll();
    }
  }
}
