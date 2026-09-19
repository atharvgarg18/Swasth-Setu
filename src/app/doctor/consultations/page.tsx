'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Video, RefreshCw, X, CheckCircle2 } from 'lucide-react';

// Priority pill config — matches the inspiration screenshots
const PRIORITY: Record<string, { label: string; bg: string; text: string }> = {
  emergency: { label: 'Emergency', bg: '#f5e4e1', text: '#7a1e12' },
  urgent:    { label: 'Urgent',    bg: '#fef3e2', text: '#7a4a00' },
  moderate:  { label: 'Moderate',  bg: '#fef3e2', text: '#7a4a00' },
  routine:   { label: 'Mild',      bg: '#ebebeb', text: '#4a4a4a' },
};

function PriorityPill({ priority }: { priority: string }) {
  const cfg = PRIORITY[priority] ?? PRIORITY.routine;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function WaitTime({ createdAt }: { createdAt: string }) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const label = mins < 1 ? 'just now' : mins < 60 ? `waiting ${mins} min` : `waiting ${Math.floor(mins / 60)}h`;
  return <span>{label}</span>;
}

export default function ConsultationsQueue() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [pendingCalls, setPendingCalls] = useState<any[]>([]);
  const [myConsultations, setMyConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: pending } = await supabase.from('consultations')
      .select('*, patient:patients(full_name, date_of_birth, gender)')
      .eq('consultation_type', 'teleconsult_video')
      .eq('status', 'requested')
      .is('doctor_id', null)
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: true }); // oldest first = longest wait

    const { data: mine } = await supabase.from('consultations')
      .select('*, patient:patients(full_name)')
      .eq('doctor_id', user.id)
      .in('status', ['in_progress', 'queued'])
      .order('created_at', { ascending: false });

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: done } = await supabase.from('consultations')
      .select('*, patient:patients(full_name)')
      .eq('doctor_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', dayAgo)
      .order('completed_at', { ascending: false })
      .limit(5);

    setPendingCalls(pending ?? []);
    setMyConsultations([...(mine ?? []), ...(done ?? [])]);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('queue-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  const joinCall = async (id: string) => {
    if (!user) return;
    setJoining(id);
    await fetch('/api/consultations/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', doctor_id: user.id }),
    });
    router.push('/doctor/consultations/' + id);
  };

  const dismissCall = async (id: string) => {
    setDismissing(id);
    await supabase.from('consultations').update({ status: 'cancelled' })
      .eq('id', id).eq('status', 'requested').is('doctor_id', null);
    setPendingCalls(prev => prev.filter(c => c.id !== id));
    setDismissing(null);
  };

  if (loading) return (
    <div className="p-10 flex justify-center">
      <Loader2 className="animate-spin h-5 w-5" style={{ color: 'oklch(0.37 0.09 158)' }} />
    </div>
  );

  const hasAnything = pendingCalls.length > 0 || myConsultations.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>
            Teleconsultation queue
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'oklch(0.52 0.012 60)' }}>
            Sorted by urgency, not by arrival time.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors hover:bg-black/[0.04]"
          style={{ borderColor: 'oklch(0.84 0.012 80)', color: 'oklch(0.47 0.012 60)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Incoming requests ─────────────────────────────── */}
      {pendingCalls.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse flex-shrink-0"
              style={{ backgroundColor: 'oklch(0.44 0.18 24)' }}
            />
            <span className="text-sm font-semibold" style={{ color: 'oklch(0.20 0.012 60)' }}>
              Incoming requests
            </span>
            {pendingCalls.length > 1 && (
              <button
                onClick={() => pendingCalls.forEach(c => dismissCall(c.id))}
                className="text-xs ml-auto transition-colors hover:opacity-70"
                style={{ color: 'oklch(0.52 0.012 60)' }}
              >
                Dismiss all
              </button>
            )}
          </div>

          {/* Queue rows */}
          <div className="rounded-lg overflow-hidden border bg-white"
               style={{ borderColor: 'oklch(0.86 0.012 80)' }}>
            {pendingCalls.map((c, idx) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-4 py-3.5"
                style={{
                  borderTop: idx > 0 ? '1px solid oklch(0.90 0.01 80)' : undefined,
                }}
              >
                {/* Priority pill */}
                <PriorityPill priority={c.priority ?? 'routine'} />

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm" style={{ color: 'oklch(0.15 0.012 60)' }}>
                    {(c.patient as any)?.full_name ?? 'Patient'}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'oklch(0.55 0.01 60)' }}>
                    · <WaitTime createdAt={c.created_at} />
                  </span>
                  {c.chief_complaint && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(0.52 0.012 60)' }}>
                      {c.chief_complaint}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => dismissCall(c.id)}
                    disabled={dismissing === c.id}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/[0.05] transition-colors"
                    title="Dismiss"
                    style={{ color: 'oklch(0.55 0.01 60)' }}
                  >
                    {dismissing === c.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <X className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => joinCall(c.id)}
                    disabled={joining === c.id}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{
                      backgroundColor: (c.priority === 'emergency')
                        ? 'oklch(0.44 0.18 24)'
                        : 'oklch(0.37 0.09 158)',
                    }}
                  >
                    {joining === c.id
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Joining...</>
                      : <><Video className="w-3.5 h-3.5" />{c.priority === 'emergency' ? 'Accept emergency' : 'Start consult'}</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── My consultations ──────────────────────────────── */}
      {myConsultations.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
             style={{ color: 'oklch(0.55 0.01 60)' }}>
            My consultations
          </p>
          <div className="rounded-lg overflow-hidden border bg-white"
               style={{ borderColor: 'oklch(0.86 0.012 80)' }}>
            {myConsultations.map((c, idx) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-4 py-3.5"
                style={{
                  borderTop: idx > 0 ? '1px solid oklch(0.90 0.01 80)' : undefined,
                  opacity: c.status === 'completed' ? 0.6 : 1,
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm" style={{ color: 'oklch(0.15 0.012 60)' }}>
                    {(c.patient as any)?.full_name ?? 'Patient'}
                  </span>
                  <span className="text-xs ml-2 capitalize" style={{ color: 'oklch(0.55 0.01 60)' }}>
                    · {c.status.replace('_', ' ')}
                    · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {c.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'oklch(0.50 0.10 155)' }} />
                ) : (
                  <Link href={'/doctor/consultations/' + c.id}>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: 'oklch(0.37 0.09 158)' }}
                    >
                      <Video className="w-3.5 h-3.5" />
                      Rejoin
                    </button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────── */}
      {!hasAnything && (
        <div
          className="rounded-lg border py-16 text-center"
          style={{ borderColor: 'oklch(0.86 0.012 80)', backgroundColor: 'white' }}
        >
          <p className="font-medium text-sm" style={{ color: 'oklch(0.35 0.012 60)' }}>
            No active consultations
          </p>
          <p className="text-xs mt-1" style={{ color: 'oklch(0.60 0.01 60)' }}>
            Waiting for teleconsult requests...
          </p>
        </div>
      )}
    </div>
  );
}
