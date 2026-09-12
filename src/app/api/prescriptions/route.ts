import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/prescriptions - Create a prescription
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: prescription, error } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: body.patient_id,
      consultation_id: body.consultation_id,
      prescribed_by: user.id,
      medications: body.medications,
      notes: body.notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify patient
  const { data: patient } = await supabase
    .from('patients')
    .select('user_id')
    .eq('id', body.patient_id)
    .single();

  if (patient?.user_id) {
    await supabase.from('notifications').insert({
      user_id: patient.user_id,
      type: 'prescription_created',
      title: 'New Prescription',
      message: 'A new prescription has been issued for you.',
      data: { prescription_id: prescription.id },
    });
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'prescription.created',
    entity_type: 'prescription',
    entity_id: prescription.id,
    details: { patient_id: body.patient_id, medication_count: body.medications?.length },
  });

  return NextResponse.json({ data: prescription }, { status: 201 });
}

/**
 * GET /api/prescriptions - List prescriptions
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  let dbQuery = supabase
    .from('prescriptions')
    .select(`
      *,
      prescribed_by_user:profiles!prescriptions_prescribed_by_fkey(full_name),
      consultation:consultations!prescriptions_consultation_id_fkey(id, status, consultation_type)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (patientId) dbQuery = dbQuery.eq('patient_id', patientId);

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
