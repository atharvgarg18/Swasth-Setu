'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: p } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      if (p) {
        const { data: rx } = await supabase.from('prescriptions')
          .select('*, doctor:profiles!prescriptions_prescribed_by_fkey(full_name)')
          .eq('patient_id', p.id)
          .order('created_at', { ascending: false });
        if (rx) setPrescriptions(rx);
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.prescriptions.title')}</h1>
      {prescriptions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('common.no_data')}</CardContent></Card>
      ) : (
        <div className="grid gap-6">
          {prescriptions.map(rx => (
            <Card key={rx.id}>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between">
                  <span>{new Date(rx.created_at).toLocaleDateString()}</span>
                  <span className="text-sm font-normal text-muted-foreground">{t('patient.prescriptions.doctor')}: {(rx.doctor as any)?.full_name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(rx.medications || []).map((med: any, idx: number) => (
                    <div key={idx} className="border-b pb-2 last:border-0">
                      <p className="font-semibold">{med.name}</p>
                      <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                        <p>{t('patient.prescriptions.dosage')}: {med.dosage}</p>
                        <p>{t('patient.prescriptions.frequency')}: {med.frequency}</p>
                        <p>{t('patient.prescriptions.duration')}: {med.duration}</p>
                        <p>{t('patient.prescriptions.instructions')}: {med.instructions}</p>
                      </div>
                    </div>
                  ))}
                  {rx.notes && (
                    <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium">{t('patient.prescriptions.notes')}</p>
                      <p className="text-sm mt-1">{rx.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
