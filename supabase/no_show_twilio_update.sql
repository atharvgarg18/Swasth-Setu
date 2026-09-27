-- ============================================================
-- Update escalate_no_show_referrals() to send real Twilio SMS
-- via pg_net → /api/no-show/send-sms (Vercel endpoint)
-- Run this in Supabase SQL Editor after deploying the new API
-- ============================================================

-- Store the Vercel API URL and internal key in system_config
INSERT INTO system_config (key, value, description) VALUES
  ('VERCEL_API_URL',    'https://gramin-care.vercel.app', 'Base URL for internal API calls from pg_net'),
  ('CRON_INTERNAL_KEY', 'swasthya-setu-cron',             'Internal auth key for pg_net → Vercel API calls')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Replace the function with Twilio SMS support
CREATE OR REPLACE FUNCTION escalate_no_show_referrals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_api_url       text;
  v_internal_key  text;
BEGIN
  -- ── Read config ─────────────────────────────────────────────────────────
  SELECT value INTO v_enabled FROM system_config WHERE key = 'NO_SHOW_ENABLED';
  IF v_enabled IS DISTINCT FROM 'true' THEN
    RETURN jsonb_build_object('status','disabled');
  END IF;

  SELECT value::numeric INTO v_window_hours FROM system_config WHERE key = 'NO_SHOW_WINDOW_HOURS';
  v_window_hours := COALESCE(v_window_hours, 24);

  SELECT string_to_array(value, ',') INTO v_statuses FROM system_config WHERE key = 'NO_SHOW_CHECK_STATUSES';
  v_statuses := COALESCE(v_statuses, ARRAY['created','acknowledged']);

  SELECT value INTO v_api_url FROM system_config WHERE key = 'VERCEL_API_URL';
  v_api_url := COALESCE(v_api_url, 'https://gramin-care.vercel.app');

  SELECT value INTO v_internal_key FROM system_config WHERE key = 'CRON_INTERNAL_KEY';
  v_internal_key := COALESCE(v_internal_key, 'swasthya-setu-cron');

  -- ── Find stale referrals ─────────────────────────────────────────────────
  FOR v_referral IN
    SELECT
      r.id, r.patient_id, r.referred_by, r.service, r.urgency, r.status, r.created_at,
      r.destination_facility_id,
      EXTRACT(EPOCH FROM (now() - r.created_at)) / 3600 AS age_hours
    FROM referrals r
    WHERE
      r.status = ANY(v_statuses::referral_status[])
      AND r.created_at < now() - (v_window_hours || ' hours')::interval
      AND NOT EXISTS (SELECT 1 FROM sms_gateway_log s WHERE s.referral_id = r.id)
    ORDER BY r.created_at ASC
  LOOP
    v_age_hours  := round(v_referral.age_hours::numeric, 2);
    v_ref_number := upper(substring(v_referral.id::text, 1, 8));

    SELECT pat.id, pat.assigned_worker_id,
           p.full_name AS patient_name, p.phone AS patient_phone
    INTO v_patient
    FROM patients pat JOIN profiles p ON p.id = pat.user_id
    WHERE pat.id = v_referral.patient_id;

    IF v_patient IS NULL THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    SELECT id, full_name, phone INTO v_asha
    FROM profiles WHERE id = v_patient.assigned_worker_id;

    IF v_asha IS NULL THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    SELECT name INTO v_facility_name FROM facilities WHERE id = v_referral.destination_facility_id;
    v_facility_name := COALESCE(v_facility_name, 'assigned facility');

    -- ── 1. Update referral status ────────────────────────────────────────
    UPDATE referrals SET status = 'no_show', updated_at = now() WHERE id = v_referral.id;

    -- ── 2. Build NHM SMS payload ─────────────────────────────────────────
    v_sms_message := format(
      'NHMHLT ALERT: Patient %s has NOT arrived at %s for %s referral. Pending %s hrs. Ref#%s. Follow-up required. -Swasthya Setu',
      v_patient.patient_name, v_facility_name, v_referral.service, v_age_hours, v_ref_number
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

    -- ── 3. Log to sms_gateway_log ────────────────────────────────────────
    INSERT INTO sms_gateway_log (
      referral_id, asha_worker_id, patient_id,
      asha_phone, patient_name, facility_name, service,
      referral_age_hours, payload
    ) VALUES (
      v_referral.id, v_asha.id, v_patient.id,
      v_asha.phone, v_patient.patient_name, v_facility_name, v_referral.service,
      v_age_hours, v_payload
    );

    -- ── 4. In-app notification (Supabase Realtime) ────────────────────────
    INSERT INTO notifications (user_id, type, title, message, data, is_read)
    VALUES (
      v_asha.id,
      'no_show',
      '⚠️ No-Show Alert: ' || v_patient.patient_name,
      format('Patient %s has not arrived at %s for %s referral (pending %s hours). Physical follow-up required.',
             v_patient.patient_name, v_facility_name, v_referral.service, v_age_hours),
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

    -- ── 5. Real Twilio SMS via pg_net → Vercel API ────────────────────────
    PERFORM net.http_post(
      url     := v_api_url || '/api/no-show/send-sms',
      body    := jsonb_build_object(
        'message',      v_sms_message,
        'referral_id',  v_referral.id::text,
        'asha_phone',   v_asha.phone
      ),
      headers := jsonb_build_object(
        'Content-Type',    'application/json',
        'x-internal-key',  v_internal_key
      )
    );

    RAISE LOG '[NoShow] Escalated referral % | SMS queued via pg_net', v_referral.id;

    v_escalated := v_escalated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status',       'ok',
    'run_at',       now(),
    'window_hours', v_window_hours,
    'escalated',    v_escalated,
    'skipped',      v_skipped
  );
END;
$$;

SELECT 'Function updated with Twilio SMS support via pg_net' AS result;
