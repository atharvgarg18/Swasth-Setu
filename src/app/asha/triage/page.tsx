'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { evaluateTriage, SYMPTOM_CATALOG, getSymptomCategories } from '@/lib/triage/engine';
import type { TriageSymptom, TriageInput, TriageResult } from '@/lib/triage/engine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Activity, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
// import { EmergencyAllocationCard } from '@/components/emergency/EmergencyAllocationCard';

export default function TriageWizard() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [vitals, setVitals] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    spo2: '',
    bloodSugar: '',
    respiratoryRate: '',
  });
  const [durationDays, setDurationDays] = useState('1');
  const [notes, setNotes] = useState('');
  
  const [result, setResult] = useState<TriageResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadPatients() {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('assigned_worker_id', user!.id)
        .order('full_name');
      if (data) setPatients(data);
    }
    loadPatients();
  }, [user, supabase]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleEvaluate = async () => {
    if (!selectedPatient) return;

    const age = Math.floor((Date.now() - new Date(selectedPatient.date_of_birth).getTime()) / 31557600000);
    
    const riskFactors = {
      age,
      gender: selectedPatient.gender,
      isPregnant: false, // Would be collected in a real form
      hasHypertension: selectedPatient.chronic_conditions?.includes('hypertension') || false,
      hasDiabetes: selectedPatient.chronic_conditions?.includes('diabetes') || false,
      hasHeartCondition: selectedPatient.chronic_conditions?.includes('heart_disease') || false,
      hasAsthma: selectedPatient.chronic_conditions?.includes('asthma') || false,
      isChild: age < 5,
      isElderly: age > 65,
      chronicConditions: selectedPatient.chronic_conditions || [],
      allergies: selectedPatient.allergies || [],
    };

    const symptomsObj = SYMPTOM_CATALOG.filter(s => selectedSymptoms.includes(s.id));

    const vitalsObj = {
      bloodPressureSystolic: vitals.bloodPressureSystolic ? parseInt(vitals.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: vitals.bloodPressureDiastolic ? parseInt(vitals.bloodPressureDiastolic) : undefined,
      heartRate: vitals.heartRate ? parseInt(vitals.heartRate) : undefined,
      temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
      spo2: vitals.spo2 ? parseInt(vitals.spo2) : undefined,
      bloodSugar: vitals.bloodSugar ? parseFloat(vitals.bloodSugar) : undefined,
      respiratoryRate: vitals.respiratoryRate ? parseInt(vitals.respiratoryRate) : undefined,
    };

    const input: TriageInput = {
      symptoms: symptomsObj,
      riskFactors,
      vitalSigns: vitalsObj,
      durationDays: parseInt(durationDays) || 1,
      additionalNotes: notes,
    };

    const triageResult = evaluateTriage(input);
    setResult(triageResult);
    setStep(5);

    // Save to database
    setSaving(true);
    await supabase.from('triage_sessions').insert({
      patient_id: selectedPatient.id,
      initiated_by: user!.id,
      symptoms: symptomsObj,
      risk_factors: riskFactors,
      severity: triageResult.severity,
      routing_recommendation: triageResult.routing,
      routing_reason: triageResult.reason,
      rules_applied: triageResult.rulesApplied,
      notes: notes,
    });
    setSaving(false);
  };

  const categories = getSymptomCategories();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Triage Wizard</h1>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${step === i ? 'bg-emerald-600 text-white' : step > i ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                {step > i ? <CheckCircle2 className="h-4 w-4" /> : i}
              </div>
              {i < 5 && <div className={`h-1 w-8 sm:w-16 ${step > i ? 'bg-emerald-200' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Patient</CardTitle>
            <CardDescription>Choose the patient you are assessing</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedPatientId} onValueChange={(v) => setSelectedPatientId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleNext} disabled={!selectedPatientId}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Symptoms</CardTitle>
            <CardDescription>Select all symptoms the patient is experiencing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto">
            {categories.map(category => {
              const catSymptoms = SYMPTOM_CATALOG.filter(s => s.category === category.id);
              if (catSymptoms.length === 0) return null;
              return (
                <div key={category.id} className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    {category.name[locale as 'en' | 'mr'] || category.name.en}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catSymptoms.map(symptom => (
                      <div key={symptom.id} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50 cursor-pointer" onClick={() => toggleSymptom(symptom.id)}>
                        <Checkbox 
                          id={symptom.id} 
                          checked={selectedSymptoms.includes(symptom.id)}
                          onCheckedChange={() => toggleSymptom(symptom.id)}
                        />
                        <Label htmlFor={symptom.id} className="cursor-pointer flex-1">
                          {symptom.name[locale as 'en' | 'mr'] || symptom.name.en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="outline" onClick={handlePrev}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext} disabled={selectedSymptoms.length === 0}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Vital Signs (Optional)</CardTitle>
            <CardDescription>Enter any available vital signs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BP Systolic (mmHg)</Label>
                <Input type="number" value={vitals.bloodPressureSystolic} onChange={e => setVitals({...vitals, bloodPressureSystolic: e.target.value})} placeholder="120" />
              </div>
              <div className="space-y-2">
                <Label>BP Diastolic (mmHg)</Label>
                <Input type="number" value={vitals.bloodPressureDiastolic} onChange={e => setVitals({...vitals, bloodPressureDiastolic: e.target.value})} placeholder="80" />
              </div>
              <div className="space-y-2">
                <Label>Heart Rate (bpm)</Label>
                <Input type="number" value={vitals.heartRate} onChange={e => setVitals({...vitals, heartRate: e.target.value})} placeholder="72" />
              </div>
              <div className="space-y-2">
                <Label>Temperature (°C)</Label>
                <Input type="number" step="0.1" value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: e.target.value})} placeholder="37.0" />
              </div>
              <div className="space-y-2">
                <Label>SpO2 (%)</Label>
                <Input type="number" value={vitals.spo2} onChange={e => setVitals({...vitals, spo2: e.target.value})} placeholder="98" />
              </div>
              <div className="space-y-2">
                <Label>Respiratory Rate (bpm)</Label>
                <Input type="number" value={vitals.respiratoryRate} onChange={e => setVitals({...vitals, respiratoryRate: e.target.value})} placeholder="16" />
              </div>
              <div className="space-y-2">
                <Label>Blood Sugar (mg/dL)</Label>
                <Input type="number" value={vitals.bloodSugar} onChange={e => setVitals({...vitals, bloodSugar: e.target.value})} placeholder="100" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="outline" onClick={handlePrev}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Duration & Notes</CardTitle>
            <CardDescription>How long have the symptoms persisted?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Duration (Days)</Label>
              <Input type="number" min="1" value={durationDays} onChange={e => setDurationDays(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea 
                placeholder="Any other observations..." 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="outline" onClick={handlePrev}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleEvaluate} className="bg-emerald-600 hover:bg-emerald-700">
              <Activity className="mr-2 h-4 w-4" /> Evaluate Triage
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 5 && result && (
        <div className="space-y-6">
          <Card className={`border-l-8 ${result.severity === 'emergency' ? 'border-l-red-500' : result.severity === 'moderate' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.severity === 'emergency' && <AlertTriangle className="h-6 w-6 text-red-500" />}
                Triage Result: <span className="uppercase">{result.severity}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-md">
                <p className="font-medium text-lg mb-2">Recommendation:</p>
                <p className="text-slate-700">{locale === 'mr' ? result.reasonMr : result.reason}</p>
                <p className="mt-2 text-sm text-slate-500 font-mono">Routing: {result.routing.toUpperCase()}</p>
              </div>

              {result.severity === 'emergency' && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mt-4">
                  <h4 className="font-bold mb-2 flex items-center"><AlertTriangle className="h-4 w-4 mr-2" /> Emergency Protocol Active</h4>
                  <p className="mb-4">Please coordinate immediate transfer or emergency response for this patient.</p>
                  {/* Note: In a complete implementation, we would show the EmergencyAllocationCard here. 
                      Since it's not provided in the prompt's source files, we provide a placeholder button. */}
                  <Button variant="destructive">
                    Allocate Emergency Resources
                  </Button>
                </div>
              )}

              {result.severity === 'moderate' && (
                <div className="mt-4">
                  <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => router.push('/asha/consultations/new')}>
                    Request Doctor Consultation
                  </Button>
                </div>
              )}

              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Rules Applied:</h4>
                <ul className="text-sm space-y-1 text-slate-600 list-disc pl-5">
                  {result.rulesApplied.filter(r => r.matched).map(r => (
                    <li key={r.id}>{r.reason}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="border-t p-6">
              <Button variant="outline" className="w-full">
                <Link href="/asha">Return to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
