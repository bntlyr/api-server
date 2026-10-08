-- ==============================================================================
-- PostgreSQL LISTEN / NOTIFY Trigger Function for Real-time Cache Invalidation
-- ==============================================================================

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
    
    -- Extract userId if present for targeted user room WebSocket delivery
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

  PERFORM pg_notify('db_cache_events', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to core domain tables
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY['User', 'Session', 'UserPage', 'Notification', 'NotificationRecipient', 'AuditTrail'];
BEGIN
  FOREACH tbl IN ARRAY tbls
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_cache_notify_%s ON %I;', lower(tbl), tbl);
      EXECUTE format('CREATE TRIGGER trg_cache_notify_%s AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION notify_db_cache_event();', lower(tbl), tbl);
      RAISE NOTICE 'Trigger attached to table: %', tbl;
    END IF;
  END LOOP;
END $$;
