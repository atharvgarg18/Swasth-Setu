import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/referrals/validate
 *
 * Pre-referral resource validation endpoint.
 * Cross-references a target facility's inventory against
 * the required diagnostics and medications for a referral.
 *
 * Query params:
 *   facility_id  — UUID of the target facility
 *   diagnostics  — comma-separated list of required diagnostic test names
 *   medications  — comma-separated list of required medication names
 *
 * Returns:
 *   - validation result per item (available/unavailable/low_stock)
 *   - overall pass/fail flag
 *   - warning messages
 *   - alternative facility suggestion if validation fails
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get('facility_id');
  const diagnosticsParam = searchParams.get('diagnostics') ?? '';
  const medicationsParam = searchParams.get('medications') ?? '';

  if (!facilityId) {
    return NextResponse.json({ error: 'facility_id is required' }, { status: 400 });
  }

  const requiredDiagnostics = diagnosticsParam.split(',').map(s => s.trim()).filter(Boolean);
  const requiredMedications = medicationsParam.split(',').map(s => s.trim()).filter(Boolean);

  if (requiredDiagnostics.length === 0 && requiredMedications.length === 0) {
    return NextResponse.json({ error: 'At least one diagnostic or medication is required' }, { status: 400 });
  }

  // ── 1. Fetch facility info ───────────────────────────────────
  const { data: facility, error: facError } = await adminClient
    .from('facilities')
    .select('id, name, type')
    .eq('id', facilityId)
    .single();

  if (facError || !facility) {
    return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
  }

  // ── 2. Check diagnostics at this facility ────────────────────
  const diagnosticResults: {
    name: string;
    available: boolean;
    turnaround_hours: number | null;
    status: 'available' | 'unavailable' | 'not_found';
  }[] = [];

  if (requiredDiagnostics.length > 0) {
    const { data: diagRows } = await adminClient
      .from('diagnostic_availability')
      .select('test_name, is_available, turnaround_hours')
      .eq('facility_id', facilityId)
      .in('test_name', requiredDiagnostics);

    const diagMap = new Map((diagRows ?? []).map(d => [d.test_name, d]));

    for (const name of requiredDiagnostics) {
      const row = diagMap.get(name);
      if (!row) {
        diagnosticResults.push({ name, available: false, turnaround_hours: null, status: 'not_found' });
      } else {
        diagnosticResults.push({
          name,
          available: row.is_available,
          turnaround_hours: row.turnaround_hours,
          status: row.is_available ? 'available' : 'unavailable',
        });
      }
    }
  }

  // ── 3. Check medications at this facility ────────────────────
  const medicationResults: {
    name: string;
    quantity: number | null;
    status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_found';
  }[] = [];

  if (requiredMedications.length > 0) {
    const { data: medRows } = await adminClient
      .from('medicine_stock')
      .select('medicine_name, quantity, status')
      .eq('facility_id', facilityId)
      .in('medicine_name', requiredMedications);

    const medMap = new Map((medRows ?? []).map(m => [m.medicine_name, m]));

    for (const name of requiredMedications) {
      const row = medMap.get(name);
      if (!row) {
        medicationResults.push({ name, quantity: null, status: 'not_found' });
      } else {
        medicationResults.push({
          name,
          quantity: row.quantity,
          status: row.status as 'in_stock' | 'low_stock' | 'out_of_stock',
        });
      }
    }
  }

  // ── 4. Build warnings ────────────────────────────────────────
  const warnings: string[] = [];
  let pass = true;

  for (const d of diagnosticResults) {
    if (d.status === 'unavailable') {
      warnings.push(`${d.name} is NOT available at this facility`);
      pass = false;
    } else if (d.status === 'not_found') {
      warnings.push(`${d.name} — no record found at this facility (likely unavailable)`);
      pass = false;
    }
  }

  for (const m of medicationResults) {
    if (m.status === 'out_of_stock') {
      warnings.push(`${m.name} is out of stock (0 units)`);
      pass = false;
    } else if (m.status === 'low_stock') {
      warnings.push(`${m.name} is low on stock (${m.quantity} units remaining)`);
      // Low stock is a warning but doesn't fail validation
    } else if (m.status === 'not_found') {
      warnings.push(`${m.name} — not stocked at this facility`);
      pass = false;
    }
  }

  // ── 5. Find alternative facility if validation fails ─────────
  let suggestion: { id: string; name: string; type: string } | null = null;

  if (!pass) {
    // Find facilities that have ALL the missing resources
    const failedDiags = diagnosticResults
      .filter(d => d.status !== 'available')
      .map(d => d.name);
    const failedMeds = medicationResults
      .filter(m => m.status === 'out_of_stock' || m.status === 'not_found')
      .map(m => m.name);

    // Get all other facilities
    const { data: allFacilities } = await adminClient
      .from('facilities')
      .select('id, name, type')
      .eq('is_active', true)
      .neq('id', facilityId)
      .order('type', { ascending: false }); // district_hospital first (desc alphabetically)

    if (allFacilities) {
      for (const altFac of allFacilities) {
        let altHasAll = true;

        // Check diagnostics
        if (failedDiags.length > 0) {
          const { data: altDiags } = await adminClient
            .from('diagnostic_availability')
            .select('test_name, is_available')
            .eq('facility_id', altFac.id)
            .in('test_name', failedDiags)
            .eq('is_available', true);

          if (!altDiags || altDiags.length < failedDiags.length) {
            altHasAll = false;
          }
        }

        // Check medications
        if (altHasAll && failedMeds.length > 0) {
          const { data: altMeds } = await adminClient
            .from('medicine_stock')
            .select('medicine_name, status')
            .eq('facility_id', altFac.id)
            .in('medicine_name', failedMeds)
            .in('status', ['in_stock', 'low_stock']);

          if (!altMeds || altMeds.length < failedMeds.length) {
            altHasAll = false;
          }
        }

        if (altHasAll) {
          suggestion = { id: altFac.id, name: altFac.name, type: altFac.type };
          break; // Take the first match (highest tier first)
        }
      }
    }
  }

  return NextResponse.json({
    facility: { id: facility.id, name: facility.name, type: facility.type },
    validation: {
      pass,
      diagnostics: diagnosticResults,
      medications: medicationResults,
      warnings,
      suggestion: suggestion
        ? `Consider referring to ${suggestion.name} instead — it has all required resources`
        : null,
      suggested_facility: suggestion,
    },
  });
}
