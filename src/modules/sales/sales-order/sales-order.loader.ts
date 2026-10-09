import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type { SalesOrder as PrismaSalesOrder } from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class SalesOrderLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaSalesOrder | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.salesOrder.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly byOrderNo = new DataLoader<string, PrismaSalesOrder | null>(
    async (orderNos: readonly string[]) => {
      const rows = await this.prisma.salesOrder.findMany({
        where: { orderNo: { in: [...orderNos] } },
      });
      const map = new Map(rows.map((row) => [row.orderNo, row]));
      return orderNos.map((no) => map.get(no) ?? null);
    },
  );

  public readonly bySalesOrderNo = new DataLoader<string, PrismaSalesOrder[]>(
    async (poNumbers: readonly string[]) => {
      const rows = await this.prisma.salesOrder.findMany({
        where: { salesOrderNo: { in: [...poNumbers] } },
        orderBy: { id: "asc" },
      });
      const map = new Map<string, PrismaSalesOrder[]>();
      for (const row of rows) {
        const list = map.get(row.salesOrderNo) ?? [];
        list.push(row);
        map.set(row.salesOrderNo, list);
      }
      return poNumbers.map((po) => map.get(po) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.byOrderNo.clearAll();
      this.bySalesOrderNo.clearAll();
    }
  }
}
