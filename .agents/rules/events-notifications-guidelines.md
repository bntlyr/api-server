---
trigger: always_on
description: Notification system architecture, PG LISTEN/NOTIFY database triggers, and WebSocket real-time cache invalidation conventions
---

# Notifications & Real-Time Event Conventions

## Notification Architecture
- Store notifications using a normalized 2-table model:
  - `Notification`: Stores core notification data (`title`, `message`, `metadata`, `createdAt`).
  - `NotificationRecipient`: Tracks per-user delivery, read state (`readAt`), and deletion (`deleted`).
- Use the global `NotificationService.send({ userIds, title, message, metadata }, context?)` to dispatch notifications to single or multiple users in a single atomic transaction.
- Always use `NotificationLoader` in GraphQL resolvers to batch load `recipients` and `notification` relations without N+1 queries.

## Real-Time Events & WebSocket Cache Invalidation
- Use PostgreSQL `LISTEN / NOTIFY` on channel `db_cache_events` for database-level mutation events.
- Maintain a persistent listener in `PgListenerService` with auto-reconnect handling and automated trigger setup.
- Expose WebSocket Gateway on `/events` namespace (`EventsGateway`):
  - Authenticate clients during handshake using JWT `TokenService`.
  - Automatically route clients into `cache:global`, `entity:<TableName>`, and `user:<userId>` rooms.
  - Broadcast `cache:invalidate` events containing `{ table, action, id, userId, timestamp }` for instant frontend query cache invalidation (TanStack Query / Apollo Client).
