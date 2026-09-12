import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/patients - Search/list patients
 * Query params: q (search), worker_id, facility_id, high_risk, limit
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const workerId = searchParams.get('worker_id');
  const highRisk = searchParams.get('high_risk');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  let dbQuery = supabase
    .from('patients')
    .select(`
      *,
      assigned_worker:profiles!patients_assigned_worker_id_fkey(full_name),
      facility:facilities!patients_registered_facility_id_fkey(name, type)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (query) {
    dbQuery = dbQuery.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,abha_id.ilike.%${query}%`);
  }

  if (workerId) {
    dbQuery = dbQuery.eq('assigned_worker_id', workerId);
  }

  if (highRisk === 'true') {
    dbQuery = dbQuery.eq('is_high_risk', true);
  }

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/patients - Create a new patient
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Create patient
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      full_name: body.full_name,
      date_of_birth: body.date_of_birth,
      gender: body.gender,
      blood_group: body.blood_group,
      phone: body.phone,
      address: body.address,
      emergency_contact: body.emergency_contact,
      allergies: body.allergies ?? [],
      chronic_conditions: body.chronic_conditions ?? [],
      abha_id: body.abha_id,
      registered_by: user.id,
      assigned_worker_id: body.assigned_worker_id ?? user.id,
      registered_facility_id: body.facility_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create registration timeline event
  await supabase.from('patient_timeline').insert({
    patient_id: patient.id,
    event_type: 'registration',
    event_id: patient.id,
    title: 'Patient Registered',
    description: `Patient ${body.full_name} registered`,
    created_by: user.id,
    event_at: new Date().toISOString(),
  });

  // Create audit event
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'patient.created',
    entity_type: 'patient',
    entity_id: patient.id,
    details: { full_name: body.full_name },
  });

  return NextResponse.json({ data: patient }, { status: 201 });
}
