import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { Supplier as PrismaSupplier } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class SupplierLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaSupplier | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.supplier.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly byStatusCodeId = new DataLoader<number, PrismaSupplier[]>(
    async (statusCodeIds: readonly number[]) => {
      const rows = await this.prisma.supplier.findMany({
        where: { statusCodeId: { in: [...statusCodeIds] } },
      });
      const groupMap = new Map<number, PrismaSupplier[]>();
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

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.byStatusCodeId.clearAll();
    }
  }
}
