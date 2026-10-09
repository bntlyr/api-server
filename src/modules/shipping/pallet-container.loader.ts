import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { PalletContainer as PrismaPalletContainer } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class PalletContainerLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaPalletContainer | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.palletContainer.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly byShipmentId = new DataLoader<number, PrismaPalletContainer[]>(
    async (shipmentIds: readonly number[]) => {
      const rows = await this.prisma.palletContainer.findMany({
        where: {
          shipmentId: { in: [...shipmentIds] },
          deleted: false,
        },
        orderBy: { sequenceNo: "asc" },
      });
      const map = new Map<number, PrismaPalletContainer[]>();
      for (const row of rows) {
        const list = map.get(row.shipmentId) || [];
        list.push(row);
        map.set(row.shipmentId, list);
      }
      return shipmentIds.map((id) => map.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.byShipmentId.clearAll();
    }
  }
}
