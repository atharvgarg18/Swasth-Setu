import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/follow-ups/[id] - Update follow-up (complete, reschedule, etc.)
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
  const updateData: Record<string, unknown> = {};

  if (body.status) updateData.status = body.status;
  if (body.due_date) updateData.due_date = body.due_date;
  if (body.completion_notes) updateData.completion_notes = body.completion_notes;

  if (body.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data: followUp, error } = await supabase
    .from('follow_ups')
    .update(updateData)
    .eq('id', id)
    .select('*, patient:patients!follow_ups_patient_id_fkey(user_id)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Timeline entry
  await supabase.from('patient_timeline').insert({
    patient_id: followUp.patient_id,
    event_type: 'follow_up_update',
    event_id: id,
    title: `Follow-up ${body.status ?? 'updated'}`,
    description: body.completion_notes ?? `Follow-up status changed to ${body.status}`,
    created_by: user.id,
    event_at: new Date().toISOString(),
  });

  // Audit
  await supabase.from('audit_events').insert({
    actor_id: user.id,
    action: `follow_up.${body.status ?? 'updated'}`,
    entity_type: 'follow_up',
    entity_id: id,
    details: body,
  });

  return NextResponse.json({ data: followUp });
}
