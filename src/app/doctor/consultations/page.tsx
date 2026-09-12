'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Phone, RefreshCw, Clock, X } from 'lucide-react';

export default function ConsultationsQueue() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [pendingCalls, setPendingCalls] = useState<any[]>([]);
  const [myConsultations, setMyConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    // Only show truly pending calls — no doctor, status=requested, not older than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: pending } = await supabase.from('consultations')
      .select('*, patient:patients(full_name, date_of_birth, gender)')
      .eq('consultation_type', 'teleconsult_video')
      .eq('status', 'requested')
      .is('doctor_id', null)
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });

    // My active consultations (in progress)
    const { data: mine } = await supabase.from('consultations')
      .select('*, patient:patients(full_name)')
      .eq('doctor_id', user.id)
      .in('status', ['in_progress', 'queued'])
      .order('created_at', { ascending: false });

    // My recently completed (last 24h) — show as history
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

  // Real-time subscription — fixed filter
  useEffect(() => {
    const ch = supabase.channel('teleconsult-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'consultations',
      }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  const joinCall = async (consultationId: string) => {
    if (!user) return;
    setJoining(consultationId);
    // Use server API to bypass RLS (doctor_id=null blocks direct update)
    await fetch('/api/consultations/' + consultationId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', doctor_id: user.id }),
    });
    router.push('/doctor/consultations/' + consultationId);
  };

  const dismissCall = async (consultationId: string) => {
    setDismissing(consultationId);
    await supabase.from('consultations').update({
      status: 'cancelled',
    }).eq('id', consultationId).eq('status', 'requested').is('doctor_id', null);
    setPendingCalls(prev => prev.filter(c => c.id !== consultationId));
    setDismissing(null);
  };

  const dismissAll = async () => {
    const ids = pendingCalls.map((c: any) => c.id);
    for (const id of ids) await dismissCall(id);
  };

  const formatAge = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    return Math.floor(mins / 60) + 'h ago';
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-8">

      {/* Incoming Teleconsult Requests */}
      {pendingCalls.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl font-bold text-red-700">Incoming Video Calls</h2>
            <Badge className="bg-red-500 text-white">{pendingCalls.length}</Badge>
            <button onClick={dismissAll} className="text-xs text-red-500 hover:text-red-700 underline ml-2">
              Dismiss all
            </button>
          </div>
          <div className="space-y-3">
            {pendingCalls.map(c => (
              <Card key={c.id} className="border-2 border-red-300 bg-red-50 shadow-md">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Video className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-red-900">{(c.patient as any)?.full_name ?? 'Patient'}</h3>
                      {c.chief_complaint && (
                        <p className="text-sm text-red-700 line-clamp-1">{c.chief_complaint}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                        <Clock className="w-3 h-3" />
                        {formatAge(c.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Dismiss button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissCall(c.id)}
                      disabled={dismissing === c.id}
                      className="border-red-300 text-red-600 hover:bg-red-100 h-10 px-3"
                      title="Dismiss (cancel this request)"
                    >
                      {dismissing === c.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <X className="w-4 h-4" />}
                    </Button>
                    {/* Join button */}
                    <Button
                      onClick={() => joinCall(c.id)}
                      disabled={joining === c.id}
                      className="bg-red-600 hover:bg-red-700 h-10 px-5 font-semibold"
                    >
                      {joining === c.id
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</>
                        : <><Video className="w-4 h-4 mr-2" />Join Call</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* My Consultations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-800">Consultation Queue</h1>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </div>

        {myConsultations.length === 0 && pendingCalls.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <Phone className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500">No active consultations</p>
              <p className="text-sm text-slate-400">Waiting for teleconsult requests...</p>
            </CardContent>
          </Card>
        ) : myConsultations.length > 0 ? (
          <div className="grid gap-4">
            {myConsultations.map(c => (
              <Card key={c.id} className={c.status === 'completed' ? 'border-slate-200 opacity-70' : 'border-emerald-200'}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{(c.patient as any)?.full_name ?? 'Patient'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {c.consultation_type} · {new Date(c.created_at).toLocaleString()}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <StatusBadge status={{ kind: 'consultation', value: c.status }} />
                    </div>
                  </div>
                  {c.status !== 'completed' && (
                    <Link href={'/doctor/consultations/' + c.id}>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Video className="w-4 h-4 mr-2" />Rejoin
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
