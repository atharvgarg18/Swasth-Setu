import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/visits - Create a visit record
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      patient_id: body.patient_id,
      worker_id: user.id,
      facility_id: body.facility_id,
      visit_type: body.visit_type ?? 'home_visit',
      chief_complaint: body.chief_complaint,
      notes: body.notes,
      visit_date: body.visit_date ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record vitals if provided
  if (body.vitals) {
    await supabase.from('vitals').insert({
      patient_id: body.patient_id,
      visit_id: visit.id,
      recorded_by: user.id,
      ...body.vitals,
    });
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'visit.created',
    entity_type: 'visit',
    entity_id: visit.id,
    details: { patient_id: body.patient_id, visit_type: body.visit_type },
  });

  return NextResponse.json({ data: visit }, { status: 201 });
}

/**
 * GET /api/visits - List visits
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id');
  const workerId = searchParams.get('worker_id');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  let dbQuery = supabase
    .from('visits')
    .select(`
      *,
      patient:patients!visits_patient_id_fkey(id, full_name),
      worker:profiles!visits_worker_id_fkey(id, full_name),
      vitals:vitals!vitals_visit_id_fkey(*)
    `)
    .order('visit_date', { ascending: false })
    .limit(limit);

  if (patientId) dbQuery = dbQuery.eq('patient_id', patientId);
  if (workerId) dbQuery = dbQuery.eq('worker_id', workerId);

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
