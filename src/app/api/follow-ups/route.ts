import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/follow-ups - List follow-ups
 * Query params: worker_id, patient_id, status, category, limit
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get('worker_id');
  const patientId = searchParams.get('patient_id');
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const overdue = searchParams.get('overdue');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  let dbQuery = supabase
    .from('follow_ups')
    .select(`
      *,
      patient:patients!follow_ups_patient_id_fkey(id, full_name, phone, is_high_risk),
      assigned_worker:profiles!follow_ups_assigned_worker_id_fkey(id, full_name)
    `)
    .order('due_date', { ascending: true })
    .limit(limit);

  if (workerId) dbQuery = dbQuery.eq('assigned_worker_id', workerId);
  if (patientId) dbQuery = dbQuery.eq('patient_id', patientId);
  if (status) dbQuery = dbQuery.eq('status', status);
  if (category) dbQuery = dbQuery.eq('category', category);
  if (overdue === 'true') {
    dbQuery = dbQuery.in('status', ['overdue', 'due']).lt('due_date', new Date().toISOString().split('T')[0]);
  }

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/follow-ups - Create a follow-up
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: followUp, error } = await supabase
    .from('follow_ups')
    .insert({
      patient_id: body.patient_id,
      assigned_worker_id: body.assigned_worker_id,
      consultation_id: body.consultation_id,
      referral_id: body.referral_id,
      reason: body.reason,
      category: body.category ?? 'general',
      due_date: body.due_date,
      priority: body.priority ?? 'routine',
      status: 'upcoming',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify assigned worker
  if (body.assigned_worker_id && body.assigned_worker_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: body.assigned_worker_id,
      type: 'follow_up_assigned',
      title: 'New Follow-up Assigned',
      message: `Follow-up scheduled for ${body.due_date}: ${body.reason}`,
      data: { follow_up_id: followUp.id, patient_id: body.patient_id },
    });
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'follow_up.created',
    entity_type: 'follow_up',
    entity_id: followUp.id,
    details: { patient_id: body.patient_id, category: body.category, due_date: body.due_date },
  });

  return NextResponse.json({ data: followUp }, { status: 201 });
}
