import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/consultations - List consultations
 * Query params: doctor_id, patient_id, status, limit
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctor_id');
  const patientId = searchParams.get('patient_id');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  let dbQuery = supabase
    .from('consultations')
    .select(`
      *,
      patient:patients!consultations_patient_id_fkey(id, full_name, phone, gender, date_of_birth, is_high_risk),
      doctor:profiles!consultations_doctor_id_fkey(id, full_name),
      worker:profiles!consultations_worker_id_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (doctorId) dbQuery = dbQuery.eq('doctor_id', doctorId);
  if (patientId) dbQuery = dbQuery.eq('patient_id', patientId);
  if (status) dbQuery = dbQuery.eq('status', status);

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/consultations - Create/request a consultation
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: consultation, error } = await supabase
    .from('consultations')
    .insert({
      patient_id: body.patient_id,
      doctor_id: body.doctor_id,
      worker_id: body.worker_id ?? user.id,
      triage_session_id: body.triage_session_id,
      consultation_type: body.consultation_type ?? 'teleconsult_video',
      status: 'requested',
      priority: body.priority ?? 'routine',
      chief_complaint: body.chief_complaint,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify doctor
  if (body.doctor_id) {
    await supabase.from('notifications').insert({
      user_id: body.doctor_id,
      type: 'consultation_requested',
      title: 'New Consultation Request',
      message: `${body.priority === 'emergency' ? '🚨 EMERGENCY: ' : ''}New teleconsultation requested`,
      data: { consultation_id: consultation.id, patient_id: body.patient_id, priority: body.priority },
    });
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'consultation.requested',
    entity_type: 'consultation',
    entity_id: consultation.id,
    details: { patient_id: body.patient_id, priority: body.priority },
  });

  return NextResponse.json({ data: consultation }, { status: 201 });
}
