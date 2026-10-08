import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { ItemRouteStep as PrismaItemRouteStep } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ItemRouteStepLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaItemRouteStep | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteStep.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byItemRouteId = new DataLoader<number, PrismaItemRouteStep[]>(
    async (itemRouteIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteStep.findMany({
        where: { itemRouteId: { in: [...itemRouteIds] } },
      });
      const groupMap = new Map<number, PrismaItemRouteStep[]>();
      for (const row of rows) {
        if (row.itemRouteId != null) {
          const list = groupMap.get(row.itemRouteId) ?? [];
          list.push(row);
          groupMap.set(row.itemRouteId, list);
        }
      }
      return itemRouteIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly bySectionId = new DataLoader<number, PrismaItemRouteStep[]>(
    async (sectionIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteStep.findMany({
        where: { sectionId: { in: [...sectionIds] } },
      });
      const groupMap = new Map<number, PrismaItemRouteStep[]>();
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

    public readonly byProcessId = new DataLoader<number, PrismaItemRouteStep[]>(
    async (processIds: readonly (number)[]) => {
      const rows = await this.prisma.itemRouteStep.findMany({
        where: { processId: { in: [...processIds] } },
      });
      const groupMap = new Map<number, PrismaItemRouteStep[]>();
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

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byProcessId) this.byProcessId.clearAll();
    if (this.bySectionId) this.bySectionId.clearAll();
    if (this.byItemRouteId) this.byItemRouteId.clearAll();
    }
  }
}
