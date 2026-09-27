-- ============================================================
-- Swasthya Setu — No-Show Escalation Engine
-- Challenge 2: Automated background worker via pg_cron
-- ============================================================

-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;  -- for future real HTTP calls if needed

-- Step 2: system_config table (configurable parameters)
CREATE TABLE IF NOT EXISTS system_config (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_at  timestamptz DEFAULT now()
);

-- Seed default config values
INSERT INTO system_config (key, value, description) VALUES
  ('NO_SHOW_WINDOW_HOURS', '24',
   'Hours after referral creation before it is marked no-show if patient has not arrived'),
  ('NO_SHOW_CHECK_STATUSES', 'created,acknowledged',
   'Comma-separated referral statuses considered stale'),
  ('NO_SHOW_ENABLED', 'true',
   'Master switch for the no-show escalation engine')
ON CONFLICT (key) DO NOTHING;

-- Step 3: SMS gateway log table (verifiable output — the NHM payload)
CREATE TABLE IF NOT EXISTS sms_gateway_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id     uuid REFERENCES referrals(id) ON DELETE SET NULL,
  asha_worker_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  patient_id      uuid REFERENCES patients(id) ON DELETE SET NULL,
  asha_phone      text,
  patient_name    text,
  facility_name   text,
  service         text,
  referral_age_hours numeric(10,2),
  -- Full simulated NHM SMS Gateway payload
  payload         jsonb NOT NULL,
  -- Gateway metadata
  gateway_endpoint text DEFAULT 'https://smsgateway.nhm.in/api/v1/send',
  sender_id       text DEFAULT 'NHMHLT',
  status          text DEFAULT 'SIMULATED',
  -- Audit
  escalated_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sms_log_referral    ON sms_gateway_log(referral_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_asha        ON sms_gateway_log(asha_worker_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_escalated   ON sms_gateway_log(escalated_at DESC);

-- Step 4: The core escalation function
CREATE OR REPLACE FUNCTION escalate_no_show_referrals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- runs with owner privileges to bypass RLS
AS $$
DECLARE
  v_window_hours  numeric;
  v_enabled       text;
  v_statuses      text[];
  v_referral      record;
  v_asha          record;
  v_patient       record;
  v_facility_name text;
  v_age_hours     numeric;
  v_sms_message   text;
  v_payload       jsonb;
  v_escalated     int := 0;
  v_skipped       int := 0;
  v_result        jsonb;
  v_ref_number    text;
BEGIN
  -- ── Read config ────────────────────────────────────────────────────────
  SELECT value INTO v_enabled  FROM system_config WHERE key = 'NO_SHOW_ENABLED';
  IF v_enabled IS DISTINCT FROM 'true' THEN
    RETURN jsonb_build_object('status', 'disabled', 'message', 'No-show escalation is disabled via system_config');
  END IF;

  SELECT value::numeric INTO v_window_hours
    FROM system_config WHERE key = 'NO_SHOW_WINDOW_HOURS';
  v_window_hours := COALESCE(v_window_hours, 24);

  SELECT string_to_array(value, ',') INTO v_statuses
    FROM system_config WHERE key = 'NO_SHOW_CHECK_STATUSES';
  v_statuses := COALESCE(v_statuses, ARRAY['created','acknowledged']);

  RAISE LOG '[NoShow] Engine running | window=% hours | statuses=%', v_window_hours, v_statuses;

  -- ── Find stale referrals ───────────────────────────────────────────────
  FOR v_referral IN
    SELECT
      r.id,
      r.patient_id,
      r.referred_by,
      r.service,
      r.urgency,
      r.status,
      r.created_at,
      r.destination_facility_id,
      EXTRACT(EPOCH FROM (now() - r.created_at)) / 3600 AS age_hours
    FROM referrals r
    WHERE
      r.status = ANY(v_statuses::referral_status[])
      AND r.created_at < now() - (v_window_hours || ' hours')::interval
      -- Don't re-escalate
      AND NOT EXISTS (
        SELECT 1 FROM sms_gateway_log s WHERE s.referral_id = r.id
      )
    ORDER BY r.created_at ASC
  LOOP
    v_age_hours := round(v_referral.age_hours::numeric, 2);
    v_ref_number := upper(substring(v_referral.id::text, 1, 8));

    RAISE LOG '[NoShow] Processing referral % (age=% hrs, status=%)',
      v_referral.id, v_age_hours, v_referral.status;

    -- ── Get patient info ────────────────────────────────────────────────
    SELECT
      pat.id,
      pat.assigned_worker_id,
      p.full_name AS patient_name,
      p.phone     AS patient_phone
    INTO v_patient
    FROM patients pat
    JOIN profiles p ON p.id = pat.user_id
    WHERE pat.id = v_referral.patient_id;

    IF v_patient IS NULL THEN
      RAISE LOG '[NoShow] Skipping referral % — patient not found', v_referral.id;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- ── Get ASHA worker info ────────────────────────────────────────────
    SELECT
      id,
      full_name,
      phone
    INTO v_asha
    FROM profiles
    WHERE id = v_patient.assigned_worker_id;

    IF v_asha IS NULL THEN
      RAISE LOG '[NoShow] Referral % — no ASHA assigned to patient', v_referral.id;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- ── Get facility name ───────────────────────────────────────────────
    SELECT name INTO v_facility_name
    FROM facilities
    WHERE id = v_referral.destination_facility_id;
    v_facility_name := COALESCE(v_facility_name, 'assigned facility');

    -- ── 1. Update referral status to no_show ────────────────────────────
    UPDATE referrals
    SET
      status     = 'no_show',
      updated_at = now()
    WHERE id = v_referral.id;

    RAISE LOG '[NoShow] Referral % → no_show', v_referral.id;

    -- ── 2. Build NHM SMS Gateway payload ────────────────────────────────
    v_sms_message := format(
      'NHMHLT ALERT: Patient %s has NOT arrived at %s for %s referral. Pending for %s hours. Ref#%s. Immediate follow-up required. -Swasthya Setu',
      v_patient.patient_name,
      v_facility_name,
      v_referral.service,
      v_age_hours,
      v_ref_number
    );

    v_payload := jsonb_build_object(
      'gateway',          'NHM-SMS-GW-v2',
      'endpoint',         'https://smsgateway.nhm.in/api/v1/send',
      'sender_id',        'NHMHLT',
      'to',               COALESCE(v_asha.phone, 'UNKNOWN'),
      'message',          v_sms_message,
      'priority',         CASE v_referral.urgency WHEN 'emergency' THEN 'CRITICAL' WHEN 'urgent' THEN 'HIGH' ELSE 'NORMAL' END,
      'status',           'SIMULATED',
      'referral_id',      v_referral.id,
      'referral_status',  'no_show',
      'referral_age_hrs', v_age_hours,
      'patient_name',     v_patient.patient_name,
      'asha_worker_id',   v_asha.id,
      'asha_worker_name', v_asha.full_name,
      'asha_phone',       v_asha.phone,
      'facility',         v_facility_name,
      'service',          v_referral.service,
      'escalated_at',     now(),
      'generated_by',     'escalate_no_show_referrals() via pg_cron'
    );

    -- ── 3. Log the SMS payload (verifiable output) ───────────────────────
    INSERT INTO sms_gateway_log (
      referral_id, asha_worker_id, patient_id,
      asha_phone, patient_name, facility_name, service,
      referral_age_hours, payload
    ) VALUES (
      v_referral.id, v_asha.id, v_patient.id,
      v_asha.phone, v_patient.patient_name, v_facility_name, v_referral.service,
      v_age_hours, v_payload
    );

    RAISE LOG '[NoShow] SMS payload logged | to=% | message=%', v_asha.phone, v_sms_message;

    -- ── 4. In-app notification → ASHA worker (triggers Supabase Realtime) ──
    INSERT INTO notifications (
      user_id, type, title, message, data, is_read
    ) VALUES (
      v_asha.id,
      'no_show',
      '⚠️ No-Show Alert: ' || v_patient.patient_name,
      format(
        'Patient %s has not arrived at %s for %s referral (pending %s hours). Physical follow-up required.',
        v_patient.patient_name, v_facility_name, v_referral.service, v_age_hours
      ),
      jsonb_build_object(
        'referral_id',  v_referral.id,
        'patient_name', v_patient.patient_name,
        'facility',     v_facility_name,
        'service',      v_referral.service,
        'age_hours',    v_age_hours,
        'sms_payload',  v_payload
      ),
      false
    );

    RAISE LOG '[NoShow] Notification → ASHA worker % (%)', v_asha.full_name, v_asha.id;

    v_escalated := v_escalated + 1;
  END LOOP;

  -- ── Summary ────────────────────────────────────────────────────────────
  v_result := jsonb_build_object(
    'status',      'ok',
    'run_at',      now(),
    'window_hours', v_window_hours,
    'escalated',   v_escalated,
    'skipped',     v_skipped
  );

  RAISE LOG '[NoShow] Run complete | escalated=% skipped=%', v_escalated, v_skipped;
  RETURN v_result;
END;
$$;

-- Step 5: Schedule via pg_cron — runs every minute
SELECT cron.schedule(
  'no-show-escalation',          -- job name
  '*/1 * * * *',                 -- every minute
  'SELECT escalate_no_show_referrals()'
);

-- Verify it's scheduled
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'no-show-escalation';
