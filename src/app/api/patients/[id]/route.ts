import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/patients/[id] - Get a single patient with full details
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

  const { data: patient, error } = await supabase
    .from('patients')
    .select(`
      *,
      assigned_worker:profiles!patients_assigned_worker_id_fkey(id, full_name, phone),
      facility:facilities!patients_registered_facility_id_fkey(id, name, type)
    `)
    .eq('id', id)
    .single();

  if (error || !patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  return NextResponse.json({ data: patient });
}

/**
 * PATCH /api/patients/[id] - Update patient information
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

  const { data: patient, error } = await supabase
    .from('patients')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: 'patient.updated',
    entity_type: 'patient',
    entity_id: id,
    details: body,
  });

  return NextResponse.json({ data: patient });
}
