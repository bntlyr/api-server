import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { ProcessMachining as PrismaProcessMachining } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ProcessMachiningLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaProcessMachining | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.processMachining.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byProcessId = new DataLoader<number, PrismaProcessMachining[]>(
    async (processIds: readonly (number)[]) => {
      const rows = await this.prisma.processMachining.findMany({
        where: { processId: { in: [...processIds] } },
      });
      const groupMap = new Map<number, PrismaProcessMachining[]>();
      for (const row of rows) {
        if (row.processId != null) {
          const list = groupMap.get(row.processId) ?? [];
          list.push(row);
          groupMap.set(row.processId, list);
        }
      }
      return processIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly byMachineId = new DataLoader<number, PrismaProcessMachining[]>(
    async (machineIds: readonly (number)[]) => {
      const rows = await this.prisma.processMachining.findMany({
        where: { machineId: { in: [...machineIds] } },
      });
      const groupMap = new Map<number, PrismaProcessMachining[]>();
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
    if (this.byProcessId) this.byProcessId.clearAll();
    }
  }
}
