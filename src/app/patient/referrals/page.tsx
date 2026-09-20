'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight, MapPin, Video, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';

const STAGES = [
  { key: 'created', label: 'Referral Created', icon: '📋' },
  { key: 'acknowledged', label: 'Doctor Acknowledged', icon: '👨‍⚕️' },
  { key: 'in_transit', label: 'Heading to Facility', icon: '🚗' },
  { key: 'arrived', label: 'Arrived', icon: '🏥' },
  { key: 'in_treatment', label: 'In Treatment', icon: '💊' },
  { key: 'completed', label: 'Completed', icon: '✅' },
];

function getWhatToDo(ref: any): { icon: string; title: string; body: string; action?: { label: string; href: string } } | null {
  // Doctor typed explicit instructions
  if (ref.patient_instructions) {
    return {
      icon: '📝',
      title: 'Instructions from Your Doctor',
      body: ref.patient_instructions,
    };
  }

  const status = ref.status;

  // Video consultation is scheduled (consultation linked and in_progress)
  if (ref.linked_consultation && ref.linked_consultation.consultation_type === 'teleconsult_video' && ref.linked_consultation.status === 'in_progress') {
    return {
      icon: '🎥',
      title: 'Video Call Scheduled',
      body: 'Your doctor has scheduled a video consultation. Tap below to join.',
      action: { label: 'Join Video Call', href: `/patient/consultation/${ref.linked_consultation.id}` },
    };
  }

  // Physical facility
  if (status === 'acknowledged' && ref.dest?.name) {
    return {
      icon: '🏥',
      title: 'Visit Required',
      body: `Please visit ${ref.dest.name}. Your referral has been confirmed.`,
    };
  }

  if (status === 'created') {
    return {
      icon: '⏳',
      title: 'Awaiting Confirmation',
      body: 'Your referral has been submitted. The specialist doctor or facility will confirm shortly.',
    };
  }

  if (status === 'in_transit') {
    return {
      icon: '🚗',
      title: 'Head to the Facility',
      body: `Please travel to ${ref.dest?.name ?? 'the referred facility'} now.`,
    };
  }

  if (status === 'in_treatment') {
    return {
      icon: '💊',
      title: 'Treatment in Progress',
      body: 'You are currently in treatment. Follow all doctor instructions carefully.',
    };
  }

  if (status === 'completed') {
    return {
      icon: '✅',
      title: 'Treatment Complete',
      body: 'Your referral treatment is complete. Your ASHA worker will follow up with you.',
    };
  }

  return null;
}

export default function PatientReferrals() {
  const { user } = useAuth();
  const supabase = createClient();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    // Get patient record
    const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).maybeSingle();
    if (!patient) { setLoading(false); return; }

    const { data: refs } = await supabase.from('referrals')
      .select(`
        *,
        referrer:profiles!referrals_referred_by_fkey(full_name),
        dest:facilities!referrals_destination_facility_id_fkey(name, address, phone),
        doctor_to:profiles!referrals_referred_to_doctor_id_fkey(full_name)
      `)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (refs) {
      // For each ref, fetch linked consultation if any
      const enriched = await Promise.all(refs.map(async (r) => {
        if (!r.consultation_id) return r;
        const { data: cons } = await supabase.from('consultations').select('id, consultation_type, status').eq('id', r.consultation_id).maybeSingle();
        return { ...r, linked_consultation: cons };
      }));
      setReferrals(enriched);
      if (enriched.length > 0) setSelected(enriched[0].id);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime for status changes
  useEffect(() => {
    const ch = supabase.channel('patient-referrals').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'referrals' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-green-700" /></div>;

  const selectedRef = referrals.find(r => r.id === selected);
  const stageIdx = selectedRef ? STAGES.findIndex(s => s.key === selectedRef.status) : -1;
  const whatToDo = selectedRef ? getWhatToDo(selectedRef) : null;

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>My Referrals</h1>

        {referrals.length === 0 ? (
          <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{ borderColor: 'oklch(0.83 0.016 80)' }}>
            <div className="text-5xl mb-3">📋</div>
            <p className="font-semibold" style={{ color: 'oklch(0.47 0.012 60)' }}>No referrals yet</p>
            <p className="text-sm mt-1" style={{ color: 'oklch(0.60 0.01 60)' }}>Your doctor will create one if needed</p>
          </div>
        ) : (
          <>
            {/* Referral selector tabs */}
            {referrals.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {referrals.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      backgroundColor: selected === r.id ? 'oklch(0.37 0.09 158)' : 'white',
                      color: selected === r.id ? 'white' : 'oklch(0.47 0.012 60)',
                      borderColor: selected === r.id ? 'transparent' : 'oklch(0.85 0.016 80)',
                    }}
                  >
                    {(r.referrer as any)?.full_name ?? 'Referral'} · {r.service?.slice(0, 12)}
                  </button>
                ))}
              </div>
            )}

            {selectedRef && (
              <>
                {/* What to do next */}
                {whatToDo && (
                  <div
                    className="rounded-xl p-4 border-l-4 shadow-sm"
                    style={{
                      backgroundColor: 'white',
                      borderLeftColor: 'oklch(0.37 0.09 158)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{whatToDo.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: 'oklch(0.15 0.012 60)' }}>{whatToDo.title}</p>
                        <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'oklch(0.40 0.012 60)' }}>{whatToDo.body}</p>
                        {whatToDo.action && (
                          <Link
                            href={whatToDo.action.href}
                            className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: 'oklch(0.37 0.09 158)' }}
                          >
                            {whatToDo.action.label} <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status timeline */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: 'oklch(0.47 0.012 60)' }}>Referral Journey</p>
                  <div className="space-y-3">
                    {STAGES.map((stage, i) => {
                      const done = i <= stageIdx;
                      const current = i === stageIdx;
                      return (
                        <div key={stage.key} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'} ${current ? 'ring-2 ring-green-300 ring-offset-1' : ''}`}>
                              {done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <span className="text-xs">{i + 1}</span>}
                            </div>
                            {i < STAGES.length - 1 && (
                              <div className={`w-0.5 h-4 mt-1 ${done && i < stageIdx ? 'bg-green-300' : 'bg-slate-100'}`} />
                            )}
                          </div>
                          <div className="pb-3">
                            <p className={`text-sm font-semibold ${done ? 'text-green-700' : 'text-slate-400'}`}>{stage.label}</p>
                            {current && (
                              <p className="text-xs text-slate-500 mt-0.5">Current status</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Referral details */}
                <div className="rounded-xl p-4 border space-y-2.5" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'oklch(0.47 0.012 60)' }}>Referral Details</p>
                  <Row label="Referred by" value={`Dr. ${(selectedRef.referrer as any)?.full_name ?? '—'}`} />
                  <Row label="Service" value={selectedRef.service} />
                  <Row label="Urgency" value={selectedRef.urgency} />
                  <Row label="Reason" value={selectedRef.reason} />
                  {selectedRef.doctor_to && (
                    <Row label="Specialist Doctor" value={`Dr. ${(selectedRef.doctor_to as any)?.full_name}`} />
                  )}
                  {selectedRef.dest?.name && <Row label="Facility" value={(selectedRef.dest as any).name} />}
                  {selectedRef.dest?.phone && <Row label="Facility Contact" value={(selectedRef.dest as any).phone} />}
                  <Row label="Date" value={new Date(selectedRef.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-0" style={{ borderColor: 'oklch(0.92 0.014 80)' }}>
      <span className="text-xs font-medium flex-shrink-0" style={{ color: 'oklch(0.55 0.012 60)' }}>{label}</span>
      <span className="text-xs text-right" style={{ color: 'oklch(0.20 0.012 60)' }}>{value}</span>
    </div>
  );
}
