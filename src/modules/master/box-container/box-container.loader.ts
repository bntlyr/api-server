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

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    }
  }
}
