'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function HealthRecordPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: p } = await supabase.from('patients').select('*').eq('user_id', user.id).single();
      if (p) {
        setPatient(p);
        const { data: tl } = await supabase.from('patient_timeline').select('*').eq('patient_id', p.id).order('event_at', { ascending: false });
        if (tl) setTimeline(tl);
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;
  if (!patient) return <div className="p-8 text-center text-muted-foreground">{t('common.no_data')}</div>;

  const age = patient.date_of_birth ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000) : '—';
  const addressStr = patient.address ? [patient.address.village, patient.address.block, patient.address.district].filter(Boolean).join(', ') : '—';

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.health_record.title')}</h1>
      <Card>
        <CardHeader><CardTitle>{t('patient.health_record.demographics')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.name')}</p><p className="font-medium">{patient.full_name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.age')}</p><p className="font-medium">{age}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.gender')}</p><p className="font-medium capitalize">{patient.gender}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.blood_group')}</p><p className="font-medium">{patient.blood_group || '—'}</p></div>
          <div className="col-span-2 md:col-span-4"><p className="text-sm text-muted-foreground">{t('patient.health_record.address')}</p><p className="font-medium">{addressStr}</p></div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('patient.health_record.allergies')}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {patient.allergies?.length ? patient.allergies.map((a: string) => <Badge key={a} variant="destructive">{a}</Badge>) : <span className="text-muted-foreground">{t('common.none')}</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('patient.health_record.conditions')}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {patient.chronic_conditions?.length ? patient.chronic_conditions.map((c: string) => <Badge key={c} variant="secondary">{c}</Badge>) : <span className="text-muted-foreground">{t('common.none')}</span>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{t('patient.health_record.timeline')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {timeline.length ? timeline.map(event => (
            <div key={event.id} className="border-l-2 border-emerald-200 pl-4 py-2">
              <p className="text-sm text-muted-foreground">{new Date(event.event_at).toLocaleDateString()}</p>
              <p className="font-medium">{event.title}</p>
              {event.description && <p className="text-sm text-gray-600">{event.description}</p>}
            </div>
          )) : <p className="text-muted-foreground">{t('common.no_data')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
