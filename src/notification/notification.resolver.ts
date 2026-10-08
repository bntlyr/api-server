import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service.js";
import { NotificationLoader } from "./notification.loader.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type {
  PaginationInput,
  SendNotificationInput,
  NotificationPayload,
  NotificationRecipientPayload,
  NotificationRecipientConnection,
} from "../generated/graphql/types.js";
import type {
  Notification as PrismaNotification,
  NotificationRecipient as PrismaNotificationRecipient,
} from "../generated/prisma/client.js";

@Resolver("Notification")
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly loader: NotificationLoader,
  ) {}

  @Query("notificationById")
  async notificationById(@Args("id") id: string) {
    return this.notificationService.findOne(id);
  }

  @ResolveField("recipients")
  async recipients(@Parent() notification: PrismaNotification) {
    return this.loader.recipientsByNotificationId.load(notification.id);
  }

  @Mutation("sendNotification")
  async sendNotification(
    @Args("input") input: SendNotificationInput,
    @Context() context: any,
  ): Promise<NotificationPayload> {
    return this.notificationService.send(
      {
        userIds: input.userIds,
        title: input.title,
        message: input.message,
        metadata: input.metadata,
      },
      context,
    );
  }
}

@Resolver("NotificationRecipient")
export class NotificationRecipientResolver {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly loader: NotificationLoader,
  ) {}

  @Query("myNotifications")
  @UseGuards(JwtAuthGuard)
  async myNotifications(
    @Context() context: any,
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("unreadOnly", { nullable: true }) unreadOnly?: boolean | null,
  ): Promise<NotificationRecipientConnection> {
    const userId = context.req?.user?.userId || context.user?.userId;
    return this.notificationService.getUserNotifications(userId, pagination, unreadOnly);
  }

  @Query("unreadNotificationCount")
  @UseGuards(JwtAuthGuard)
  async unreadNotificationCount(@Context() context: any): Promise<number> {
    const userId = context.req?.user?.userId || context.user?.userId;
    return this.notificationService.getUnreadCount(userId);
  }

  @Mutation("markNotificationAsRead")
  @UseGuards(JwtAuthGuard)
  async markNotificationAsRead(
    @Args("notificationId") notificationId: string,
    @Context() context: any,
  ): Promise<NotificationRecipientPayload> {
    const userId = context.req?.user?.userId || context.user?.userId;
    const parsedId = parseInt(notificationId, 10);
    return this.notificationService.markAsRead(userId, parsedId, context);
  }

  @Mutation("markAllNotificationsAsRead")
  @UseGuards(JwtAuthGuard)
  async markAllNotificationsAsRead(@Context() context: any): Promise<boolean> {
    const userId = context.req?.user?.userId || context.user?.userId;
    return this.notificationService.markAllAsRead(userId, context);
  }

  @Mutation("deleteNotification")
  @UseGuards(JwtAuthGuard)
  async deleteNotification(
    @Args("notificationId") notificationId: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req?.user?.userId || context.user?.userId;
    const parsedId = parseInt(notificationId, 10);
    return this.notificationService.deleteNotification(userId, parsedId, context);
  }

  @ResolveField("notification")
  async notification(@Parent() recipient: PrismaNotificationRecipient) {
    return this.loader.byId.load(recipient.notificationId);
  }

  @ResolveField("isRead")
  isRead(@Parent() recipient: PrismaNotificationRecipient): boolean {
    return Boolean(recipient.readAt);
  }
}
