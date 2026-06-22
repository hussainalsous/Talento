-- =============================================================================
-- Supabase (local PostgreSQL) notifications table — TALENTO Job Platform
-- Run this script in the Supabase SQL editor or via psql.
-- Compatible with: DB::connection('supabase') in Laravel.
-- =============================================================================

-- ----------------------------------------
-- 1. Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT         NOT NULL,
    data       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------
-- 2. Indexes
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Composite — most common query: all notifications for a user, newest first
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications (user_id, created_at DESC);

-- Composite — unread count per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id, is_read);

-- ----------------------------------------
-- 3. Realtime (required for row-level filtering)
-- ----------------------------------------
-- REPLICA IDENTITY FULL lets Supabase Realtime include the full row in change
-- events, which is required for the user_id filter to work on INSERT payloads.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication so clients can subscribe.
-- Using IF NOT EXISTS guard to make this script safely re-runnable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ----------------------------------------
-- 5. updated_at trigger
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------
-- 6. Notification type reference
-- ----------------------------------------
-- The `data` JSONB column always contains a `type` key.
-- Known types used by the Laravel backend:
--
--   company_registration_request  — new company request, sent to all admins
--   company_approved              — company approved, sent to company owner
--   new_application               — job seeker applied, sent to all company members
--   application_status_update     — application status changed, sent to job seeker
--   invitation_received           — company sent invitation, sent to job seeker
--
-- Example row:
--   user_id   : 12
--   title     : 'New Application Received'
--   message   : 'John Doe applied for "Backend Engineer".'
--   data      : {"type":"new_application","application_id":5,"job_post_id":3,"job_seeker_id":12,"company_id":2}
--   is_read   : false
--   created_at: 2026-04-30 10:00:00
--   updated_at: 2026-04-30 10:00:00

-- ----------------------------------------
-- 7. Local Supabase connection (.env)
-- ----------------------------------------
-- SUPABASE_DB_HOST=127.0.0.1
-- SUPABASE_DB_PORT=54322        (default local Supabase port)
-- SUPABASE_DB_DATABASE=postgres
-- SUPABASE_DB_USERNAME=postgres
-- SUPABASE_DB_PASSWORD=postgres
-- SUPABASE_DB_SSLMODE=prefer
