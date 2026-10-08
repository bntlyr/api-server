import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import pg from "pg";
import { EventsGateway } from "../gateways/events.gateway.js";
import type { DbCacheEvent } from "../interfaces/cache-event.interface.js";

const { Client } = pg;

const CHANNEL_NAME = "db_cache_events";

@Injectable()
export class PgListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgListenerService.name);
  private client: pg.Client | null = null;
  private isShuttingDown = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly eventsGateway: EventsGateway) {}

  async onModuleInit() {
    await this.connectAndListen();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.client) {
      try {
        await this.client.query(`UNLISTEN ${CHANNEL_NAME}`);
        await this.client.end();
      } catch (err) {
        this.logger.warn(`Error closing PG listener connection: ${(err as Error).message}`);
      }
    }
  }

  private async connectAndListen() {
    if (this.isShuttingDown) return;

    const connectionString =
      process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/bently";

    try {
      this.client = new Client({ connectionString });

      this.client.on("error", (err) => {
        this.logger.error(`Postgres Listener client error: ${err.message}`);
        this.scheduleReconnect();
      });

      this.client.on("end", () => {
        if (!this.isShuttingDown) {
          this.logger.warn("Postgres Listener connection closed unexpectedly. Reconnecting...");
          this.scheduleReconnect();
        }
      });

      this.client.on("notification", (msg) => {
        if (msg.channel === CHANNEL_NAME && msg.payload) {
          try {
            const event: DbCacheEvent = JSON.parse(msg.payload);
            this.logger.debug(
              `🔔 Received DB cache event: [${event.action}] on ${event.table} (id: ${event.id})`,
            );
            this.eventsGateway.broadcastCacheInvalidation(event);
          } catch (parseErr) {
            this.logger.error(`Failed to parse PG notification payload: ${msg.payload}`, parseErr);
          }
        }
      });

      await this.client.connect();
      await this.setupDatabaseTriggerFunction();
      await this.client.query(`LISTEN ${CHANNEL_NAME}`);
      this.logger.log(`🚀 PostgreSQL LISTEN initialized on channel: "${CHANNEL_NAME}"`);
    } catch (err) {
      this.logger.error(`Failed to connect PostgreSQL Listener: ${(err as Error).message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isShuttingDown || this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      this.logger.log("Attempting to reconnect PostgreSQL Listener...");
      await this.connectAndListen();
    }, 5000);
  }

  /**
   * Sets up the shared PL/pgSQL trigger function in PostgreSQL.
   */
  public async setupDatabaseTriggerFunction() {
    if (!this.client) return;

    const triggerFunctionSql = `
      CREATE OR REPLACE FUNCTION notify_db_cache_event()
      RETURNS TRIGGER AS $$
      DECLARE
        record_id TEXT;
        user_id TEXT := NULL;
        payload JSON;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          record_id := CAST(OLD.id AS TEXT);
        ELSE
          record_id := CAST(NEW.id AS TEXT);
          -- Capture userId if column exists for user-scoped cache invalidation
          IF TG_TABLE_NAME IN ('NotificationRecipient', 'Session', 'UserPage') THEN
            BEGIN
              user_id := CAST(NEW."userId" AS TEXT);
            EXCEPTION WHEN OTHERS THEN
              user_id := NULL;
            END;
          END IF;
        END IF;

        payload := json_build_object(
          'table', TG_TABLE_NAME,
          'action', TG_OP,
          'id', record_id,
          'userId', user_id,
          'timestamp', CURRENT_TIMESTAMP
        );

        PERFORM pg_notify('${CHANNEL_NAME}', payload::text);
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      await this.client.query(triggerFunctionSql);
    } catch (err) {
      this.logger.warn(`Could not setup notify_db_cache_event function: ${(err as Error).message}`);
    }
  }

  /**
   * Attach the cache invalidation trigger to a specific table.
   */
  public async attachTriggerToTable(tableName: string) {
    if (!this.client) return;

    const triggerName = `trg_cache_notify_${tableName.toLowerCase()}`;
    const sql = `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${triggerName}') THEN
            CREATE TRIGGER ${triggerName}
            AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
            FOR EACH ROW EXECUTE FUNCTION notify_db_cache_event();
          END IF;
        END IF;
      END $$;
    `;

    try {
      await this.client.query(sql);
      this.logger.debug(`Attached cache notification trigger to table "${tableName}"`);
    } catch (err) {
      this.logger.warn(`Failed to attach trigger to "${tableName}": ${(err as Error).message}`);
    }
  }
}
