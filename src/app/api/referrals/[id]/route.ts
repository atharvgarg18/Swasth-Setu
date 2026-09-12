import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  created: ['pending', 'acknowledged', 'cancelled'],
  pending: ['acknowledged', 'cancelled', 'rejected'],
  acknowledged: ['in_transit', 'arrived', 'cancelled'],
  in_transit: ['arrived', 'no_show'],
  arrived: ['in_treatment'],
  in_treatment: ['completed'],
  completed: [], // terminal
  cancelled: [], // terminal
  rejected: [], // terminal
  no_show: ['acknowledged', 'cancelled'], // can be re-acknowledged
};

/**
 * GET /api/referrals/[id] - Get referral with full details and history
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: referral, error } = await supabase
    .from('referrals')
    .select(`
      *,
      patient:patients!referrals_patient_id_fkey(id, full_name, phone, gender, date_of_birth, address, is_high_risk, high_risk_reasons, allergies, chronic_conditions),
      source_facility:facilities!referrals_source_facility_id_fkey(id, name, type, address, phone),
      destination_facility:facilities!referrals_destination_facility_id_fkey(id, name, type, address, phone),
      referred_by_user:profiles!referrals_referred_by_fkey(full_name),
      acknowledged_by_user:profiles!referrals_acknowledged_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error || !referral) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
  }

  // Fetch status history
  const { data: history } = await supabase
    .from('referral_status_history')
    .select(`
      *,
      changed_by_user:profiles!referral_status_history_changed_by_fkey(full_name)
    `)
    .eq('referral_id', id)
    .order('changed_at', { ascending: true });

  return NextResponse.json({ data: { ...referral, status_history: history ?? [] } });
}

/**
 * PATCH /api/referrals/[id] - Update referral status
 * Body: { status: string, notes?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const newStatus = body.status;

  // Get current referral
  const { data: current, error: fetchError } = await supabase
    .from('referrals')
    .select('status, patient_id')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
  }

  // Validate status transition
  const allowedTransitions = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowedTransitions.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status transition: ${current.status} → ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
      },
      { status: 400 }
    );
  }

  // Build update object
  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'acknowledged') {
    updateData.acknowledged_by = user.id;
    updateData.acknowledged_at = new Date().toISOString();
  } else if (newStatus === 'arrived') {
    updateData.arrived_at = new Date().toISOString();
  } else if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString();
    updateData.completion_notes = body.notes;
  }

  // Update referral
  const { data: referral, error } = await supabase
    .from('referrals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record status history
  await supabase.from('referral_status_history').insert({
    referral_id: id,
    from_status: current.status,
    to_status: newStatus,
    changed_by: user.id,
    notes: body.notes,
  });

  // Create timeline entry for referral update
  await supabase.from('patient_timeline').insert({
    patient_id: current.patient_id,
    event_type: 'referral_update',
    event_id: id,
    title: `Referral ${newStatus.replace(/_/g, ' ')}`,
    description: `Referral status changed to ${newStatus.replace(/_/g, ' ')}`,
    created_by: user.id,
    event_at: new Date().toISOString(),
  });

  // Notifications based on new status
  const { data: patient } = await supabase
    .from('patients')
    .select('user_id, assigned_worker_id, full_name')
    .eq('id', current.patient_id)
    .single();

  const notifyTargets: string[] = [];
  if (patient?.user_id) notifyTargets.push(patient.user_id);
  if (patient?.assigned_worker_id) notifyTargets.push(patient.assigned_worker_id);

  const statusMessages: Record<string, string> = {
    acknowledged: 'Your referral has been acknowledged by the receiving facility',
    in_transit: 'Patient is in transit to the facility',
    arrived: 'Patient has arrived at the facility',
    in_treatment: 'Treatment has started',
    completed: 'Referral completed — treatment finished',
    rejected: 'Referral was not accepted by the facility',
    no_show: 'Patient did not arrive at the expected time',
  };

  const message = statusMessages[newStatus];
  if (message && notifyTargets.length > 0) {
    const notifications = notifyTargets.map((uid) => ({
      user_id: uid,
      type: 'referral_status_changed',
      title: `Referral Update: ${newStatus.replace(/_/g, ' ')}`,
      message,
      data: { referral_id: id, new_status: newStatus },
    }));
    await supabase.from('notifications').insert(notifications);
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'referral.status_changed',
    entity_type: 'referral',
    entity_id: id,
    details: {
      from_status: current.status,
      to_status: newStatus,
      notes: body.notes,
    },
  });

  return NextResponse.json({ data: referral });
}
