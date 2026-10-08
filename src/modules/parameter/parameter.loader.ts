import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { Parameter as PrismaParameter } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ParameterLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaParameter | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.parameter.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byProcessId = new DataLoader<number, PrismaParameter[]>(
    async (processIds: readonly (number)[]) => {
      const rows = await this.prisma.parameter.findMany({
        where: { processId: { in: [...processIds] } },
      });
      const groupMap = new Map<number, PrismaParameter[]>();
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
    }
  }
}
