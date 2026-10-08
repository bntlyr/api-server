import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type {
  MaterialIssuance as PrismaMaterialIssuance,
  MaterialIssuanceItem as PrismaMaterialIssuanceItem,
} from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MaterialIssuanceLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMaterialIssuance | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.materialIssuance.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly itemsByIssuanceId = new DataLoader<number, PrismaMaterialIssuanceItem[]>(
    async (issuanceIds: readonly number[]) => {
      const rows = await this.prisma.materialIssuanceItem.findMany({
        where: { materialIssuanceId: { in: [...issuanceIds] } },
        orderBy: { id: "asc" },
      });
      const map = new Map<number, PrismaMaterialIssuanceItem[]>();
      for (const row of rows) {
        const list = map.get(row.materialIssuanceId) ?? [];
        list.push(row);
        map.set(row.materialIssuanceId, list);
      }
      return issuanceIds.map((id) => map.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.itemsByIssuanceId.clearAll();
    }
  }
}
