import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { Melting as PrismaMelting } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MeltingLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMelting | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.melting.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byRawMaterialId = new DataLoader<number, PrismaMelting[]>(
    async (rawMaterialIds: readonly (number)[]) => {
      const rows = await this.prisma.melting.findMany({
        where: { rawMaterialId: { in: [...rawMaterialIds] } },
      });
      const groupMap = new Map<number, PrismaMelting[]>();
      for (const row of rows) {
        if (row.rawMaterialId != null) {
          const list = groupMap.get(row.rawMaterialId) ?? [];
          list.push(row);
          groupMap.set(row.rawMaterialId, list);
        }
      }
      return rawMaterialIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byRawMaterialId) this.byRawMaterialId.clearAll();
    }
  }
}
