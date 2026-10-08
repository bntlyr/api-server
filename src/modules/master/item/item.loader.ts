import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { Item as PrismaItem } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class ItemLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaItem | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.item.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

    public readonly byCustomerId = new DataLoader<number, PrismaItem[]>(
    async (customerIds: readonly (number)[]) => {
      const rows = await this.prisma.item.findMany({
        where: { customerId: { in: [...customerIds] } },
      });
      const groupMap = new Map<number, PrismaItem[]>();
      for (const row of rows) {
        if (row.customerId != null) {
          const list = groupMap.get(row.customerId) ?? [];
          list.push(row);
          groupMap.set(row.customerId, list);
        }
      }
      return customerIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly byItemTypeId = new DataLoader<number, PrismaItem[]>(
    async (itemTypeIds: readonly (number)[]) => {
      const rows = await this.prisma.item.findMany({
        where: { itemTypeId: { in: [...itemTypeIds] } },
      });
      const groupMap = new Map<number, PrismaItem[]>();
      for (const row of rows) {
        if (row.itemTypeId != null) {
          const list = groupMap.get(row.itemTypeId) ?? [];
          list.push(row);
          groupMap.set(row.itemTypeId, list);
        }
      }
      return itemTypeIds.map((id) => groupMap.get(id) ?? []);
    },
  );

    public readonly byRawMaterialId = new DataLoader<number, PrismaItem[]>(
    async (rawMaterialIds: readonly (number)[]) => {
      const rows = await this.prisma.item.findMany({
        where: { rawMaterialId: { in: [...rawMaterialIds] } },
      });
      const groupMap = new Map<number, PrismaItem[]>();
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

    public readonly byBoxTypeId = new DataLoader<number, PrismaItem[]>(
    async (boxTypeIds: readonly (number)[]) => {
      const rows = await this.prisma.item.findMany({
        where: { boxTypeId: { in: [...boxTypeIds] } },
      });
      const groupMap = new Map<number, PrismaItem[]>();
      for (const row of rows) {
        if (row.boxTypeId != null) {
          const list = groupMap.get(row.boxTypeId) ?? [];
          list.push(row);
          groupMap.set(row.boxTypeId, list);
        }
      }
      return boxTypeIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    if (this.byBoxTypeId) this.byBoxTypeId.clearAll();
    if (this.byRawMaterialId) this.byRawMaterialId.clearAll();
    if (this.byItemTypeId) this.byItemTypeId.clearAll();
    if (this.byCustomerId) this.byCustomerId.clearAll();
    }
  }
}
