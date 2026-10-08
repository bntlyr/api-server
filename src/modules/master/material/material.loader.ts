import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { Material as PrismaMaterial } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MaterialLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMaterial | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.material.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byMaterialGroupId = new DataLoader<number, PrismaMaterial[]>(
    async (materialGroupIds: readonly (number)[]) => {
      const rows = await this.prisma.material.findMany({
        where: { materialGroupId: { in: [...materialGroupIds] } },
      });
      const groupMap = new Map<number, PrismaMaterial[]>();
      for (const row of rows) {
        if (row.materialGroupId != null) {
          const list = groupMap.get(row.materialGroupId) ?? [];
          list.push(row);
          groupMap.set(row.materialGroupId, list);
        }
      }
      return materialGroupIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly bySectionId = new DataLoader<number, PrismaMaterial[]>(
    async (sectionIds: readonly (number)[]) => {
      const rows = await this.prisma.material.findMany({
        where: { sectionId: { in: [...sectionIds] } },
      });
      const groupMap = new Map<number, PrismaMaterial[]>();
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

    public readonly byRawMaterialId = new DataLoader<number, PrismaMaterial[]>(
    async (rawMaterialIds: readonly (number)[]) => {
      const rows = await this.prisma.material.findMany({
        where: { rawMaterialId: { in: [...rawMaterialIds] } },
      });
      const groupMap = new Map<number, PrismaMaterial[]>();
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
    if (this.bySectionId) this.bySectionId.clearAll();
    if (this.byMaterialGroupId) this.byMaterialGroupId.clearAll();
    }
  }
}
