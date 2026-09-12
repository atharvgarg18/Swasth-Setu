'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DoctorPatients() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      // Get all patients who had consultations with this doctor
      const { data: cons } = await supabase.from('consultations').select('patient_id, patient:patients(*)').eq('doctor_id', user.id);
      
      if (cons) {
        // Unique patients
        const pMap = new Map();
        cons.forEach(c => {
          if (c.patient && !pMap.has(c.patient_id)) {
            pMap.set(c.patient_id, c.patient);
          }
        });
        setPatients(Array.from(pMap.values()));
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('doctor.patients.title')}</h1>
      {patients.length === 0 ? <p className="text-muted-foreground">{t('common.no_data')}</p> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg">{p.full_name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{p.gender} | {p.blood_group || '—'}</p>
                <p className="text-sm mt-2">{p.phone}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
