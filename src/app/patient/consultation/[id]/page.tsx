'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { MobileVideoRoom } from '@/components/video/MobileVideoRoom';
import { RefreshCw, Clock, FileText, ArrowRight } from 'lucide-react';

type PageState = 'waiting' | 'in_progress' | 'call_ended' | 'completed';

export default function PatientConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();

  const supabase = useRef(createClient()).current;
  const roomId = params.id as string;

  const [pageState, setPageState] = useState<PageState>('waiting');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [callEndedSeconds, setCallEndedSeconds] = useState(0);
  const redirectedRef = useRef(false);
  const callEndedRef = useRef(false);

  const goToSummary = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.push('/patient/consultation/' + roomId + '/summary');
  }, [router, roomId]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/consultations/' + roomId);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.consultation;
      if (!data) return;

      if (data.status === 'completed') {
        goToSummary();
      } else if (data.status === 'in_progress' || data.doctor_id) {
        // CRITICAL FIX: never override call_ended state with in_progress.
        // Once call has ended, we only care about 'completed' → redirect.
        setPageState(prev => {
          if (prev === 'call_ended' || prev === 'completed') return prev;
          return 'in_progress';
        });
      }
    } catch (_) {}
  }, [roomId, goToSummary]);

  // ── Real-time subscription — fires INSTANTLY on status change ──────────
  useEffect(() => {
    const ch = supabase
      .channel('consultation-status:' + roomId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'consultations', filter: 'id=eq.' + roomId },
        (payload: any) => {
          if (payload.new?.status === 'completed') {
            goToSummary();
          } else if (payload.new?.status === 'in_progress') {
            setPageState(prev => {
              if (prev === 'call_ended' || prev === 'completed') return prev;
              return 'in_progress';
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, roomId, goToSummary]);

  // ── Polling — normal 4s when waiting, fast 2s when call ended ──────────
  useEffect(() => {
    checkStatus();
    const interval = setInterval(
      checkStatus,
      callEndedRef.current ? 2000 : 4000
    );
    return () => clearInterval(interval);
  }, [checkStatus, pageState]); // restart interval when pageState changes

  // ── Wait timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Call-ended countdown (for fallback "View Report" button) ───────────
  useEffect(() => {
    if (pageState !== 'call_ended') return;
    callEndedRef.current = true;
    const t = setInterval(() => setCallEndedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [pageState]);

  const formatWait = (s: number) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  const handleCallEnded = useCallback(() => {
    callEndedRef.current = true;
    setPageState('call_ended');
    // Immediately check if already completed
    checkStatus();
  }, [checkStatus]);

  // ── Call ended — "Doctor preparing report" screen ─────────────────────
  if (pageState === 'call_ended') {
    const showFallbackButton = callEndedSeconds >= 20;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6"
        style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'oklch(0.90 0.014 80)' }}
        >
          <FileText className="w-10 h-10" style={{ color: 'oklch(0.37 0.09 158)' }} />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>
            Call Ended
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.47 0.012 60)' }}>
            Your doctor is preparing your report.<br />
            You'll be redirected automatically.
          </p>
        </div>

        {/* Spinner */}
        <div className="flex items-center gap-2" style={{ color: 'oklch(0.37 0.09 158)' }}>
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Waiting for report...</span>
        </div>

        {/* Fallback: manual button after 20 seconds */}
        {showFallbackButton ? (
          <button
            onClick={goToSummary}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'oklch(0.37 0.09 158)' }}
          >
            View Report Now
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <p className="text-xs" style={{ color: 'oklch(0.60 0.01 60)' }}>
            Do not close this page · {20 - callEndedSeconds}s
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] bg-black overflow-hidden">
      {/* Header bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-slate-900 flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="text-white font-semibold text-sm">Video Consultation</div>
          <div className="text-slate-400 text-xs">{profile?.full_name ?? ''}</div>
        </div>
        <div className="flex items-center gap-3">
          {pageState === 'waiting' && (
            <div className="text-amber-300 text-xs">
              Waiting · {formatWait(waitSeconds)}
            </div>
          )}
          {pageState === 'in_progress' && (
            <div className="flex items-center gap-1 text-green-300 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Doctor connected
            </div>
          )}
          <button
            onClick={() => { setMountKey(k => k + 1); setWaitSeconds(0); }}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1 rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />Reconnect
          </button>
        </div>
      </div>

      {/* Video room */}
      <div className="flex-1 overflow-hidden">
        <MobileVideoRoom
          key={mountKey}
          roomId={roomId}
          onCallEnded={handleCallEnded}
        />
      </div>
    </div>
  );
}
