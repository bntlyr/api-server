import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type { BoxContainer as PrismaBoxContainer } from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class BoxContainerLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaBoxContainer | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.boxContainer.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly byPalletContainerId = new DataLoader<number, PrismaBoxContainer[]>(
    async (palletIds: readonly number[]) => {
      const rows = await this.prisma.boxContainer.findMany({
        where: {
          palletContainerId: { in: [...palletIds] },
          deleted: false,
        },
        orderBy: { sequenceInPallet: "asc" },
      });
      const map = new Map<number, PrismaBoxContainer[]>();
      for (const row of rows) {
        if (row.palletContainerId != null) {
          const list = map.get(row.palletContainerId) || [];
          list.push(row);
          map.set(row.palletContainerId, list);
        }
      }
      return palletIds.map((id) => map.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
      this.byPalletContainerId.clearAll();
    }
  }
}
