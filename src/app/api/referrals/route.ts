import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/referrals - List referrals with filters
 * Query params: patient_id, facility_id (source or dest), status, urgency, limit
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id');
  const facilityId = searchParams.get('facility_id');
  const status = searchParams.get('status');
  const urgency = searchParams.get('urgency');
  const active = searchParams.get('active'); // only non-completed/cancelled
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  let dbQuery = supabase
    .from('referrals')
    .select(`
      *,
      patient:patients!referrals_patient_id_fkey(id, full_name, phone, gender, date_of_birth),
      source_facility:facilities!referrals_source_facility_id_fkey(id, name, type),
      destination_facility:facilities!referrals_destination_facility_id_fkey(id, name, type),
      referred_by_user:profiles!referrals_referred_by_fkey(full_name),
      acknowledged_by_user:profiles!referrals_acknowledged_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (patientId) {
    dbQuery = dbQuery.eq('patient_id', patientId);
  }

  if (facilityId) {
    dbQuery = dbQuery.or(`source_facility_id.eq.${facilityId},destination_facility_id.eq.${facilityId}`);
  }

  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }

  if (urgency) {
    dbQuery = dbQuery.eq('urgency', urgency);
  }

  if (active === 'true') {
    dbQuery = dbQuery.not('status', 'in', '("completed","cancelled","rejected")');
  }

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/referrals - Create a new referral
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Create referral
  const { data: referral, error } = await supabase
    .from('referrals')
    .insert({
      patient_id: body.patient_id,
      source_facility_id: body.source_facility_id,
      destination_facility_id: body.destination_facility_id,
      referred_by: user.id,
      consultation_id: body.consultation_id,
      service: body.service,
      urgency: body.urgency ?? 'routine',
      reason: body.reason,
      clinical_summary: body.clinical_summary,
      expected_arrival: body.expected_arrival,
      status: 'created',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create initial status history
  await supabase.from('referral_status_history').insert({
    referral_id: referral.id,
    from_status: null,
    to_status: 'created',
    changed_by: user.id,
    notes: 'Referral created',
  });

  // Create notification for destination facility staff
  const { data: facilityStaff } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('facility_id', body.destination_facility_id)
    .in('role', ['facility_admin', 'doctor']);

  if (facilityStaff) {
    const notifications = facilityStaff.map((staff) => ({
      user_id: staff.user_id,
      type: 'referral_created',
      title: 'New Incoming Referral',
      message: `New ${body.urgency ?? 'routine'} referral for ${body.service ?? 'general'} care`,
      data: { referral_id: referral.id, patient_id: body.patient_id },
    }));
    await supabase.from('notifications').insert(notifications);
  }

  // Notify patient if they have a user account
  const { data: patient } = await supabase
    .from('patients')
    .select('user_id')
    .eq('id', body.patient_id)
    .single();

  if (patient?.user_id) {
    await supabase.from('notifications').insert({
      user_id: patient.user_id,
      type: 'referral_created',
      title: 'New Referral Created',
      message: 'A referral has been created for you. View details in your referrals.',
      data: { referral_id: referral.id },
    });
  }

  // Notify assigned ASHA worker
  const { data: patientData } = await supabase
    .from('patients')
    .select('assigned_worker_id')
    .eq('id', body.patient_id)
    .single();

  if (patientData?.assigned_worker_id && patientData.assigned_worker_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: patientData.assigned_worker_id,
      type: 'referral_created',
      title: 'Referral Created for Your Patient',
      message: `A referral has been created for your assigned patient`,
      data: { referral_id: referral.id, patient_id: body.patient_id },
    });
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'referral.created',
    entity_type: 'referral',
    entity_id: referral.id,
    details: {
      patient_id: body.patient_id,
      destination: body.destination_facility_id,
      urgency: body.urgency,
    },
  });

  return NextResponse.json({ data: referral }, { status: 201 });
}
