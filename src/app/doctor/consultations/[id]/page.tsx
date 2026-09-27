'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { DoctorVideoRoom } from '@/components/video/DoctorVideoRoom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, CheckCircle, Plus, Heart, AlertTriangle,
  ClipboardList, FileText, Pill, Send, ArrowRightLeft,
  User, Activity, Stethoscope, Building2, X, ShieldAlert,
  ShieldCheck, AlertCircle, Beaker,
} from 'lucide-react';
import { SPECIALIST_RESOURCES, FACILITY_TYPE_SHORT } from '@/lib/specialist-resources';

function calcAge(dob: string | null) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) + 'y';
}

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  mild:      { label: 'Mild',      bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200', dot: 'bg-green-500' },
  moderate:  { label: 'Moderate',  bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200', dot: 'bg-amber-500' },
  emergency: { label: 'Emergency', bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-200',   dot: 'bg-red-500'   },
};

type Tab = 'report' | 'notes' | 'referral' | 'instructions';

export default function DoctorConsultationRoom() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;

  const [consultation, setConsultation] = useState<any>(null);
  const [triage, setTriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [assessment, setAssessment] = useState('');
  const [meds, setMeds] = useState<any[]>([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [tab, setTab] = useState<Tab>('report');

  // Instructions for patient and ASHA worker
  const [patientInstructions, setPatientInstructions] = useState('');
  const [ashaInstructions, setAshaInstructions] = useState('');

  // Ref to trigger endCall from DoctorVideoRoom when completing
  const endCallRef = useRef<(() => void) | null>(null);


  // Referral state
  const [refMode, setRefMode] = useState<'specialist' | 'doctor'>('specialist');
  const [refService, setRefService] = useState('');
  const [refUrgency, setRefUrgency] = useState('routine');
  const [refReason, setRefReason] = useState('');
  const [refSent, setRefSent] = useState(false);
  const [refSending, setRefSending] = useState(false);

  // Doctor-to-doctor referral
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; full_name: string; specialty: string } | null>(null);

  // Facility selection & validation
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [requiredDiags, setRequiredDiags] = useState<string[]>([]);
  const [requiredMeds, setRequiredMeds] = useState<string[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [overrideWarning, setOverrideWarning] = useState(false);

  useEffect(() => {
    async function load() {
      if (!params.id || !user) return;

      try {
        const res = await fetch('/api/consultations/' + params.id);
        if (res.ok) {
          const json = await res.json();
          if (json.consultation) {
            setConsultation(json.consultation);
            setNotes(json.consultation.clinical_notes ?? '');
            setAssessment(json.consultation.assessment ?? '');

            // Claim if unclaimed
            if (!json.consultation.doctor_id) {
              await fetch('/api/consultations/' + params.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'claim', doctor_id: user.id }),
              });
            }
          }
          if (json.triage) setTriage(json.triage);
        }
      } catch (err) {
        console.error('Failed to load consultation:', err);
      }
      setLoading(false);
    }
    load();
  }, [params.id, user]);

  const addMed = () => setMeds(m => [...m, { name: '', dosage: '', frequency: '', duration: '' }]);
  const updateMed = (i: number, f: string, v: string) =>
    setMeds(m => m.map((x, idx) => idx === i ? { ...x, [f]: v } : x));
  const removeMed = (i: number) => setMeds(m => m.filter((_, idx) => idx !== i));

  // Fetch doctors when referral tab is opened in doctor mode
  const loadDoctors = async () => {
    if (doctors.length > 0) return;
    setDoctorsLoading(true);
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const json = await res.json();
        // Exclude self
        setDoctors((json.doctors ?? []).filter((d: any) => d.id !== user?.id));
      }
    } catch (_) {}
    setDoctorsLoading(false);
  };

  // Fetch eligible facilities (PHC and above)
  const loadFacilities = useCallback(async () => {
    if (facilities.length > 0) return;
    setFacilitiesLoading(true);
    try {
      const res = await fetch('/api/facilities');
      if (res.ok) {
        const json = await res.json();
        // Filter: PHC and above for specialist referrals
        const eligible = (json.data ?? []).filter((f: any) =>
          f.type !== 'sub_centre'
        );
        setFacilities(eligible);
      }
    } catch (_) {}
    setFacilitiesLoading(false);
  }, [facilities.length]);

  // Auto-populate required resources when specialist type changes
  const onSpecialistChange = (specialist: string | null) => {
    if (!specialist) return;
    setRefService(specialist);
    const res = SPECIALIST_RESOURCES[specialist];
    if (res) {
      setRequiredDiags(res.diagnostics);
      setRequiredMeds(res.medications);
    } else {
      setRequiredDiags([]);
      setRequiredMeds([]);
    }
    // Reset validation when specialist changes
    setValidation(null);
    setOverrideWarning(false);
    // Load facilities
    loadFacilities();
  };

  // Validate facility resources
  const validateFacility = useCallback(async (facId: string, diags: string[], meds: string[]) => {
    if (!facId) return;
    if (diags.length === 0 && meds.length === 0) {
      setValidation({ pass: true, diagnostics: [], medications: [], warnings: [], suggestion: null, suggested_facility: null });
      return;
    }
    setValidating(true);
    setOverrideWarning(false);
    try {
      const params = new URLSearchParams({ facility_id: facId });
      if (diags.length > 0) params.set('diagnostics', diags.join(','));
      if (meds.length > 0) params.set('medications', meds.join(','));
      const res = await fetch('/api/referrals/validate?' + params.toString());
      if (res.ok) {
        const json = await res.json();
        setValidation(json.validation);
      }
    } catch (_) {}
    setValidating(false);
  }, []);

  // When facility is selected, auto-validate
  const onFacilitySelect = (fac: any) => {
    setSelectedFacility(fac);
    setValidation(null);
    setOverrideWarning(false);
    validateFacility(fac.id, requiredDiags, requiredMeds);
  };

  const complete = async () => {
    setSaving(true);

    // 1. Send hangup to patient FIRST — gives them a clean disconnect signal
    try { endCallRef.current?.(); } catch (_) {}
    // Brief pause so the hangup broadcast can fly out before we navigate away
    await new Promise(r => setTimeout(r, 400));

    const validMeds = meds.filter(m => m.name.trim());
    const res = await fetch('/api/consultations/' + params.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        clinical_notes: notes,
        assessment,
        medications: validMeds,
        doctor_id: user?.id,
        patient_instructions: patientInstructions || null,
        asha_instructions: ashaInstructions || null,
      }),
    });
    if (!res.ok) { setSaving(false); return; }

    setSaving(false);
    setCompleted(true);
    setTimeout(() => router.push('/doctor/consultations'), 1200);
  };


  const sendReferral = async () => {
    const serviceLabel = refMode === 'doctor'
      ? (selectedDoctor ? `Doctor: ${selectedDoctor.full_name} (${selectedDoctor.specialty})` : '')
      : refService;
    if (!serviceLabel || !refReason.trim()) return;
    setRefSending(true);
    await fetch('/api/consultations/' + params.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'referral',
        service: serviceLabel,
        urgency: refUrgency,
        reason: refReason,
        clinical_summary: assessment || notes,
        patient_id: consultation.patient_id,
        doctor_id: user?.id,
        referred_to_doctor_id: refMode === 'doctor' ? (selectedDoctor?.id ?? null) : null,
        destination_facility_id: selectedFacility?.id ?? null,
        patient_instructions: patientInstructions || null,
        asha_instructions: ashaInstructions || null,
      }),
    });
    setRefSent(true);
    setRefSending(false);
  };


  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
    </div>
  );
  if (!consultation) return (
    <div className="h-screen flex items-center justify-center text-red-500">Consultation not found</div>
  );
  if (completed) return (
    <div className="h-screen flex items-center justify-center flex-col gap-3 bg-white">
      <CheckCircle className="w-16 h-16 text-emerald-500" />
      <p className="text-xl font-bold text-emerald-700">Consultation Completed</p>
      <p className="text-slate-500 text-sm">Redirecting...</p>
    </div>
  );

  const patient = consultation.patient ?? {};
  const conditions: string[] = patient.chronic_conditions ?? [];
  const allergies: string[] = patient.allergies ?? [];
  const symptoms: any[] = triage?.symptoms ?? [];
  const severity = triage?.severity ?? null;
  const sevConfig = severity ? SEVERITY_CONFIG[severity] : null;

  // Group symptoms by category
  const sympByCategory = symptoms.reduce((acc: Record<string, string[]>, s: any) => {
    const cat = s.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name || s);
    return acc;
  }, {});

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'report',       label: 'Report',       icon: FileText },
    { id: 'notes',        label: 'Notes & Rx',   icon: ClipboardList },
    { id: 'referral',     label: 'Referral',     icon: ArrowRightLeft },
    { id: 'instructions', label: 'Instructions', icon: Send },
  ];


  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">

      {/* ── Left: Video Panel ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col p-3 gap-2">
        <div className="flex items-center justify-between px-1 py-1">
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight">Teleconsultation</h1>
            <p className="text-slate-500 text-xs">
              {patient.full_name ?? 'Patient'} · Room {(params.id as string).slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sevConfig && (
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sevConfig.bg} ${sevConfig.text} ${sevConfig.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`} />
                {sevConfig.label}
              </span>
            )}
            <Badge className="bg-emerald-600 border-none text-xs">● Live</Badge>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-xl">
          <DoctorVideoRoom roomId={params.id as string} patientName={patient.full_name ?? 'Patient'} onEndCallRef={endCallRef} />

        </div>
      </div>

      {/* ── Right: Tabbed Panel ───────────────────────────────────────── */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-white border-l border-slate-200">

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.id === 'referral' && refSent
                  ? <span className="flex items-center gap-1">{t.label} <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">✓</span></span>
                  : t.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable panel content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── REPORT TAB ──────────────────────────────────────────── */}
          {tab === 'report' && (
            <div className="p-4 space-y-4">

              {/* Patient demographics */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Patient</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Name', value: patient.full_name },
                    { label: 'Age / Sex', value: `${calcAge(patient.date_of_birth)} / ${patient.gender ?? '—'}` },
                    { label: 'Blood Group', value: patient.blood_group ?? 'Unknown' },
                    { label: 'Phone', value: patient.phone ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Triage report */}
              {triage && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Triage Assessment</h3>
                  </div>

                  {/* Severity pill */}
                  {sevConfig && (
                    <div className={`flex items-center justify-between p-3 rounded-xl border mb-3 ${sevConfig.bg} ${sevConfig.border}`}>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">Severity</p>
                        <p className={`text-base font-bold ${sevConfig.text}`}>{sevConfig.label}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase text-right">Recommendation</p>
                        <p className={`text-xs font-semibold capitalize ${sevConfig.text} text-right`}>
                          {triage.routing_recommendation?.replace('_', ' ') ?? '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Chief complaint */}
                  {(triage.chief_complaint || consultation.chief_complaint) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                      <p className="text-[10px] text-blue-600 font-bold uppercase mb-1 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" /> Chief Complaint
                      </p>
                      <p className="text-sm text-blue-900">
                        {triage.chief_complaint || consultation.chief_complaint}
                      </p>
                    </div>
                  )}

                  {/* Symptoms */}
                  {Object.keys(sympByCategory).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(sympByCategory).map(([cat, syms]) => (
                        <div key={cat}>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{cat}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(syms as string[]).map((s, i) => (
                              <span key={i} className="bg-orange-50 border border-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chronic conditions */}
              {conditions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chronic Conditions</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {conditions.map((c, i) => (
                      <span key={i} className="bg-red-50 border border-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergies */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Allergies</h3>
                </div>
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a, i) => (
                      <span key={i} className="bg-amber-50 border border-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        ⚠ {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No known allergies</p>
                )}
              </div>
            </div>
          )}

          {/* ── NOTES & Rx TAB ──────────────────────────────────────── */}
          {tab === 'notes' && (
            <div className="p-4 space-y-4">
              {/* Clinical Notes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">Clinical Notes</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observations</label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Patient observations, symptoms discussed during call..."
                      className="text-sm min-h-[90px] resize-none border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Assessment / Diagnosis</label>
                    <Textarea
                      value={assessment}
                      onChange={e => setAssessment(e.target.value)}
                      placeholder="Clinical assessment and diagnosis..."
                      className="text-sm min-h-[70px] resize-none border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Prescriptions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-800">Prescription</h3>
                  </div>
                  <button
                    onClick={addMed}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />Add medicine
                  </button>
                </div>
                <div className="space-y-2">
                  {meds.map((med, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                      <div className="flex gap-2 items-center">
                        <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-700 flex-shrink-0">
                          {i + 1}
                        </div>
                        <Input
                          placeholder="Medicine name"
                          value={med.name}
                          onChange={e => updateMed(i, 'name', e.target.value)}
                          className="text-xs h-8 flex-1 border-slate-200"
                        />
                        <button onClick={() => removeMed(i)} className="text-slate-300 hover:text-red-400 transition-colors text-xs px-1">✕</button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 ml-7">
                        <div>
                          <label className="text-[9px] text-slate-400 font-medium block mb-0.5">DOSE</label>
                          <Input value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} placeholder="500mg" className="text-xs h-7 border-slate-200" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-medium block mb-0.5">FREQUENCY</label>
                          <Input value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} placeholder="2x daily" className="text-xs h-7 border-slate-200" />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-medium block mb-0.5">DAYS</label>
                          <Input value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} placeholder="5" className="text-xs h-7 border-slate-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── REFERRAL TAB ─────────────────────────────────────────── */}
          {tab === 'referral' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-800">Referral</h3>
              </div>

              {/* Mode toggle */}
              {!refSent && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <button
                    onClick={() => { setRefMode('specialist'); setSelectedDoctor(null); }}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      refMode === 'specialist'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    🏥 Specialist Type
                  </button>
                  <button
                    onClick={() => {
                      setRefMode('doctor');
                      setRefService('');
                      loadDoctors();
                    }}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      refMode === 'doctor'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    👨‍⚕️ Another Doctor
                  </button>
                </div>
              )}

              {refSent ? (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center space-y-2">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-7 h-7 text-purple-600" />
                  </div>
                  <p className="font-bold text-purple-800">Referral Created!</p>
                  <p className="text-sm text-purple-600">
                    {refMode === 'doctor' && selectedDoctor
                      ? <>Patient referred to <span className="font-semibold">{selectedDoctor.full_name}</span></>
                      : <>Patient referred to <span className="font-semibold">{refService}</span></>}
                  </p>
                  <p className="text-xs text-purple-500 capitalize">Priority: {refUrgency}</p>
                  <button
                    onClick={() => {
                      setRefSent(false);
                      setRefService('');
                      setRefReason('');
                      setRefUrgency('routine');
                      setSelectedDoctor(null);
                    }}
                    className="text-xs text-purple-500 underline hover:text-purple-700 mt-1"
                  >
                    Create another referral
                  </button>
                </div>
              ) : (
                <div className="space-y-3">

                  {/* ── Specialist mode ── */}
                  {refMode === 'specialist' && (
                    <div className="space-y-3">

                      {/* Specialist type selector */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Specialist Type</label>
                        <Select value={refService} onValueChange={onSpecialistChange}>
                          <SelectTrigger className="text-sm border-slate-200">
                            <SelectValue placeholder="Select specialist..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(SPECIALIST_RESOURCES).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Required resource pills */}
                      {refService && (requiredDiags.length > 0 || requiredMeds.length > 0) && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                            Required Resources <span className="font-normal normal-case">(auto-filled, tap × to remove)</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {requiredDiags.map(d => (
                              <span key={'d-' + d} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                <Beaker className="w-2.5 h-2.5" />{d}
                                <button onClick={() => { setRequiredDiags(prev => prev.filter(x => x !== d)); setValidation(null); }} className="hover:text-red-500 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                              </span>
                            ))}
                            {requiredMeds.map(m => (
                              <span key={'m-' + m} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <Pill className="w-2.5 h-2.5" />{m}
                                <button onClick={() => { setRequiredMeds(prev => prev.filter(x => x !== m)); setValidation(null); }} className="hover:text-red-500 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Facility selector */}
                      {refService && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                            <Building2 className="w-3 h-3 inline mr-1" />Destination Facility
                          </label>
                          {facilitiesLoading ? (
                            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                          ) : facilities.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">No eligible facilities found.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                              {facilities.map(fac => {
                                const isSelected = selectedFacility?.id === fac.id;
                                const typeLabel = FACILITY_TYPE_SHORT[fac.type] ?? fac.type;
                                return (
                                  <button
                                    key={fac.id}
                                    onClick={() => onFacilitySelect(fac)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                      isSelected
                                        ? 'border-purple-400 bg-purple-50'
                                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                                    }`}
                                  >
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      isSelected ? 'bg-purple-200 text-purple-700' : 'bg-slate-200 text-slate-600'
                                    }`}>{typeLabel}</span>
                                    <span className="text-xs font-semibold flex-1 truncate" style={{ color: 'oklch(0.20 0.012 60)' }}>{fac.name}</span>
                                    {isSelected && <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Validation results */}
                      {validating && (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                          <span className="text-xs text-slate-500">Validating facility resources...</span>
                        </div>
                      )}

                      {validation && !validating && (
                        <div className={`rounded-xl border-2 p-3 space-y-2 ${
                          validation.pass
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-red-200 bg-red-50/50'
                        }`}>
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            {validation.pass
                              ? <><ShieldCheck className="w-4 h-4 text-green-600" /><span className="text-xs font-bold text-green-700">All required resources available</span></>
                              : <><ShieldAlert className="w-4 h-4 text-red-600" /><span className="text-xs font-bold text-red-700">Resource gaps detected</span></>
                            }
                          </div>

                          {/* Per-item results */}
                          <div className="space-y-1">
                            {validation.diagnostics?.map((d: any) => (
                              <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                                {d.status === 'available'
                                  ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  : <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                <Beaker className="w-2.5 h-2.5 text-slate-400" />
                                <span className={d.status === 'available' ? 'text-green-700' : 'text-red-700 font-semibold'}>
                                  {d.name}
                                  {d.status === 'available' && d.turnaround_hours != null ? ` (${d.turnaround_hours}h turnaround)` : ''}
                                  {d.status !== 'available' ? ' — NOT AVAILABLE' : ''}
                                </span>
                              </div>
                            ))}
                            {validation.medications?.map((m: any) => (
                              <div key={m.name} className="flex items-center gap-1.5 text-[11px]">
                                {m.status === 'in_stock'
                                  ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  : m.status === 'low_stock'
                                    ? <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                    : <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                <Pill className="w-2.5 h-2.5 text-slate-400" />
                                <span className={
                                  m.status === 'in_stock' ? 'text-green-700'
                                  : m.status === 'low_stock' ? 'text-amber-700 font-semibold'
                                  : 'text-red-700 font-semibold'
                                }>
                                  {m.name}
                                  {m.status === 'in_stock' ? ` (${m.quantity} in stock)` : ''}
                                  {m.status === 'low_stock' ? ` — LOW STOCK (${m.quantity} units)` : ''}
                                  {m.status === 'out_of_stock' || m.status === 'not_found' ? ' — OUT OF STOCK' : ''}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Alternative facility suggestion */}
                          {validation.suggested_facility && (
                            <button
                              onClick={() => {
                                const alt = facilities.find((f: any) => f.id === validation.suggested_facility.id);
                                if (alt) onFacilitySelect(alt);
                              }}
                              className="w-full text-left mt-1 px-2.5 py-2 rounded-lg bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
                            >
                              <p className="text-[10px] font-bold text-blue-600 uppercase">💡 Suggested Alternative</p>
                              <p className="text-xs text-blue-800 font-semibold">{validation.suggested_facility.name}</p>
                              <p className="text-[10px] text-blue-600 mt-0.5">Has all required resources → tap to switch</p>
                            </button>
                          )}

                          {/* Override checkbox for failed validation */}
                          {!validation.pass && (
                            <label className="flex items-start gap-2 mt-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={overrideWarning}
                                onChange={e => setOverrideWarning(e.target.checked)}
                                className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-[11px] text-red-600 leading-tight">
                                I understand the risks. Proceed with referral despite missing resources.
                              </span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Doctor-to-Doctor mode ── */}
                  {refMode === 'doctor' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                        Select Doctor
                      </label>
                      {doctorsLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        </div>
                      ) : doctors.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No other doctors found.</p>
                      ) : (
                        <div className="space-y-2">
                          {doctors.map((doc) => {
                            const isSelected = selectedDoctor?.id === doc.id;
                            return (
                              <button
                                key={doc.id}
                                onClick={() => setSelectedDoctor(doc)}
                                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                  isSelected
                                    ? 'border-purple-400 bg-purple-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                  isSelected ? 'bg-purple-200 text-purple-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {doc.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                                    {doc.full_name}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate">{doc.specialty}</p>
                                </div>
                                {isSelected && (
                                  <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Urgency — shared */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Urgency</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'routine',   label: 'Routine',   color: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
                        { value: 'urgent',    label: 'Urgent',    color: 'border-amber-300 text-amber-700 bg-amber-50' },
                        { value: 'emergency', label: 'Emergency', color: 'border-red-300 text-red-700 bg-red-50' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setRefUrgency(opt.value)}
                          className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                            refUrgency === opt.value
                              ? opt.color + ' border-opacity-100'
                              : 'border-slate-200 text-slate-400 bg-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason — shared */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      {refMode === 'doctor' ? 'Reason for Referral' : 'Reason for Referral'}
                    </label>
                    <Textarea
                      value={refReason}
                      onChange={e => setRefReason(e.target.value)}
                      placeholder={
                        refMode === 'doctor'
                          ? 'Why are you referring to this doctor? Clinical notes for them...'
                          : 'Clinical reason for specialist referral...'
                      }
                      className="text-sm min-h-[90px] resize-none border-slate-200"
                    />
                  </div>

                  <Button
                    onClick={sendReferral}
                    disabled={
                      refSending ||
                      !refReason.trim() ||
                      (refMode === 'specialist' ? !refService : !selectedDoctor) ||
                      (refMode === 'specialist' && validation && !validation.pass && !overrideWarning)
                    }
                    className={`w-full h-11 font-semibold ${
                      validation && !validation.pass && overrideWarning
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {refSending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                      : validation && !validation.pass && overrideWarning
                        ? <><AlertTriangle className="w-4 h-4 mr-2" />Create Referral (Override)</>
                        : <><Send className="w-4 h-4 mr-2" />{refMode === 'doctor' ? 'Refer to Doctor' : 'Create Referral'}</>}
                  </Button>
                </div>
              )}

            </div>
          )}

          {/* ── INSTRUCTIONS TAB ─────────────────────────────────────── */}
          {tab === 'instructions' && (
            <div className="p-4 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Patient Instructions</p>
                <p className="text-xs text-slate-400 mb-2">What should the patient do? (e.g., "Get CBC blood test", "Visit District Hospital on Monday", "Take rest for 3 days")</p>
                <Textarea
                  placeholder="Type instructions for the patient..."
                  value={patientInstructions}
                  onChange={e => setPatientInstructions(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">ASHA Worker Instructions</p>
                <p className="text-xs text-slate-400 mb-2">What should the ASHA worker follow up on? (e.g., "Monitor BP weekly for 4 weeks", "Ensure patient completes medication course")</p>
                <Textarea
                  placeholder="Type follow-up instructions for the ASHA worker..."
                  value={ashaInstructions}
                  onChange={e => setAshaInstructions(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
              <p className="text-xs text-slate-400 text-center">These instructions will be sent as notifications when you complete the consultation.</p>
            </div>
          )}
        </div>

        {/* ── Complete button — always pinned at bottom ─────────────── */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
          <Button
            onClick={complete}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-semibold rounded-xl"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              : <><CheckCircle className="w-4 h-4 mr-2" />Complete Consultation</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
