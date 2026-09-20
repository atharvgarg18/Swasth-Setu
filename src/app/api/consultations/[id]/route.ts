import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotification, createNotifications, getPatientWorker } from '@/lib/notifications';

// Service-role client — bypasses RLS completely.
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: consultation, error } = await adminClient
    .from('consultations')
    .select(`
      *,
      patient:patients(id, full_name, date_of_birth, gender, phone, address,
                       chronic_conditions, allergies, blood_group, assigned_worker_id)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !consultation) {
    return NextResponse.json({ error: error?.message || 'Consultation not found' }, { status: 404 });
  }

  // Triage session for this patient
  const { data: triage } = await adminClient
    .from('triage_sessions')
    .select('*')
    .eq('patient_id', consultation.patient_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Prescriptions
  const { data: prescription } = await adminClient
    .from('prescriptions')
    .select('*')
    .eq('consultation_id', id)
    .maybeSingle();

  // Referrals (include referring doctor profile)
  const { data: referrals } = await adminClient
    .from('referrals')
    .select('*, referrer:profiles!referrals_referred_by_fkey(full_name)')
    .eq('consultation_id', id);

  return NextResponse.json({ consultation, triage, prescription, referrals: referrals || [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { action, doctor_id } = body;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // ── CLAIM ──────────────────────────────────────────────────────────────
  if (action === 'claim') {
    if (!doctor_id) return NextResponse.json({ error: 'Missing doctor_id' }, { status: 400 });
    const { error } = await adminClient
      .from('consultations')
      .update({ doctor_id, status: 'in_progress' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── REFERRAL ───────────────────────────────────────────────────────────
  if (action === 'referral') {
    const {
      service, urgency, reason, clinical_summary, patient_id,
      referred_to_doctor_id, patient_instructions, asha_instructions,
    } = body;

    const { data: ref, error } = await adminClient.from('referrals').insert({
      consultation_id: id,
      patient_id,
      referred_by: doctor_id,
      referred_to_doctor_id: referred_to_doctor_id || null,
      service,
      urgency: urgency || 'routine',
      reason,
      clinical_summary: clinical_summary || '',
      patient_instructions: patient_instructions || null,
      asha_instructions: asha_instructions || null,
      status: 'created',
    }).select('id').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get referring doctor name
    const { data: docProfile } = await adminClient
      .from('profiles').select('full_name').eq('id', doctor_id).single();
    const docName = docProfile?.full_name ?? 'Your doctor';

    // Notify patient + ASHA
    const { patientUserId, workerUserId } = await getPatientWorker(adminClient, patient_id);
    const notifications = [];

    if (patientUserId) {
      const what = referred_to_doctor_id
        ? `${docName} has referred you to a specialist doctor.`
        : `${docName} has referred you to ${service}.`;
      notifications.push({
        userId: patientUserId,
        type: 'referral_created' as const,
        title: '📋 New Referral Created',
        message: what + (patient_instructions ? ` What to do: ${patient_instructions}` : ''),
        data: { referral_id: ref?.id, consultation_id: id },
      });
    }

    if (workerUserId) {
      notifications.push({
        userId: workerUserId,
        type: 'referral_created' as const,
        title: '📋 New Referral for Your Patient',
        message: `${docName} has created a referral. ${asha_instructions ? 'Instructions: ' + asha_instructions : ''}`,
        data: { referral_id: ref?.id, consultation_id: id, patient_id },
      });
    }

    // Notify receiving doctor (doctor-to-doctor)
    if (referred_to_doctor_id) {
      notifications.push({
        userId: referred_to_doctor_id,
        type: 'referral_incoming' as const,
        title: `🔀 Incoming Referral from ${docName}`,
        message: `Urgency: ${urgency || 'routine'}. Reason: ${reason}`,
        data: { referral_id: ref?.id, consultation_id: id, patient_id },
      });
    }

    await createNotifications(adminClient, notifications);
    return NextResponse.json({ ok: true, referral_id: ref?.id });
  }

  // ── REFERRAL STATUS UPDATE ─────────────────────────────────────────────
  if (action === 'referral_status') {
    const { referral_id, status: newStatus } = body;
    const { data: ref, error } = await adminClient
      .from('referrals')
      .update({ status: newStatus })
      .eq('id', referral_id)
      .select('patient_id, patient_instructions, asha_instructions')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const statusLabels: Record<string, string> = {
      acknowledged: 'Your referral has been acknowledged by the doctor.',
      in_transit: 'You are en route to the facility.',
      arrived: 'You have arrived at the facility.',
      in_treatment: 'Treatment has started.',
      completed: 'Your referral treatment is complete.',
      cancelled: 'Your referral has been cancelled.',
    };

    const { patientUserId, workerUserId } = await getPatientWorker(adminClient, ref.patient_id);
    const notifs = [];

    if (patientUserId) {
      const msg = statusLabels[newStatus] ?? `Referral status updated to: ${newStatus}`;
      const instruction = ref.patient_instructions ? ` Next: ${ref.patient_instructions}` : '';
      notifs.push({
        userId: patientUserId,
        type: 'referral_status_update' as const,
        title: `📋 Referral Update`,
        message: msg + instruction,
        data: { referral_id, new_status: newStatus },
      });
    }

    if (workerUserId && newStatus === 'completed') {
      notifs.push({
        userId: workerUserId,
        type: 'referral_completed' as const,
        title: `✅ Referral Completed`,
        message: `The referral treatment is complete.${ref.asha_instructions ? ' Follow-up: ' + ref.asha_instructions : ''}`,
        data: { referral_id, patient_id: ref.patient_id },
      });
    }

    await createNotifications(adminClient, notifs);
    return NextResponse.json({ ok: true });
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────
  if (action === 'complete') {
    const { clinical_notes, assessment, medications, referral, patient_instructions, asha_instructions } = body;

    const { data: cons, error: updateErr } = await adminClient
      .from('consultations')
      .update({
        clinical_notes: clinical_notes || '',
        assessment: assessment || '',
        status: 'completed',
        completed_at: new Date().toISOString(),
        patient_instructions: patient_instructions || null,
        asha_instructions: asha_instructions || null,
      })
      .eq('id', id)
      .select('patient_id, doctor_id')
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Insert prescription
    if (Array.isArray(medications)) {
      const validMeds = medications.filter((m: any) => m.name && m.name.trim());
      if (validMeds.length > 0) {
        await adminClient.from('prescriptions').insert({
          consultation_id: id,
          patient_id: cons.patient_id,
          prescribed_by: cons.doctor_id || doctor_id,
          medications: validMeds,
          notes: assessment || '',
        });
      }
    }

    // Insert referral if attached
    if (referral && referral.service && referral.reason) {
      await adminClient.from('referrals').insert({
        consultation_id: id,
        patient_id: cons.patient_id,
        referred_by: cons.doctor_id || doctor_id,
        referred_to_doctor_id: referral.referred_to_doctor_id || null,
        service: referral.service,
        urgency: referral.urgency || 'routine',
        reason: referral.reason,
        clinical_summary: assessment || clinical_notes || '',
        patient_instructions: patient_instructions || null,
        asha_instructions: asha_instructions || null,
        status: 'created',
      });
    }

    // Notify patient
    const { patientUserId, workerUserId } = await getPatientWorker(adminClient, cons.patient_id);
    const notifs = [];

    if (patientUserId) {
      const inst = patient_instructions ? ` What to do next: ${patient_instructions}` : ' Your prescription is ready.';
      notifs.push({
        userId: patientUserId,
        type: 'consultation_completed' as const,
        title: '✅ Consultation Completed',
        message: 'Your doctor has completed the consultation.' + inst,
        data: { consultation_id: id },
      });
    }

    if (workerUserId) {
      notifs.push({
        userId: workerUserId,
        type: 'consultation_completed' as const,
        title: '✅ Consultation Done — Follow-up Required',
        message: asha_instructions
          ? `Follow-up for your patient: ${asha_instructions}`
          : 'A consultation for your patient has been completed. Please check in with them.',
        data: { consultation_id: id, patient_id: cons.patient_id },
      });
    }

    await createNotifications(adminClient, notifs);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
