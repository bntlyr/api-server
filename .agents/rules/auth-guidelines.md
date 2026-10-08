---
trigger: always_on
description: Authentication, session management, single active device enforcement, and RBAC permission rules for api-server
---

# Authentication, Authorization & Security Conventions

## Password Hashing & Security
- Always hash user passwords with `bcrypt` using **12 salt rounds**.
- Configure Helmet with custom CSP in development to allow Apollo Sandbox assets (`https://apollo-server-landing-page.cdn.apollographql.com`).
- Enable CORS with `credentials: true` for cookie/header session support.

## Session Management & Single Active Device Enforcement
- Track refresh tokens in the `Session` database table.
- **Single Active Device Policy**: When a user logs in, revoke all existing active sessions for that user (`revokedAt: new Date()`, `deleted: true`, `deletedBy: "SYSTEM_CONCURRENT_LOGIN_REVOKE"`).
- Embed `sessionId` in the access token JWT payload (`JwtUserPayload`).
- Validate on every authenticated request that the session ID exists in the DB, is not revoked, and is not soft-deleted.

## Authorization & RBAC
- User page permissions are defined in `UserPage` (`canView`, `canModify`, `canUnassign`).
- **Super Admin Bypass**: If `user.superAdmin` is `true`, all page and action permission checks (`PagePermissionGuard`) are bypassed with full access rights.
- Protect routes and GraphQL resolvers using `JwtAuthGuard` and `PagePermissionGuard`.
- Use the `@CurrentUser()` decorator or context user to retrieve authenticated session state.
