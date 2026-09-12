'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { evaluateTriage, SYMPTOM_CATALOG } from '@/lib/triage/engine';
import type { TriageSymptom, TriageInput, TriageResult } from '@/lib/triage/engine';
import { allocateEmergencyResources } from '@/lib/emergency/allocator';
import type { EmergencyAllocation } from '@/lib/emergency/allocator';
import { EmergencyAllocationCard } from '@/components/emergency/EmergencyAllocationCard';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Phone, Stethoscope, ChevronRight, ChevronLeft, Loader2, Heart, Thermometer, Wind, Brain, Baby, Activity, Bone, Video } from 'lucide-react';
import Link from 'next/link';

const CATEGORY_ICONS: Record<string, React.ElementType> = { cardiac: Heart, respiratory: Wind, neurological: Brain, fever: Thermometer, maternal: Baby, trauma: Bone, default: Activity };
const CATEGORY_LABELS: Record<string, { en: string; mr: string }> = {
  cardiac: { en: 'Heart & Chest', mr: 'हृदय व छाती' },
  respiratory: { en: 'Breathing', mr: 'श्वास' },
  neurological: { en: 'Head & Brain', mr: 'डोके व मेंदू' },
  fever: { en: 'Fever & Infection', mr: 'ताप व संसर्ग' },
  maternal: { en: 'Pregnancy', mr: 'गर्भारपण' },
  trauma: { en: 'Injury & Pain', mr: 'दुखापत व वेदना' },
  gastrointestinal: { en: 'Stomach', mr: 'पोट' },
  obstetric: { en: 'Pregnancy Danger', mr: 'गर्भारपण धोका' },
  eye: { en: 'Eye Problems', mr: 'डोळे' },
};
const DURATION_OPTIONS = [
  { value: 1, en: 'Today (less than 1 day)', mr: 'आज' },
  { value: 2, en: '1–3 days', mr: '1–3 दिवस' },
  { value: 5, en: '3–7 days', mr: '3–7 दिवस' },
  { value: 10, en: 'More than a week', mr: 'एक आठवड्यापेक्षा जास्त' },
];

type Step = 'category' | 'symptoms' | 'duration' | 'result' | 'emergency';

export default function PatientHealthCheckPage() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const isMr = locale === 'mr';

  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<TriageSymptom[]>([]);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [allocation, setAllocation] = useState<EmergencyAllocation | null>(null);
  const [patientRecord, setPatientRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('patients').select('id,full_name,date_of_birth,gender,address,chronic_conditions,allergies').eq('user_id', user.id).single().then(({ data }) => { if (data) setPatientRecord(data); });
  }, [user]);

  const categories = [...new Set(SYMPTOM_CATALOG.map((s: TriageSymptom) => s.category))];
  const categorySymptoms = selectedCategory ? SYMPTOM_CATALOG.filter((s: TriageSymptom) => s.category === selectedCategory) : [];

  const toggleSymptom = (s: TriageSymptom) => setSelectedSymptoms(prev =>
    prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]
  );

  const computeAge = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));


  const startTeleconsult = async () => {
    if (!patientRecord) return;
    setLoading(true);
    // Cancel any stale pending consultations for this patient before creating new one
    await supabase.from('consultations')
      .update({ status: 'cancelled' })
      .eq('patient_id', patientRecord.id)
      .eq('status', 'requested')
      .eq('consultation_type', 'teleconsult_video');

    const { data: consultation } = await supabase.from('consultations').insert({
      patient_id: patientRecord.id,
      consultation_type: 'teleconsult_video',
      status: 'requested',
      priority: 'routine',
      chief_complaint: 'Triage: moderate — patient requested video consultation.',
    }).select('id').single();
    setLoading(false);
    if (consultation?.id) {
      router.push('/patient/consultation/' + consultation.id);
    }
  };

  const runTriage = async () => {
    if (!patientRecord) return;
    setLoading(true);
    const age = patientRecord.date_of_birth ? computeAge(patientRecord.date_of_birth) : 30;
    const conditions: string[] = Array.isArray(patientRecord.chronic_conditions) ? patientRecord.chronic_conditions : [];
    const input: TriageInput = {
      symptoms: selectedSymptoms,
      riskFactors: {
        age, gender: patientRecord.gender ?? 'other',
        isPregnant: conditions.includes('pregnancy'),
        hasHypertension: conditions.includes('hypertension'),
        hasDiabetes: conditions.includes('diabetes'),
        hasHeartCondition: conditions.includes('heart_disease'),
        hasAsthma: conditions.includes('asthma'),
        isChild: age < 5, isElderly: age > 65,
        chronicConditions: conditions,
        allergies: Array.isArray(patientRecord.allergies) ? patientRecord.allergies : [],
      },
      durationDays,
    };
    const result = evaluateTriage(input);
    setTriageResult(result);
    await supabase.from('triage_sessions').insert({
      patient_id: patientRecord.id,
      initiated_by: user?.id,
      symptoms: selectedSymptoms.map(s => ({ id: s.id, name: s.name.en, weight: s.weight })),
      severity: result.severity,
      routing_recommendation: result.routing,
      routing_reason: result.reason,
      rules_applied: result.rulesApplied,
    });
    setLoading(false);
    if (result.routing === 'emergency') { await triggerEmergency(selectedSymptoms.map(s => s.id)); } else { setStep('result'); }
  };

  const triggerEmergency = async (symptomIds: string[]) => {
    if (!patientRecord) return;
    setAllocating(true);
    setStep('emergency');
    const district = typeof patientRecord.address === 'object' ? (patientRecord.address?.district ?? 'pune') : 'pune';
    const alloc = await allocateEmergencyResources(patientRecord.id, symptomIds, district, supabase);
    setAllocation(alloc);
    setAllocating(false);
  };

  const progress: Record<Step, number> = { category: 20, symptoms: 50, duration: 75, result: 100, emergency: 100 };

  if (step === 'category') return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-emerald-800">{isMr ? 'माझी आरोग्य तपासणी' : 'My Health Check'}</h1>
        <p className="text-slate-500 text-sm mt-1">{isMr ? 'तुम्हाला कुठे त्रास होत आहे ते सांगा' : 'Where are you feeling unwell?'}</p>
        <Progress value={progress[step]} className="mt-3 h-2" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat: string) => {
          const Icon = CATEGORY_ICONS[cat] ?? CATEGORY_ICONS.default;
          const label = CATEGORY_LABELS[cat] ?? { en: cat, mr: cat };
          return (
            <button key={cat} onClick={() => { setSelectedCategory(cat); setStep('symptoms'); }}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all text-center active:scale-95">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Icon className="w-6 h-6 text-emerald-700" />
              </div>
              <span className="text-sm font-medium text-slate-800 leading-tight">{isMr ? label.mr : label.en}</span>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <Link href="/patient"><Button variant="ghost" className="text-slate-500"><ChevronLeft className="w-4 h-4 mr-1" />{isMr ? 'मागे' : 'Back'}</Button></Link>
      </div>
    </div>
  );

  if (step === 'symptoms') return (
    <div className="space-y-6 pb-8">
      <div>
        <button onClick={() => setStep('category')} className="flex items-center text-emerald-700 text-sm font-medium mb-3">
          <ChevronLeft className="w-4 h-4 mr-1" />{isMr ? 'बदला' : 'Change'}
        </button>
        <h1 className="text-2xl font-bold text-emerald-800">{isMr ? 'लक्षणे निवडा' : 'Select Symptoms'}</h1>
        <p className="text-slate-500 text-sm mt-1">{isMr ? 'जे जाणवते ते सर्व निवडा' : 'Select everything you feel'}</p>
        <Progress value={progress[step]} className="mt-3 h-2" />
      </div>
      <div className="space-y-3">
        {categorySymptoms.map((symptom: TriageSymptom) => {
          const sel = !!selectedSymptoms.find(s => s.id === symptom.id);
          return (
            <button key={symptom.id} onClick={() => toggleSymptom(symptom)}
              className={"w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all " + (sel ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300")}>
              <div className={"w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center " + (sel ? "border-emerald-500 bg-emerald-500" : "border-slate-300")}>
                {sel && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="font-medium text-slate-800">{isMr ? symptom.name.mr : symptom.name.en}</div>
                {symptom.weight >= 8 && <span className="text-xs text-red-600 font-medium">⚠ {isMr ? 'गंभीर' : 'Serious'}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <Button onClick={() => setStep('duration')} disabled={selectedSymptoms.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base">
        {isMr ? 'पुढे' : 'Continue'} <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );

  if (step === 'duration') return (
    <div className="space-y-6 pb-8">
      <div>
        <button onClick={() => setStep('symptoms')} className="flex items-center text-emerald-700 text-sm font-medium mb-3">
          <ChevronLeft className="w-4 h-4 mr-1" />{isMr ? 'बदला' : 'Change'}
        </button>
        <h1 className="text-2xl font-bold text-emerald-800">{isMr ? 'हे किती दिवसांपासून आहे?' : 'How long have you had this?'}</h1>
        <Progress value={progress[step]} className="mt-3 h-2" />
      </div>
      <div className="space-y-3">
        {DURATION_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setDurationDays(opt.value)}
            className={"w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all " + (durationDays === opt.value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300")}>
            <div className={"w-6 h-6 rounded-full border-2 flex-shrink-0 " + (durationDays === opt.value ? "border-emerald-500 bg-emerald-500" : "border-slate-300")} />
            <span className="font-medium text-slate-800">{isMr ? opt.mr : opt.en}</span>
          </button>
        ))}
      </div>
      <Button onClick={runTriage} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base">
        {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{isMr ? 'तपासत आहे...' : 'Checking...'}</> : <><Stethoscope className="w-5 h-5 mr-2" />{isMr ? 'निकाल बघा' : 'Get Result'}</>}
      </Button>
    </div>
  );

  if (step === 'emergency') return (
    <div className="pb-8">
      {allocating ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-700">{isMr ? 'आपत्कालीन मदत शोधत आहे...' : 'Finding Emergency Help...'}</h2>
          <p className="text-slate-500 text-center text-sm">{isMr ? 'रुग्णालय, रुग्णवाहिका आणि डॉक्टर नियुक्त करत आहे' : 'Allocating hospital, ambulance, and doctor'}</p>
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : allocation ? (
        <EmergencyAllocationCard allocation={allocation} patientName={patientRecord?.full_name ?? 'Patient'} />
      ) : (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
            <h2 className="text-lg font-bold text-red-800">{isMr ? 'आपत्कालीन संपर्क करा' : 'Call Emergency Now'}</h2>
            <a href="tel:108"><Button className="bg-red-600 hover:bg-red-700 w-full h-12 text-lg"><Phone className="w-5 h-5 mr-2" />108</Button></a>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (step === 'result' && triageResult) {
    const isMild = triageResult.severity === 'mild';
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800">{isMr ? 'तपासणी निकाल' : 'Health Check Result'}</h1>
          <Progress value={100} className="mt-3 h-2" />
        </div>
        <Card className={"border-2 " + (isMild ? "border-green-400 bg-green-50" : "border-amber-400 bg-amber-50")}>
          <CardHeader className="pb-2">
            <div className={"w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 " + (isMild ? "bg-green-100" : "bg-amber-100")}>
              {isMild ? <CheckCircle className="w-8 h-8 text-green-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />}
            </div>
            <CardTitle className={"text-center text-xl " + (isMild ? "text-green-800" : "text-amber-800")}>
              {isMild ? (isMr ? 'सौम्य समस्या' : 'Mild Concern') : (isMr ? 'डॉक्टरांना भेटा' : 'See a Doctor Soon')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-slate-700 text-sm text-center">{isMr ? triageResult.reasonMr : triageResult.reason}</p>
            {isMild && (
              <div className="bg-white rounded-lg p-4 border border-green-200 space-y-1">
                <p className="font-medium text-green-800 text-sm">{isMr ? 'घरी करा:' : 'Home care:'}</p>
                <p className="text-sm text-slate-600">• {isMr ? 'भरपूर आराम करा' : 'Rest well'}</p>
                <p className="text-sm text-slate-600">• {isMr ? 'पाणी प्या' : 'Stay hydrated'}</p>
                <p className="text-sm text-slate-600">• {isMr ? 'बरे नाही वाटले तर डॉक्टरांना दाखवा' : 'See a doctor if no improvement in 2–3 days'}</p>
              </div>
            )}
            {!isMild && (
              <div className="space-y-3">
                <Button
                  onClick={startTeleconsult}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-base font-semibold shadow-lg shadow-blue-100 rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Video className="w-6 h-6 mr-2" />}
                  {isMr ? 'डॉक्टरांशी व्हिडिओ कॉल करा' : 'Video Call a Doctor Now'}
                </Button>
                <p className="text-xs text-center text-slate-500">
                  {isMr ? 'आत्ताच उपलब्ध डॉक्टरांशी जोडा' : 'Connect instantly with an available doctor'}
                </p>
                <Link href="/patient/facilities">
                  <Button variant="outline" className="w-full h-10 text-slate-600 text-sm">
                    <Stethoscope className="w-4 h-4 mr-2" />
                    {isMr ? 'किंवा जवळचे रुग्णालय शोधा' : 'Or Find Nearest Facility'}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-3">
            <p className="text-xs text-slate-500 text-center w-full">
              {isMr ? '⚠ हे निदान नाही. आशा कार्यकर्तीशी बोला.' : '⚠ Not a diagnosis. Speak with your ASHA worker.'}
            </p>
          </CardFooter>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-red-800 text-sm">{isMr ? 'स्थिती बिघडली?' : 'Getting worse?'}</p>
              <p className="text-xs text-red-600">{isMr ? 'आपत्कालीन मदत' : 'Emergency help'}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => triggerEmergency(selectedSymptoms.map(s => s.id))}>
              <AlertTriangle className="w-4 h-4 mr-1" />SOS
            </Button>
          </CardContent>
        </Card>
        <Link href="/patient"><Button variant="ghost" className="w-full text-slate-500">{isMr ? 'मुख्यपृष्ठ' : 'Back to Home'}</Button></Link>
      </div>
    );
  }
  return null;
}
