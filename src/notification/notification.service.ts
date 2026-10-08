import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuditTrailService } from "../auth/services/audit-trail.service.js";
import { NotificationLoader } from "./notification.loader.js";
import { extractContextInfo } from "../graphql/common/context.helper.js";
import { createError } from "../graphql/common/error.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../graphql/common/pagination.helper.js";
import type {
  PaginationInput,
  NotificationPayload,
  NotificationRecipientPayload,
  NotificationRecipientConnection,
} from "../generated/graphql/types.js";

export interface SendNotificationDto {
  userIds: string | string[];
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: NotificationLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  /**
   * Send a notification to one or multiple users.
   * Can be called from any module/service globally.
   */
  async send(dto: SendNotificationDto, context?: any): Promise<NotificationPayload> {
    if (!dto.title || dto.title.trim() === "") {
      return {
        notification: null,
        recipientCount: 0,
        userErrors: [createError("Notification title is required", "title", "INVALID_INPUT")],
      };
    }

    if (!dto.message || dto.message.trim() === "") {
      return {
        notification: null,
        recipientCount: 0,
        userErrors: [createError("Notification message is required", "message", "INVALID_INPUT")],
      };
    }

    const rawUserIds = Array.isArray(dto.userIds) ? dto.userIds : [dto.userIds];
    const userIds = [...new Set(rawUserIds.filter(Boolean))];

    if (userIds.length === 0) {
      return {
        notification: null,
        recipientCount: 0,
        userErrors: [createError("At least one recipient userId is required", "userIds", "INVALID_INPUT")],
      };
    }

    try {
      const { userId: actorId, ipAddress, userAgent } = extractContextInfo(context);

      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create base notification
        const notification = await tx.notification.create({
          data: {
            title: dto.title,
            message: dto.message,
            metadata: dto.metadata ? dto.metadata : undefined,
          },
        });

        // 2. Create recipient rows
        await tx.notificationRecipient.createMany({
          data: userIds.map((userId) => ({
            userId,
            notificationId: notification.id,
          })),
          skipDuplicates: true,
        });

        return notification;
      });

      // Clear cached loader state
      this.loader.clear(result.id);

      // Log audit trail
      await this.auditService.log({
        userId: actorId ?? "SYSTEM",
        action: "SEND_NOTIFICATION",
        method: "NOTIFICATION_SERVICE",
        tableName: "Notification",
        recordId: String(result.id),
        description: `Sent notification "${dto.title}" to ${userIds.length} user(s)`,
        metadata: { recipientUserIds: userIds },
        ipAddress,
        userAgent,
      });

      return {
        notification: result as any,
        recipientCount: userIds.length,
        userErrors: [],
      };
    } catch (error) {
      return {
        notification: null,
        recipientCount: 0,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Get a paginated list of notifications for a specific user.
   */
  async getUserNotifications(
    userId: string,
    pagination?: PaginationInput | null,
    unreadOnly?: boolean | null,
  ): Promise<NotificationRecipientConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = {
        userId,
        deleted: false,
        ...(unreadOnly ? { readAt: null } : {}),
      };

      const [recipients, totalCount, unreadCount] = await Promise.all([
        this.prisma.notificationRecipient.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: { id: "desc" },
          include: { notification: true },
        }),
        this.prisma.notificationRecipient.count({ where }),
        this.prisma.notificationRecipient.count({
          where: { userId, deleted: false, readAt: null },
        }),
      ]);

      const connection = toConnection(recipients, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        unreadCount,
        userErrors: [],
      } as unknown as NotificationRecipientConnection;
    } catch (error) {
      return {
        edges: [],
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
        unreadCount: 0,
        userErrors: [createError((error as Error).message)],
      } as unknown as NotificationRecipientConnection;
    }
  }

  /**
   * Count unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notificationRecipient.count({
      where: {
        userId,
        deleted: false,
        readAt: null,
      },
    });
  }

  /**
   * Mark a single notification as read for a user.
   */
  async markAsRead(
    userId: string,
    notificationId: number,
    context?: any,
  ): Promise<NotificationRecipientPayload> {
    try {
      const { ipAddress, userAgent } = extractContextInfo(context);

      const recipient = await this.prisma.notificationRecipient.findUnique({
        where: {
          userId_notificationId: {
            userId,
            notificationId,
          },
        },
      });

      if (!recipient || recipient.deleted) {
        return {
          recipient: null,
          userErrors: [createError("Notification recipient record not found", "notificationId", "NOT_FOUND")],
        };
      }

      const updated = await this.prisma.notificationRecipient.update({
        where: { id: recipient.id },
        data: { readAt: new Date() },
        include: { notification: true },
      });

      this.loader.clear(notificationId);

      await this.auditService.log({
        userId,
        action: "MARK_NOTIFICATION_READ",
        method: "NOTIFICATION_SERVICE",
        tableName: "NotificationRecipient",
        recordId: String(updated.id),
        description: `Marked notification ${notificationId} as read`,
        ipAddress,
        userAgent,
      });

      return {
        recipient: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        recipient: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string, context?: any): Promise<boolean> {
    try {
      const { ipAddress, userAgent } = extractContextInfo(context);

      await this.prisma.notificationRecipient.updateMany({
        where: {
          userId,
          deleted: false,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      await this.auditService.log({
        userId,
        action: "MARK_ALL_NOTIFICATIONS_READ",
        method: "NOTIFICATION_SERVICE",
        tableName: "NotificationRecipient",
        recordId: userId,
        description: `Marked all notifications as read for user ${userId}`,
        ipAddress,
        userAgent,
      });

      return true;
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      return false;
    }
  }

  /**
   * Soft-delete a notification for a user.
   */
  async deleteNotification(userId: string, notificationId: number, context?: any): Promise<boolean> {
    try {
      const { ipAddress, userAgent } = extractContextInfo(context);

      const recipient = await this.prisma.notificationRecipient.findUnique({
        where: {
          userId_notificationId: {
            userId,
            notificationId,
          },
        },
      });

      if (!recipient) return false;

      await this.prisma.notificationRecipient.update({
        where: { id: recipient.id },
        data: { deleted: true },
      });

      this.loader.clear(notificationId);

      await this.auditService.log({
        userId,
        action: "DELETE_USER_NOTIFICATION",
        method: "NOTIFICATION_SERVICE",
        tableName: "NotificationRecipient",
        recordId: String(recipient.id),
        description: `User deleted notification ${notificationId}`,
        ipAddress,
        userAgent,
      });

      return true;
    } catch (error) {
      console.error("Failed to delete notification for user:", error);
      return false;
    }
  }

  /**
   * Find a single notification by id.
   */
  async findOne(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    return this.loader.byId.load(Number.isNaN(parsedId) ? (id as any) : parsedId);
  }
}
