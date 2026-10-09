import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../../prisma/prisma.service.js";
import type { FabDefect as PrismaFabDefect } from "../../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class FabDefectLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaFabDefect | null>(
    async (ids: readonly (number)[]) => {
      const rows = await this.prisma.fabDefect.findMany({
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
