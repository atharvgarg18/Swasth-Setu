'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { allocateEmergencyResources } from '@/lib/emergency/allocator';
import type { EmergencyAllocation } from '@/lib/emergency/allocator';
import { EmergencyAllocationCard } from '@/components/emergency/EmergencyAllocationCard';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const SOS_SYMPTOMS = ['chest_pain', 'difficulty_breathing', 'unconscious', 'severe_headache', 'heavy_bleeding', 'high_fever'];

export default function PatientSOSPage() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const supabase = createClient();
  const isMr = locale === 'mr';

  const [phase, setPhase] = useState<'confirm' | 'allocating' | 'done'>('confirm');
  const [allocation, setAllocation] = useState<EmergencyAllocation | null>(null);
  const [patientRecord, setPatientRecord] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('patients').select('id,full_name,address').eq('user_id', user.id).single().then(({ data }) => { if (data) setPatientRecord(data); });
  }, [user]);

  const triggerSOS = async () => {
    if (!patientRecord) return;
    setPhase('allocating');
    const district = typeof patientRecord.address === 'object' ? (patientRecord.address?.district ?? 'pune') : 'pune';
    const alloc = await allocateEmergencyResources(patientRecord.id, SOS_SYMPTOMS, district, supabase);
    setAllocation(alloc);
    setPhase('done');
  };

  if (phase === 'confirm') return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 px-4 text-center pb-8">
      <div className="w-28 h-28 rounded-full bg-red-100 border-4 border-red-300 flex items-center justify-center animate-pulse">
        <AlertTriangle className="w-14 h-14 text-red-600" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-red-700">{isMr ? 'आपत्कालीन SOS' : 'Emergency SOS'}</h1>
        <p className="text-slate-600 text-base max-w-xs mx-auto">
          {isMr
            ? 'हे बटण दाबल्यावर रुग्णवाहिका, रुग्णालयातील खाट आणि डॉक्टर लगेच नियुक्त केले जातील.'
            : 'Pressing this will immediately allocate an ambulance, hospital bed, and doctor for you.'}
        </p>
      </div>
      <div className="space-y-3 w-full max-w-xs">
        <Button onClick={triggerSOS} disabled={!patientRecord}
          className="w-full h-16 text-xl bg-red-600 hover:bg-red-700 rounded-2xl shadow-lg shadow-red-200">
          <AlertTriangle className="w-6 h-6 mr-3" />
          {isMr ? 'मला आपत्कालीन मदत हवी आहे' : 'I Need Emergency Help'}
        </Button>
        <a href="tel:108" className="block">
          <Button variant="outline" className="w-full h-12 border-red-300 text-red-700 hover:bg-red-50">
            <Phone className="w-5 h-5 mr-2" />
            {isMr ? '108 वर थेट कॉल करा' : 'Call 108 Directly'}
          </Button>
        </a>
        <Link href="/patient">
          <Button variant="ghost" className="w-full text-slate-500">
            <ChevronLeft className="w-4 h-4 mr-1" />{isMr ? 'मागे जा' : 'Go Back'}
          </Button>
        </Link>
      </div>
    </div>
  );

  if (phase === 'allocating') return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 text-center px-4">
      <div className="w-24 h-24 rounded-full bg-red-100 border-4 border-red-300 flex items-center justify-center animate-pulse">
        <AlertTriangle className="w-12 h-12 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-red-700">{isMr ? 'मदत पाठवत आहे...' : 'Sending Help...'}</h2>
      <p className="text-slate-500 text-sm max-w-xs">
        {isMr ? 'रुग्णालय, रुग्णवाहिका आणि डॉक्टर नियुक्त करत आहे' : 'Allocating hospital, ambulance, and doctor'}
      </p>
      <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
    </div>
  );

  return (
    <div className="pb-8">
      {allocation ? (
        <EmergencyAllocationCard allocation={allocation} patientName={patientRecord?.full_name ?? 'Patient'} />
      ) : (
        <div className="text-center space-y-4 py-12 px-4">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-red-800">{isMr ? 'ऑफलाइन आहे. 108 वर कॉल करा.' : 'Offline. Call 108 immediately.'}</h2>
          <a href="tel:108"><Button className="bg-red-600 hover:bg-red-700 w-full h-12 text-lg"><Phone className="w-5 h-5 mr-2" />108</Button></a>
        </div>
      )}
    </div>
  );
}
