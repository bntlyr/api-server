import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { Process as PrismaProcess } from "../../../generated//prisma/client.js";

function normalizeProcess(row: PrismaProcess): PrismaProcess {
  return {
    ...row,
    itemTypeInclusion:
      row.itemTypeInclusion == null
        ? null
        : typeof row.itemTypeInclusion === "string"
          ? row.itemTypeInclusion
          : JSON.stringify(row.itemTypeInclusion),
    itemTypeExclusion:
      row.itemTypeExclusion == null
        ? null
        : typeof row.itemTypeExclusion === "string"
          ? row.itemTypeExclusion
          : JSON.stringify(row.itemTypeExclusion),
  } as PrismaProcess;
}

@Injectable({ scope: Scope.REQUEST })
export class ProcessLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaProcess | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.process.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, normalizeProcess(row)]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly bySectionId = new DataLoader<number, PrismaProcess[]>(
    async (sectionIds: readonly (number)[]) => {
      const rows = await this.prisma.process.findMany({
        where: { sectionId: { in: [...sectionIds] } },
      });
      const groupMap = new Map<number, PrismaProcess[]>();
      for (const row of rows) {
        if (row.sectionId != null) {
          const list = groupMap.get(row.sectionId) ?? [];
          list.push(normalizeProcess(row));
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
    }
  }
}
