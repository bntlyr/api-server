# Microservice & Java Worker Guidelines

## Role & Processing Delegation
- `api-server` (NestJS) delegates heavy computational, batch aggregation, and analytical tasks to `java-server` (Spring Boot) via `JavaService`.
- Use the internal secret header (`X-Internal-Secret`) for all inter-service requests.

## Database & Model Ownership
- **Single Source of Truth**: Prisma in `api-server` owns database migrations and schema DDL.
- **Selective Mapping Constraint**: Do **NOT** replicate all Prisma models in `java-server`. Only create targeted models, record DTOs, or direct `JdbcTemplate` queries on demand for specific heavy processing tasks.

## Health Check Aggregation
- `java-server` exposes Spring Actuator at `/actuator/health`.
- `api-server` integrates `java-server` health into `HealthService` (`/health`, `/health/ready`, and `/health/java`).
- Readiness checks verify both PostgreSQL and `java-server` availability.

## PDF & Report Printing Delegation
- **Delegation Architecture**: `api-server` prepares business entities, user context, and Prisma relations, and delegates document rendering, QR code generation, and PDF stamping to `java-server`.
- **Inter-Service Communication**: Dispatch requests to `java-server` over `/api/v1/print/*` and `/api/v1/export/*` using `JavaService` with `X-Internal-Secret` authentication.
- **Dual Interface for Frontend**:
  - **GraphQL Mutations**: `printProductionSlip`, `printProductionSlipBatch`, `printTrialCard`, `printTrialCardBatch`.
  - **REST Endpoints**: `/api/print/production-slip`, `/api/print/production-slip/batch`, `/api/print/trial-card`, `/api/print/trial-card/batch`.

