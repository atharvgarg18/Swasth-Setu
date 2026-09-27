import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/no-show/logs
 * Returns recent SMS gateway log entries + current system config
 * Used by the admin no-show dashboard
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);

  // Fetch recent log entries
  const { data: logs, error: logsError } = await adminClient
    .from('sms_gateway_log')
    .select(`
      id, patient_name, facility_name, service,
      referral_age_hours, asha_phone, payload,
      gateway_endpoint, sender_id, status, escalated_at,
      asha_worker:profiles!sms_gateway_log_asha_worker_id_fkey(full_name, phone)
    `)
    .order('escalated_at', { ascending: false })
    .limit(limit);

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  // Fetch system config
  const { data: config } = await adminClient
    .from('system_config')
    .select('key, value, description, updated_at');

  // Fetch cron job status (pg_cron schema — may not be accessible via JS client)
  let cronStatus = null;
  try {
    const { data } = await adminClient
      .from('cron.job' as any)
      .select('jobname, schedule, active, jobid')
      .eq('jobname', 'no-show-escalation')
      .maybeSingle();
    cronStatus = data;
  } catch (_) { /* cron schema not accessible via REST — that's fine */ }

  // Count by status
  const { count: totalEscalated } = await adminClient
    .from('sms_gateway_log')
    .select('*', { count: 'exact', head: true });

  const { count: recentEscalated } = await adminClient
    .from('sms_gateway_log')
    .select('*', { count: 'exact', head: true })
    .gte('escalated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return NextResponse.json({
    logs: logs ?? [],
    config: config ?? [],
    cron: cronStatus ?? null,
    stats: {
      total_escalated: totalEscalated ?? 0,
      escalated_last_24h: recentEscalated ?? 0,
    },
  });
}

/**
 * PATCH /api/no-show/logs
 * Update system config (e.g., change NO_SHOW_WINDOW_HOURS)
 */
export async function PATCH(request: Request) {
  const body = await request.json();
  const { key, value } = body;

  if (!key || !value) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  const { error } = await adminClient
    .from('system_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, key, value });
}

/**
 * POST /api/no-show/logs
 * Manually trigger escalation (for demo / testing)
 */
export async function POST() {
  const { data, error } = await adminClient.rpc('escalate_no_show_referrals');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, result: data });
}
