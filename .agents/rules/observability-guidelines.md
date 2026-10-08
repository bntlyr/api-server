# Health Checks & Observability Conventions

## Health Check Architecture
* Expose health endpoints under `/health` via dedicated `HealthModule`:
  * `GET /health`: Comprehensive health check (PostgreSQL connectivity query `SELECT 1`, latency measurement, process memory usage `rss`/`heap`, uptime, and environment).
  * `GET /health/live`: Lightweight liveness probe for Docker / Kubernetes container orchestration.
  * `GET /health/ready`: Readiness probe verifying external dependency availability (database connectivity).
* Return **HTTP 200** when healthy, and **HTTP 503 (Service Unavailable)** when dependencies are down or degraded.

## Request Tracing & Correlation IDs
* Assign or preserve an `x-request-id` (UUID) for every incoming REST and GraphQL request.
* Propagate `requestId` across ExecutionContext, GraphQL context, database query logs, and background tasks.
* Always return `requestId` in GraphQL and REST error response payloads so clients can supply the ID when reporting bugs.

## Structured Logging & Log Levels
* Emit machine-readable structured JSON logs containing:
  * `timestamp` (ISO 8601)
  * `level` (`debug`, `info`, `warn`, `error`)
  * `traceId` / `requestId`
  * `userId` (when authenticated)
  * `context` / `service` name
  * `operation` (GraphQL operation or HTTP route)
  * `durationMs`
  * `error` (message, error code, stack trace)
* Support environment-configured log levels (`LOG_LEVEL=info` in production, `debug` for detailed diagnostics).

## Security & Sensitive Data Redaction
* Automatically redact sensitive keys before emitting logs:
  * `password`, `token`, `authorization`, `cookie`, `secret`, `creditCard`.
* Ensure log exports can be safely shared from client deployments for troubleshooting without leaking credentials or PII.

## Slow Query & Performance Monitoring
* Log slow operations (GraphQL executions > 300ms, Prisma database queries > 200ms) with execution duration.
* Pair operational logs with `AuditTrailService` mutations to track historical entity changes.
