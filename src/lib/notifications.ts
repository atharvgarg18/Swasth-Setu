import { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType =
  | 'referral_created'
  | 'referral_acknowledged'
  | 'referral_status_update'
  | 'referral_completed'
  | 'referral_incoming'         // doctor-to-doctor
  | 'consultation_scheduled'    // doctor B requested new video call
  | 'consultation_completed'
  | 'follow_up_reminder'
  | 'general';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Insert a notification row for a user.
 * Must use the service-role Supabase client to bypass RLS.
 */
export async function createNotification(
  supabase: SupabaseClient,
  payload: NotificationPayload,
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    data: payload.data ?? {},
    is_read: false,
  });
  if (error) console.error('[createNotification] Error:', error.message);
}

/**
 * Insert notifications for multiple users at once.
 */
export async function createNotifications(
  supabase: SupabaseClient,
  payloads: NotificationPayload[],
) {
  if (!payloads.length) return;
  const rows = payloads.map(p => ({
    user_id: p.userId,
    type: p.type,
    title: p.title,
    message: p.message,
    data: p.data ?? {},
    is_read: false,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) console.error('[createNotifications] Error:', error.message);
}

/**
 * Helper: get a patient's assigned_worker_id + their user_id (for direct notification)
 */
export async function getPatientWorker(
  supabase: SupabaseClient,
  patientId: string,
): Promise<{ workerUserId: string | null; patientUserId: string | null }> {
  const { data } = await supabase
    .from('patients')
    .select('user_id, assigned_worker_id')
    .eq('id', patientId)
    .single();
  return {
    workerUserId: data?.assigned_worker_id ?? null,
    patientUserId: data?.user_id ?? null,
  };
}
