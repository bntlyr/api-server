import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { Mould as PrismaMould } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MouldLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMould | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.mould.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byMouldTypeId = new DataLoader<number, PrismaMould[]>(
    async (mouldTypeIds: readonly (number)[]) => {
      const rows = await this.prisma.mould.findMany({
        where: { mouldTypeId: { in: [...mouldTypeIds] } },
      });
      const groupMap = new Map<number, PrismaMould[]>();
      for (const row of rows) {
        if (row.mouldTypeId != null) {
          const list = groupMap.get(row.mouldTypeId) ?? [];
          list.push(row);
          groupMap.set(row.mouldTypeId, list);
        }
      }
      return mouldTypeIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byMouldTypeId) this.byMouldTypeId.clearAll();
    }
  }
}
