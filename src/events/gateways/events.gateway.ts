import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { TokenService } from "../../auth/services/token.service.js";
import type { DbCacheEvent } from "../interfaces/cache-event.interface.js";

@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/events",
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket) {
    try {
      // 1. Authenticate connection if token provided
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (rawToken) {
        const payload = this.tokenService.verifyAccessToken(rawToken);
        if (payload) {
          client.data.user = payload;
          // Join targeted user room for private cache events (e.g., user notifications)
          await client.join(`user:${payload.userId}`);
        }
      }

      // 2. Join global cache invalidation room
      await client.join("cache:global");
    } catch (err) {
      console.warn("WebSocket client connection handshake error:", err);
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket.io automatically cleans up rooms on disconnect
  }

  @SubscribeMessage("subscribe:entities")
  async handleSubscribeEntities(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { entities: string[] },
  ) {
    if (Array.isArray(data?.entities)) {
      for (const entity of data.entities) {
        if (typeof entity === "string" && entity.trim()) {
          await client.join(`entity:${entity.trim()}`);
        }
      }
      return { status: "subscribed", entities: data.entities };
    }
    return { status: "error", message: "entities array required" };
  }

  @SubscribeMessage("unsubscribe:entities")
  async handleUnsubscribeEntities(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { entities: string[] },
  ) {
    if (Array.isArray(data?.entities)) {
      for (const entity of data.entities) {
        if (typeof entity === "string" && entity.trim()) {
          await client.leave(`entity:${entity.trim()}`);
        }
      }
      return { status: "unsubscribed", entities: data.entities };
    }
    return { status: "error", message: "entities array required" };
  }

  /**
   * Broadcast database cache invalidation event to connected frontend clients.
   */
  broadcastCacheInvalidation(event: DbCacheEvent) {
    if (!this.server) return;

    // 1. Broadcast to global cache room
    this.server.to("cache:global").emit("cache:invalidate", event);

    // 2. Broadcast to specific entity room
    this.server.to(`entity:${event.table}`).emit("cache:invalidate", event);

    // 3. If event is user-specific, broadcast to the user's private room
    if (event.userId) {
      this.server.to(`user:${event.userId}`).emit("cache:invalidate", event);
    }
  }
}
