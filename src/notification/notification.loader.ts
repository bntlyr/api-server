import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  Notification as PrismaNotification,
  NotificationRecipient as PrismaNotificationRecipient,
} from "../generated/prisma/client.js";

@Injectable({ scope: Scope.REQUEST })
export class NotificationLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly byId = new DataLoader<number, PrismaNotification | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.notification.findMany({
        where: { id: { in: [...ids] } },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly recipientById = new DataLoader<number, PrismaNotificationRecipient | null>(
    async (ids: readonly number[]) => {
      const rows = await this.prisma.notificationRecipient.findMany({
        where: { id: { in: [...ids] }, deleted: false },
      });
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    },
  );

  public readonly recipientsByNotificationId = new DataLoader<number, PrismaNotificationRecipient[]>(
    async (notificationIds: readonly number[]) => {
      const rows = await this.prisma.notificationRecipient.findMany({
        where: { notificationId: { in: [...notificationIds] }, deleted: false },
      });
      const map = new Map<number, PrismaNotificationRecipient[]>();
      for (const row of rows) {
        const list = map.get(row.notificationId) || [];
        list.push(row);
        map.set(row.notificationId, list);
      }
      return notificationIds.map((id) => map.get(id) ?? []);
    },
  );

  clear(id?: number) {
    if (id != null) {
      this.byId.clear(id);
      this.recipientsByNotificationId.clear(id);
    } else {
      this.byId.clearAll();
      this.recipientById.clearAll();
      this.recipientsByNotificationId.clearAll();
    }
  }
}
