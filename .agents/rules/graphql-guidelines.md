---
trigger: always_on
description: GraphQL architecture, modular layout, queries, filtering, and codegen conventions for api-server
---

# GraphQL & Module Architecture Conventions

## Module Directory Layout
Every domain entity in `src/modules/<entity>/` must follow this layout:
- `resolvers/<entity>.query.ts`: Query resolvers (`<entity>ById`, `<entities>Paginated`).
- `resolvers/<entity>.mutation.ts`: Mutation resolvers (`create`, `update`, `delete`, `restore`).
- `resolvers/<entity>.relation.ts`: Field resolvers and relationships.
- `helpers/<entity>.helper.ts`: Domain validation and helper functions.
- `<entity>.loader.ts`: Request-scoped DataLoader for batch lookups (`byId`, `byForeignKeyId`).
- `<entity>.service.ts`: Business logic and Prisma operations returning typed payloads with `userErrors`.
- `<entity>.typedefs.extend.graphql`: SDL schema and relation extensions.
- `<entity>.module.ts`: NestJS module registering providers and loaders.

## DataLoader & N+1 Prevention
- Every module includes `<entity>.loader.ts` decorated with `@Injectable({ scope: Scope.REQUEST })` to ensure per-request cache isolation.
- Loaders provide `byId` (batch lookup by primary key) and relation batch loaders (`by<Source>Id`).
- Relation resolvers in `<entity>.relation.ts` must use DataLoaders (`loader.byId.load(...)`, `loader.by<Source>Id.load(...)`) rather than executing raw Prisma queries.
- Mutation methods (`update`, `delete`, `restore`) in `<entity>.service.ts` call `loader.clear(id)` to invalidate DataLoader caches immediately.

## Generated Schemas & Gitignore
- Base GraphQL schemas are auto-generated from Prisma models into `src/generated/graphql/schemas/<entity>.graphql`.
- All `src/generated/` files are gitignored. Do not edit generated base schemas directly.
- Use `<entity>.typedefs.extend.graphql` for schema extensions and relationships.

## Typesafety & Codegen
- Run `npm run codegen` to generate TypeScript types into `src/generated/graphql/types.ts`.
- GraphQL Codegen maps types directly to Prisma models via `mappers` in `codegen.ts`.

## Query Conventions & Advanced Filtering
- Single-entity query format: `<entity>ById(id: ID!): <Entity>`.
- Paginated query format: `<entities>Paginated(pagination: PaginationInput, filter: <Entity>FilterInput): <Entity>Connection!`.
- Every model defines a typed `<Entity>FilterInput` with `search: String`, per-column operator filters, and `AND`/`OR`/`NOT` logical operators.
- Services use `buildPrismaWhere(filter, searchFields)` from `filter.helper.ts` and apply the resulting `where` clause to both `findMany` and `count({ where })`.

## Pagination & Mutation Payloads
- List queries use cursor-based pagination with `PaginationInput` (`first`, `after`), `PageInfo`, `edges`, and `nodes` via `pagination.helper.ts`.
- Mutations return payload types with `userErrors: [UserError!]!` formatted via `error.helper.ts`.
- All mutation resolvers pass `@Context() context` into domain services.
- Services use `extractContextInfo(context)` from `context.helper.ts` to retrieve `userId`, `ipAddress`, and `userAgent`.
- Every mutation (`create`, `update`, `delete`, `restore`) logs an audit event using `AuditTrailService.log()` and assigns `createdBy`, `updatedBy`, `deletedBy` accordingly.

## CLI Generators
- Create Prisma Model: `npm run add <ModelName>`
- Scaffold GraphQL Module & Codegen: `npm run init <ModelName>`
- Connect Models: `npm run connect <SourceModel> <TargetModel> [--prisma | --graphql] [--type=1:m | 1:1]`
- Disconnect Models: `npm run disconnect <SourceModel> <TargetModel>` (or `npx disconnect ...`)
- Delete Model: `npm run delete:model <ModelName>` (or `npx delete-model ...`)


