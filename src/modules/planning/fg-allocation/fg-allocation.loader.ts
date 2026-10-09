import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type { FinishedGoodsAllocationRequest as PrismaFgAllocationRequest } from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FinishedGoodsAllocationRequestLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaFgAllocationRequest | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsAllocationRequest.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly bySalesOrderId = new DataLoader<number, PrismaFgAllocationRequest[]>(
    async (salesOrderIds: readonly number[]) => {
      const rows = await this.prisma.finishedGoodsAllocationRequest.findMany({
        where: { salesOrderId: { in: [...salesOrderIds] }, deletedAt: null },
        orderBy: { id: "asc" },
      });
      const groupMap = new Map<number, PrismaFgAllocationRequest[]>();
      for (const row of rows) {
        if (row.salesOrderId != null) {
          const list = groupMap.get(row.salesOrderId) ?? [];
          list.push(row);
          groupMap.set(row.salesOrderId, list);
        }
      }
      return salesOrderIds.map((id) => groupMap.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.bySalesOrderId.clearAll();
    }
  }
}
