import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { DefaultRouteStep as PrismaDefaultRouteStep } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class DefaultRouteStepLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaDefaultRouteStep | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteStep.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byDefaultRouteId = new DataLoader<number, PrismaDefaultRouteStep[]>(
    async (defaultRouteIds: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteStep.findMany({
        where: { defaultRouteId: { in: [...defaultRouteIds] } },
      });
      const groupMap = new Map<number, PrismaDefaultRouteStep[]>();
      for (const row of rows) {
        if (row.defaultRouteId != null) {
          const list = groupMap.get(row.defaultRouteId) ?? [];
          list.push(row);
          groupMap.set(row.defaultRouteId, list);
        }
      }
      return defaultRouteIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly bySectionId = new DataLoader<number, PrismaDefaultRouteStep[]>(
    async (sectionIds: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteStep.findMany({
        where: { sectionId: { in: [...sectionIds] } },
      });
      const groupMap = new Map<number, PrismaDefaultRouteStep[]>();
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

    public readonly byProcessId = new DataLoader<number, PrismaDefaultRouteStep[]>(
    async (processIds: readonly (number)[]) => {
      const rows = await this.prisma.defaultRouteStep.findMany({
        where: { processId: { in: [...processIds] } },
      });
      const groupMap = new Map<number, PrismaDefaultRouteStep[]>();
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
    if (this.byDefaultRouteId) this.byDefaultRouteId.clearAll();
    }
  }
}
