'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Pill, ClipboardList, Star, Home, ArrowRightLeft } from 'lucide-react';

export default function ConsultationSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      try {
        const res = await fetch('/api/consultations/' + id);
        if (res.ok) {
          const json = await res.json();
          if (json.consultation) setConsultation(json.consultation);
          if (json.prescription?.medications) setPrescriptions(json.prescription.medications);
          if (json.referrals) setReferrals(json.referrals);
        }
      } catch (err) {
        console.error('Failed to load summary:', err);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-11 h-11 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Consultation Summary</h1>
          <p className="text-slate-500 text-sm mt-1">
            {consultation?.patient?.full_name && `Report for ${consultation.patient.full_name}`}
          </p>
        </div>

        {/* Doctor's Observations */}
        {consultation?.clinical_notes ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-100">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-blue-800 text-sm">Doctor's Observations</h2>
            </div>
            <p className="px-4 py-4 text-slate-700 text-sm leading-relaxed">
              {consultation.clinical_notes}
            </p>
          </div>
        ) : null}

        {/* Diagnosis */}
        {consultation?.assessment ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
              <Star className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-amber-800 text-sm">Diagnosis / Assessment</h2>
            </div>
            <p className="px-4 py-4 text-slate-700 text-sm leading-relaxed">
              {consultation.assessment}
            </p>
          </div>
        ) : null}

        {/* Prescription */}
        {prescriptions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border-b border-emerald-100">
              <Pill className="w-4 h-4 text-emerald-600" />
              <h2 className="font-semibold text-emerald-800 text-sm">Prescription</h2>
            </div>
            <div className="px-4 py-3 space-y-2">
              {prescriptions.map((med: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-800">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{med.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {[med.dosage, med.frequency, med.duration ? med.duration + ' days' : ''].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referrals */}
        {referrals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border-b border-purple-100">
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-purple-800 text-sm">Specialist Referral</h2>
            </div>
            <div className="px-4 py-3 space-y-2">
              {referrals.map((ref: any, i: number) => (
                <div key={i} className="p-3 bg-purple-50 rounded-xl">
                  <p className="font-semibold text-slate-800">{ref.service}</p>
                  <p className="text-slate-500 text-xs mt-0.5 capitalize">Priority: {ref.urgency}</p>
                  {ref.reason && <p className="text-slate-600 text-sm mt-1">{ref.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback */}
        {!consultation?.clinical_notes && !consultation?.assessment && prescriptions.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
            <p className="text-slate-500 text-sm">The doctor has completed the consultation. Please follow up as advised.</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => router.push('/patient/prescriptions')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
          >
            <Pill className="w-4 h-4 mr-2" />View All Prescriptions
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/patient')}
            className="w-full h-12"
          >
            <Home className="w-4 h-4 mr-2" />Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
