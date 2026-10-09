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

## System Notification Triggers

### 1. Finished Goods (FG) Allocation Subsystem
- **Request Submitted (`submitFgAllocations`)**: Notifies warehouse approvers and superAdmins when planning requests FG stock allocation (`"New FG Allocation Request: ${orderNo}"`).
- **Request Approved (`approveFinishedGoodsAllocationRequest`)**: Notifies the original requestor and Sales Order PIC upon warehouse review and stock dedication (`"FG Allocation Approved: ${orderNo}"`).
- **Request Rejected (`rejectFinishedGoodsAllocationRequest`)**: Notifies the requestor with the recorded rejection reason (`"FG Allocation Rejected: ${orderNo}"`).

### 2. Remake Alerts for Production Sections
- **Remake Scheduled (`createRemakeSchedule`)**:
  - Dynamically extracts the route steps of the remake slip to identify all distinct `sectionId`s involved (e.g., Wax Injection, Casting, Machining, QA).
  - Broadcasts targeted alerts (`"Remake Alert: Order ${orderNo} (${remakeLots.join(', ')})"`) to all active workers and supervisors in those sections (plus Super Admins).

### 3. Left-Running DTR Monitoring
- **Floor Monitoring Mutation (`notifyLeftRunningDtrs(maxHoursRunning?: Float)`)**:
  - Detects active DTR sessions running past threshold duration (default: $\ge 4.0$ hours).
  - Dispatches personalized alert (`"Active DTR Left Running: ${processName}"`) to the worker reminding them to stop their session.
  - Escalates to section supervisors and managers for stale sessions running $> 8$ hours.

