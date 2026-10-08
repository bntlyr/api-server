---
trigger: always_on
description: Prisma 7 and database conventions for the api-server project
---

# Prisma 7 & Database Conventions

## Multi-File Schema Structure
- Store all Prisma models in `prisma/schema/` with one `.prisma` file per domain entity (e.g., `User.prisma`, `Section.prisma`, `Position.prisma`).
- Place datasource and generator definitions in `prisma/schema/schema.prisma`.
- Configure `prisma7.config.ts` with `schema: "prisma/schema"`.
- Set generator output to `../../src/generated/prisma` so generated files remain inside `src/`.

## Model Generation & Standard Schema Structure
- Generate new models using `npm run add <ModelName>` (or `npx add <ModelName.prisma>`).
- All standard domain models must follow this base structure:
  - **ID**: `id Int @id @default(autoincrement())`
  - **Base Fields**: `title String`, `content String?`
  - **Audit & Timestamps**:
    - `createdAt DateTime @default(now())`
    - `createdBy String?`
    - `updatedAt DateTime @updatedAt`
    - `updatedBy String?`
    - `deletedAt DateTime?`
    - `deletedBy String?`
  - **Index**: `@@index([deletedAt])`

## Soft Delete Standard
- Include `deletedAt DateTime?` and `@@index([deletedAt])` on all soft-deletable models.
- Never manually write `where: { deletedAt: null }` in standard repository queries; the global `softDeleteExtension` handles this automatically for read queries.
- Use `prisma.<model>.restore(where)` to undelete and `prisma.<model>.hardDelete(where)` for physical deletions when required.

## Prisma Client Instantiation
- Prisma 7 requires driver adapters. Always use `@prisma/adapter-pg` with a connection pool from `pg` when instantiating `PrismaClient`.
- Inject `PrismaService` from `src/prisma/prisma.service.ts` rather than instantiating `PrismaClient` directly.
