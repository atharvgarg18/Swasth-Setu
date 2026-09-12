import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
                       chronic_conditions, allergies, blood_group)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !consultation) {
    return NextResponse.json({ error: error?.message || 'Consultation not found' }, { status: 404 });
  }

  // Fetch triage session for this patient
  const { data: triage } = await adminClient
    .from('triage_sessions')
    .select('*')
    .eq('patient_id', consultation.patient_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch prescriptions
  const { data: prescription } = await adminClient
    .from('prescriptions')
    .select('*')
    .eq('consultation_id', id)
    .maybeSingle();

  // Fetch referrals
  const { data: referrals } = await adminClient
    .from('referrals')
    .select('*')
    .eq('consultation_id', id);

  return NextResponse.json({
    consultation,
    triage,
    prescription,
    referrals: referrals || [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { action, doctor_id, clinical_notes, assessment, medications, referral } = body;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (action === 'claim') {
    if (!doctor_id) return NextResponse.json({ error: 'Missing doctor_id' }, { status: 400 });
    const { error } = await adminClient
      .from('consultations')
      .update({ doctor_id, status: 'in_progress' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'referral') {
    const { service, urgency, reason, clinical_summary, patient_id } = body;
    const { error } = await adminClient.from('referrals').insert({
      consultation_id: id,
      patient_id,
      referred_by: doctor_id,
      service,
      urgency: urgency || 'routine',
      reason,
      clinical_summary: clinical_summary || '',
      status: 'created',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'complete') {
    const { data: cons, error: updateErr } = await adminClient
      .from('consultations')
      .update({
        clinical_notes: clinical_notes || '',
        assessment: assessment || '',
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('patient_id, doctor_id')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Insert prescription with service role if meds provided
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
        service: referral.service,
        urgency: referral.urgency || 'routine',
        reason: referral.reason,
        clinical_summary: assessment || clinical_notes || '',
        status: 'created',
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
