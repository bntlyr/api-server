import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { User as PrismaUser } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class UserLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<string, PrismaUser | null>(
    async (ids: readonly (string)[]) => {
      const rows = await this.prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byStatusCodeId = new DataLoader<number, PrismaUser[]>(
    async (statusCodeIds: readonly (number)[]) => {
      const rows = await this.prisma.user.findMany({
        where: { statusCodeId: { in: [...statusCodeIds] } },
      });
      const groupMap = new Map<number, PrismaUser[]>();
      for (const row of rows) {
        if (row.statusCodeId != null) {
          const list = groupMap.get(row.statusCodeId) ?? [];
          list.push(row);
          groupMap.set(row.statusCodeId, list);
        }
      }
      return statusCodeIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: string) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byStatusCodeId) this.byStatusCodeId.clearAll();
    }
  }
}
