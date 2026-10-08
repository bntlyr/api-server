import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { FabRouteStep as PrismaFabRouteStep } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FabRouteStepLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaFabRouteStep | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteStep.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byFabRouteId = new DataLoader<number, PrismaFabRouteStep[]>(
    async (fabRouteIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteStep.findMany({
        where: { fabRouteId: { in: [...fabRouteIds] } },
      });
      const groupMap = new Map<number, PrismaFabRouteStep[]>();
      for (const row of rows) {
        if (row.fabRouteId != null) {
          const list = groupMap.get(row.fabRouteId) ?? [];
          list.push(row);
          groupMap.set(row.fabRouteId, list);
        }
      }
      return fabRouteIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly bySectionId = new DataLoader<number, PrismaFabRouteStep[]>(
    async (sectionIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteStep.findMany({
        where: { sectionId: { in: [...sectionIds] } },
      });
      const groupMap = new Map<number, PrismaFabRouteStep[]>();
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

    public readonly byProcessId = new DataLoader<number, PrismaFabRouteStep[]>(
    async (processIds: readonly (number)[]) => {
      const rows = await this.prisma.fabRouteStep.findMany({
        where: { processId: { in: [...processIds] } },
      });
      const groupMap = new Map<number, PrismaFabRouteStep[]>();
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
    if (this.byFabRouteId) this.byFabRouteId.clearAll();
    }
  }
}
