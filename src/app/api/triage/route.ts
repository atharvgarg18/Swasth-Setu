import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { evaluateTriage, SYMPTOM_CATALOG, type TriageInput } from '@/lib/triage/engine';

/**
 * POST /api/triage - Run triage evaluation
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Map symptom IDs to full symptom objects
  const selectedSymptoms = (body.symptom_ids as string[])
    .map((id: string) => SYMPTOM_CATALOG.find((s) => s.id === id))
    .filter(Boolean);

  // Build triage input
  const triageInput: TriageInput = {
    symptoms: selectedSymptoms as typeof SYMPTOM_CATALOG,
    riskFactors: {
      age: body.risk_factors?.age ?? 30,
      gender: body.risk_factors?.gender ?? 'other',
      isPregnant: body.risk_factors?.is_pregnant ?? false,
      weekOfPregnancy: body.risk_factors?.week_of_pregnancy,
      hasHypertension: body.risk_factors?.has_hypertension ?? false,
      hasDiabetes: body.risk_factors?.has_diabetes ?? false,
      hasHeartCondition: body.risk_factors?.has_heart_condition ?? false,
      hasAsthma: body.risk_factors?.has_asthma ?? false,
      isChild: (body.risk_factors?.age ?? 30) < 5,
      isElderly: (body.risk_factors?.age ?? 30) > 65,
      chronicConditions: body.risk_factors?.chronic_conditions ?? [],
      allergies: body.risk_factors?.allergies ?? [],
    },
    vitalSigns: body.vital_signs,
    durationDays: body.duration_days ?? 1,
    additionalNotes: body.additional_notes,
  };

  // Run triage engine
  const result = evaluateTriage(triageInput);

  // Store triage session
  const { data: session, error } = await supabase
    .from('triage_sessions')
    .insert({
      patient_id: body.patient_id,
      initiated_by: user.id,
      visit_id: body.visit_id,
      symptoms: { ids: body.symptom_ids, details: selectedSymptoms },
      risk_factors: body.risk_factors,
      severity: result.severity,
      routing_recommendation: result.routing,
      routing_reason: result.reason,
      rules_applied: result.rulesApplied.filter((r) => r.matched),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If emergency, create an emergency case
  if (result.severity === 'emergency') {
    // Find nearest appropriate facility
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name, type')
      .in('type', ['rural_hospital', 'district_hospital', 'chc'])
      .eq('is_active', true)
      .limit(1);

    const targetFacility = facilities?.[0];

    if (targetFacility) {
      await supabase.from('emergency_cases').insert({
        patient_id: body.patient_id,
        reported_by: user.id,
        triage_session_id: session.id,
        description: `Emergency triage: ${(selectedSymptoms as Array<{name: {en: string}}>).map((s) => s.name.en).join(', ')}`,
        severity: 'critical',
        status: 'reported',
        target_facility_id: targetFacility.id,
      });
    }
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'triage.completed',
    entity_type: 'triage_session',
    entity_id: session.id,
    details: { severity: result.severity, routing: result.routing },
  });

  return NextResponse.json({
    data: {
      session_id: session.id,
      ...result,
    },
  }, { status: 201 });
}

/**
 * GET /api/triage/symptoms - Get available symptom catalog
 */
export async function GET() {
  return NextResponse.json({
    data: SYMPTOM_CATALOG.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
    })),
  });
}
