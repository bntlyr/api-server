import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { Machine as PrismaMachine } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MachineLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMachine | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.machine.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byMachineTypeId = new DataLoader<number, PrismaMachine[]>(
    async (machineTypeIds: readonly (number)[]) => {
      const rows = await this.prisma.machine.findMany({
        where: { machineTypeId: { in: [...machineTypeIds] } },
      });
      const groupMap = new Map<number, PrismaMachine[]>();
      for (const row of rows) {
        if (row.machineTypeId != null) {
          const list = groupMap.get(row.machineTypeId) ?? [];
          list.push(row);
          groupMap.set(row.machineTypeId, list);
        }
      }
      return machineTypeIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly bySectionId = new DataLoader<number, PrismaMachine[]>(
    async (sectionIds: readonly (number)[]) => {
      const rows = await this.prisma.machine.findMany({
        where: { sectionId: { in: [...sectionIds] } },
      });
      const groupMap = new Map<number, PrismaMachine[]>();
      for (const row of rows) {
        if (row.sectionId != null) {
          const list = groupMap.get(row.sectionId) ?? [];
          list.push(row);
          groupMap.set(row.sectionId, list);
        }
      }
      return sectionIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.bySectionId) this.bySectionId.clearAll();
    if (this.byMachineTypeId) this.byMachineTypeId.clearAll();
    }
  }
}
