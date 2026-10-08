import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { RawMaterialRotation as PrismaRawMaterialRotation } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class RawMaterialRotationLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaRawMaterialRotation | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.rawMaterialRotation.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byRawMaterialId = new DataLoader<number, PrismaRawMaterialRotation[]>(
    async (rawMaterialIds: readonly (number)[]) => {
      const rows = await this.prisma.rawMaterialRotation.findMany({
        where: { rawMaterialId: { in: [...rawMaterialIds] } },
      });
      const groupMap = new Map<number, PrismaRawMaterialRotation[]>();
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
