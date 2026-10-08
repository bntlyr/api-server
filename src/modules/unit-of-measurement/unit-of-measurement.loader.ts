import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UnitOfMeasurement as PrismaUnitOfMeasurement } from '../../generated/prisma/client.js';

@Injectable({ scope: Scope.REQUEST })
export class UnitOfMeasurementLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaUnitOfMeasurement | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.unitOfMeasurement.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map<number, PrismaUnitOfMeasurement>(
        rows.map((row: PrismaUnitOfMeasurement) => [row.id, row]),
      );
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
