'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const STAGE_ORDER = ['created', 'acknowledged', 'in_transit', 'arrived', 'in_treatment', 'completed'];

const NEXT_STATUSES: Record<string, string> = {
  created: 'acknowledged',
  acknowledged: 'in_transit',
  in_transit: 'arrived',
  arrived: 'in_treatment',
  in_treatment: 'completed',
};

const STATUS_LABELS: Record<string, string> = {
  created: 'Created', acknowledged: 'Acknowledged', in_transit: 'In Transit',
  arrived: 'Arrived', in_treatment: 'In Treatment', completed: 'Completed', cancelled: 'Cancelled',
};

const URGENCY_STYLE: Record<string, string> = {
  emergency: 'bg-red-100 text-red-700',
  urgent: 'bg-orange-100 text-orange-700',
  routine: 'bg-slate-100 text-slate-600',
};

export default function AshaReferrals() {
  const { user } = useAuth();
  const supabase = createClient();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get all patients assigned to this ASHA worker
    const { data: patients } = await supabase.from('patients')
      .select('id, full_name')
      .eq('assigned_worker_id', user.id);

    if (!patients || patients.length === 0) { setLoading(false); return; }

    const patientIds = patients.map(p => p.id);
    const patientMap = Object.fromEntries(patients.map(p => [p.id, p.full_name]));

    // Get all referrals for these patients
    const { data: refs } = await supabase.from('referrals')
      .select(`
        *,
        referrer:profiles!referrals_referred_by_fkey(full_name),
        dest:facilities!referrals_destination_facility_id_fkey(name)
      `)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });

    if (refs) {
      setReferrals(refs.map(r => ({ ...r, patientName: patientMap[r.patient_id] ?? '—' })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const advanceStatus = async (ref: any) => {
    const next = NEXT_STATUSES[ref.status];
    if (!next || !ref.consultation_id) return;
    setUpdating(ref.id);
    await fetch('/api/consultations/' + ref.consultation_id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'referral_status', referral_id: ref.id, status: next }),
    });
    await load();
    setUpdating(null);
  };

  const activeRefs = referrals.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
  const doneRefs = referrals.filter(r => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>Patient Referrals</h1>
          <p className="text-sm mt-0.5" style={{ color: 'oklch(0.47 0.012 60)' }}>Doctor-created referrals for your patients</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-700" /></div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{ borderColor: 'oklch(0.83 0.016 80)' }}>
            <div className="text-5xl mb-3">📋</div>
            <p className="font-semibold" style={{ color: 'oklch(0.47 0.012 60)' }}>No referrals for your patients yet</p>
          </div>
        ) : (
          <>
            {/* Active referrals */}
            {activeRefs.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'oklch(0.47 0.012 60)' }}>
                  Active Referrals ({activeRefs.length})
                </p>
                {activeRefs.map(r => {
                  const isExpanded = expanded === r.id;
                  const hasAshaInstructions = !!r.asha_instructions;
                  const nextStatus = NEXT_STATUSES[r.status];
                  const isNew = Date.now() - new Date(r.created_at).getTime() < 86400000;

                  return (
                    <div key={r.id} className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
                      {/* Header */}
                      <button
                        className="w-full p-4 text-left flex items-start justify-between gap-3"
                        onClick={() => setExpanded(isExpanded ? null : r.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm" style={{ color: 'oklch(0.15 0.012 60)' }}>{r.patientName}</p>
                            {isNew && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">New</span>}
                            {hasAshaInstructions && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Action Required
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${URGENCY_STYLE[r.urgency] ?? 'bg-slate-100 text-slate-600'}`}>
                              {r.urgency}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.012 60)' }}>
                            Dr. {(r.referrer as any)?.full_name ?? '—'} · {r.service}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${((STAGE_ORDER.indexOf(r.status) + 1) / STAGE_ORDER.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-green-700">{STATUS_LABELS[r.status]}</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'oklch(0.55 0.012 60)' }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'oklch(0.55 0.012 60)' }} />}
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'oklch(0.92 0.014 80)' }}>
                          {/* ASHA instructions — highlight if present */}
                          {hasAshaInstructions && (
                            <div className="mt-3 rounded-lg p-3 border border-amber-200 bg-amber-50">
                              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Your Instructions
                              </p>
                              <p className="text-sm text-amber-900">{r.asha_instructions}</p>
                            </div>
                          )}

                          <div className="space-y-1.5 mt-2">
                            <MiniRow label="Reason" value={r.reason} />
                            <MiniRow label="Facility" value={(r.dest as any)?.name} />
                            <MiniRow label="Created" value={new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                          </div>

                          {/* Advance status button */}
                          {nextStatus && r.consultation_id && (
                            <button
                              onClick={() => advanceStatus(r)}
                              disabled={updating === r.id}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white mt-2 disabled:opacity-50 transition-opacity hover:opacity-90"
                              style={{ backgroundColor: nextStatus === 'completed' ? 'oklch(0.37 0.09 158)' : 'oklch(0.45 0.08 240)' }}
                            >
                              {updating === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Mark as {STATUS_LABELS[nextStatus]}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed */}
            {doneRefs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'oklch(0.60 0.01 60)' }}>
                  Completed ({doneRefs.length})
                </p>
                {doneRefs.map(r => (
                  <div key={r.id} className="rounded-xl border px-4 py-3 flex justify-between items-center" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'oklch(0.35 0.012 60)' }}>{r.patientName}</p>
                      <p className="text-xs" style={{ color: 'oklch(0.55 0.012 60)' }}>{r.service} · Dr. {(r.referrer as any)?.full_name ?? '—'}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">{STATUS_LABELS[r.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs font-medium" style={{ color: 'oklch(0.55 0.012 60)' }}>{label}</span>
      <span className="text-xs text-right" style={{ color: 'oklch(0.25 0.012 60)' }}>{value}</span>
    </div>
  );
}
