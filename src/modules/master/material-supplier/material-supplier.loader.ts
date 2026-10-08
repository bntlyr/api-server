import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma//prisma.service.js";
import type { MaterialSupplier as PrismaMaterialSupplier } from "../../../generated//prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class MaterialSupplierLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaMaterialSupplier | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.materialSupplier.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly byMaterialId = new DataLoader<number, PrismaMaterialSupplier[]>(
    async (materialIds: readonly number[]) => {
      const rows = await this.prisma.materialSupplier.findMany({
        where: { materialId: { in: [...materialIds] } },
      });
      const groupMap = new Map<number, PrismaMaterialSupplier[]>();
      for (const row of rows) {
        if (row.materialId != null) {
          const list = groupMap.get(row.materialId) ?? [];
          list.push(row);
          groupMap.set(row.materialId, list);
        }
      }
      return materialIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  public readonly bySupplierId = new DataLoader<number, PrismaMaterialSupplier[]>(
    async (supplierIds: readonly number[]) => {
      const rows = await this.prisma.materialSupplier.findMany({
        where: { supplierId: { in: [...supplierIds] } },
      });
      const groupMap = new Map<number, PrismaMaterialSupplier[]>();
      for (const row of rows) {
        if (row.supplierId != null) {
          const list = groupMap.get(row.supplierId) ?? [];
          list.push(row);
          groupMap.set(row.supplierId, list);
        }
      }
      return supplierIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.byMaterialId.clearAll();
      this.bySupplierId.clearAll();
    }
  }
}
