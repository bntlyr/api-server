import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { User as PrismaUser } from "../../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class UserLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<string, PrismaUser | null>(
    async (ids: readonly (string)[]) => {
      const rows = await this.prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  clear(id?: string) {
    if (id != null) {
      this.byId.clear(id);
    } else {
      this.byId.clearAll();
    }
  }
}
