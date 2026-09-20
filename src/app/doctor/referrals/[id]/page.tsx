'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/provider';
import { Loader2, ArrowLeft, User, FileText, Pill, CheckCircle, Video, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const REFERRAL_STAGES = [
  { key: 'created', label: 'Created' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'in_treatment', label: 'In Treatment' },
  { key: 'completed', label: 'Completed' },
];

const NEXT_STATUSES: Record<string, string[]> = {
  created: ['acknowledged'],
  acknowledged: ['in_transit', 'in_treatment'],
  in_transit: ['arrived'],
  arrived: ['in_treatment'],
  in_treatment: ['completed'],
};

export default function DoctorReferralDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [ref, setRef] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [consultation, setConsultation] = useState<any>(null);
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [startingConsult, setStartingConsult] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'patient'>('info');

  const load = useCallback(async () => {
    if (!id) return;
    // Load referral
    const { data: referral } = await supabase.from('referrals')
      .select(`
        *,
        patient:patients(id, full_name, date_of_birth, gender, phone, blood_group, chronic_conditions, allergies, address),
        referrer:profiles!referrals_referred_by_fkey(full_name),
        dest:facilities!referrals_destination_facility_id_fkey(name, phone)
      `)
      .eq('id', id)
      .single();

    if (!referral) { setLoading(false); return; }
    setRef(referral);
    setPatient(referral.patient);

    // Load source consultation notes
    if (referral.consultation_id) {
      const res = await fetch('/api/consultations/' + referral.consultation_id);
      if (res.ok) {
        const json = await res.json();
        setConsultation(json.consultation);
        setPrescription(json.prescription);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    await fetch('/api/consultations/' + (ref?.consultation_id ?? id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'referral_status', referral_id: id, status: newStatus }),
    });
    await load();
    setUpdating(false);
  };

  const requestVideoConsult = async () => {
    if (!patient?.id || !user?.id) return;
    setStartingConsult(true);
    const { data: cons } = await supabase.from('consultations').insert({
      patient_id: patient.id,
      doctor_id: user.id,
      consultation_type: 'teleconsult_video',
      status: 'in_progress',
      priority: ref?.urgency === 'emergency' ? 'emergency' : ref?.urgency === 'urgent' ? 'high' : 'medium',
      chief_complaint: `Referral follow-up: ${ref?.reason ?? ''}`,
    }).select('id').single();
    setStartingConsult(false);
    if (cons?.id) router.push('/doctor/consultations/' + cons.id);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-green-700" /></div>;
  if (!ref) return <div className="p-8 text-center text-slate-500">Referral not found.</div>;

  const stageIdx = REFERRAL_STAGES.findIndex(s => s.key === ref.status);
  const isIncoming = ref.referred_to_doctor_id === user?.id;
  const nextStatuses = NEXT_STATUSES[ref.status] ?? [];

  const calcAge = (dob: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600000));
  };

  const formatMeds = (meds: any[]) =>
    meds?.map(m => `${m.name} ${m.dosage} — ${m.frequency} for ${m.duration}`).join('; ');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Link href="/doctor/referrals" className="p-2 rounded-lg hover:bg-black/5 transition-colors">
            <ArrowLeft className="w-5 h-5" style={{ color: 'oklch(0.47 0.012 60)' }} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>
                Referral — {patient?.full_name ?? 'Unknown'}
              </h1>
              {isIncoming && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Incoming</span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.012 60)' }}>
              From Dr. {(ref.referrer as any)?.full_name ?? '—'} · {new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Status timeline */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'oklch(0.47 0.012 60)' }}>Referral Progress</p>
          <div className="flex items-center gap-0">
            {REFERRAL_STAGES.map((stage, i) => {
              const done = i <= stageIdx;
              const current = i === stageIdx;
              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold transition-all ${done ? 'bg-green-600' : 'bg-slate-200'} ${current ? 'ring-2 ring-green-300 ring-offset-1' : ''}`}>
                    {done ? '✓' : i + 1}
                  </div>
                  {i < REFERRAL_STAGES.length - 1 && (
                    <div className="absolute" style={{ display: 'none' }} />
                  )}
                  <p className={`text-[9px] mt-1 text-center font-medium ${done ? 'text-green-700' : 'text-slate-400'}`}>{stage.label}</p>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${((stageIdx + 1) / REFERRAL_STAGES.length) * 100}%` }}
            />
          </div>

          {/* Action buttons for incoming doctor */}
          {isIncoming && nextStatuses.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {nextStatuses.map(ns => (
                <button
                  key={ns}
                  onClick={() => updateStatus(ns)}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: ns === 'completed' ? 'oklch(0.37 0.09 158)' : 'oklch(0.45 0.08 240)' }}
                >
                  {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                  Mark as {ns.replace(/_/g, ' ')}
                </button>
              ))}
              {ref.status === 'created' && (
                <button
                  onClick={requestVideoConsult}
                  disabled={startingConsult}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'oklch(0.20 0.04 60)', color: 'white' }}
                >
                  {startingConsult ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                  Start Video Consultation
                </button>
              )}
            </div>
          )}
        </div>

        {/* Patient instructions box */}
        {ref.patient_instructions && (
          <div className="rounded-xl p-4 border border-blue-200 bg-blue-50">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Patient Instructions</p>
            <p className="text-sm text-blue-800">{ref.patient_instructions}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'oklch(0.85 0.016 80)', backgroundColor: 'oklch(0.90 0.014 80)' }}>
          {([['info', 'Referral Info'], ['patient', 'Patient Profile'], ['notes', 'Clinical Notes']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: activeTab === t ? 'oklch(0.37 0.09 158)' : 'transparent',
                color: activeTab === t ? 'white' : 'oklch(0.47 0.012 60)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'info' && (
          <div className="rounded-xl p-4 border space-y-3" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
            <Row label="Service / Specialty" value={ref.service} />
            <Row label="Urgency" value={ref.urgency} />
            <Row label="Reason" value={ref.reason} />
            {ref.clinical_summary && <Row label="Clinical Summary" value={ref.clinical_summary} />}
            {(ref.dest as any)?.name && <Row label="Destination Facility" value={(ref.dest as any).name} />}
            {(ref.dest as any)?.phone && <Row label="Facility Contact" value={(ref.dest as any).phone} />}
          </div>
        )}

        {activeTab === 'patient' && patient && (
          <div className="rounded-xl p-4 border space-y-3" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
            <Row label="Name" value={patient.full_name} />
            <Row label="Age" value={calcAge(patient.date_of_birth) ? `${calcAge(patient.date_of_birth)} years` : '—'} />
            <Row label="Gender" value={patient.gender} />
            <Row label="Blood Group" value={patient.blood_group} />
            <Row label="Phone" value={patient.phone} />
            {patient.chronic_conditions?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Chronic Conditions</p>
                <div className="flex flex-wrap gap-1">
                  {patient.chronic_conditions.map((c: string) => (
                    <span key={c} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {patient.allergies?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Allergies</p>
                <div className="flex flex-wrap gap-1">
                  {patient.allergies.map((a: string) => (
                    <span key={a} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {consultation ? (
              <>
                {consultation.clinical_notes && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'oklch(0.47 0.012 60)' }}>Clinical Notes</p>
                    <p className="text-sm" style={{ color: 'oklch(0.20 0.012 60)' }}>{consultation.clinical_notes}</p>
                  </div>
                )}
                {consultation.assessment && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'oklch(0.47 0.012 60)' }}>Assessment / Diagnosis</p>
                    <p className="text-sm" style={{ color: 'oklch(0.20 0.012 60)' }}>{consultation.assessment}</p>
                  </div>
                )}
                {prescription?.medications?.length > 0 && (
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'oklch(0.47 0.012 60)' }}>Previous Prescription</p>
                    <div className="space-y-2">
                      {prescription.medications.map((m: any, i: number) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                          <p className="text-sm font-semibold text-slate-800">{m.name} — {m.dosage}</p>
                          <p className="text-xs text-slate-500">{m.frequency} · {m.duration}</p>
                          {m.instructions && <p className="text-xs text-slate-400 italic">{m.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">No consultation notes attached to this referral.</div>
            )}
          </div>
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
