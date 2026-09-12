'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { MobileVideoRoom } from '@/components/video/MobileVideoRoom';
import { RefreshCw, Clock, FileText } from 'lucide-react';

type PageState = 'waiting' | 'in_progress' | 'call_ended' | 'completed';

export default function PatientConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();

  // Stable refs — never recreated
  const supabase = useRef(createClient()).current;
  const roomId = params.id as string;

  const [pageState, setPageState] = useState<PageState>('waiting');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const redirectedRef = useRef(false);

  const goToSummary = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.push('/patient/consultation/' + roomId + '/summary');
  }, [router, roomId]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/consultations/' + roomId);
      if (res.ok) {
        const json = await res.json();
        const data = json.consultation;
        if (!data) return;
        console.log('[StatusCheck] status:', data.status, 'doctor_id:', !!data.doctor_id);
        if (data.status === 'completed') {
          goToSummary();
        } else if (data.status === 'in_progress' || data.doctor_id) {
          setPageState('in_progress');
        }
      }
    } catch (err) {
      console.error('[StatusCheck] Error:', err);
    }
  }, [roomId, goToSummary]);

  // ── Real-time subscription — fires INSTANTLY on status change ─────────
  useEffect(() => {
    console.log('[Realtime] Subscribing to consultation:', roomId);
    const ch = supabase
      .channel('consultation-status:' + roomId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consultations',
          filter: 'id=eq.' + roomId,
        },
        (payload: any) => {
          console.log('[Realtime] UPDATE received:', payload.new?.status);
          if (payload.new?.status === 'completed') {
            goToSummary();
          } else if (payload.new?.status === 'in_progress') {
            setPageState('in_progress');
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[Realtime] Channel status:', status);
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, roomId, goToSummary]);

  // ── Polling fallback every 4 seconds ─────────────────────────────────
  useEffect(() => {
    checkStatus(); // immediate check on mount
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // ── Wait timer ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatWait = (s: number) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  // ── "Doctor is writing your report" screen ────────────────────────────
  // Show this when video call is disconnected but consultation not yet completed
  const handleCallEnded = useCallback(() => {
    setPageState('call_ended');
  }, []);

  if (pageState === 'call_ended') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <FileText className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Call Ended</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your doctor is preparing your report.<br />
            Please wait — you will be automatically redirected.
          </p>
        </div>
        <div className="flex items-center gap-2 text-emerald-600">
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Waiting for report...</span>
        </div>
        <p className="text-xs text-slate-400">Do not close this page</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-black overflow-hidden">
      {/* Header bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-emerald-900 flex items-center justify-between">
        <div>
          <div className="text-emerald-100 font-semibold text-sm">Video Consultation</div>
          <div className="text-emerald-300 text-xs">{profile?.full_name ?? ''}</div>
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
            className="flex items-center gap-1 text-emerald-300 hover:text-white text-xs px-2 py-1 rounded"
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
