'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ReferralDetailPage() {
  const params = useParams();
  const { t } = useI18n();
  const supabase = createClient();
  const [referral, setReferral] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!params.id) return;
      const { data: ref } = await supabase.from('referrals')
        .select('*, source_facility:facilities!referrals_source_facility_id_fkey(name), destination_facility:facilities!referrals_destination_facility_id_fkey(name), doctor:profiles!referrals_referred_by_fkey(full_name)')
        .eq('id', params.id as string).single();
      
      if (ref) {
        setReferral(ref);
        const { data: hist } = await supabase.from('referral_status_history')
          .select('*').eq('referral_id', ref.id).order('changed_at', { ascending: false });
        if (hist) setHistory(hist);
      }
      setLoading(false);
    }
    load();
  }, [params.id, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;
  if (!referral) return <div className="p-8 text-center text-muted-foreground">{t('common.no_data')}</div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.referrals.detail')}</h1>
        <StatusBadge status={{ kind: 'referral', value: referral.status }} />
      </div>
      <Card>
        <CardHeader><CardTitle>{t('patient.referrals.info')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.source')}</p><p className="font-medium">{(referral.source_facility as any)?.name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.destination')}</p><p className="font-medium">{(referral.destination_facility as any)?.name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.doctor')}</p><p className="font-medium">{(referral.doctor as any)?.full_name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.urgency')}</p><StatusBadge status={{ kind: 'priority', value: referral.urgency }} className="mt-1" /></div>
          <div className="col-span-1 md:col-span-2"><p className="text-sm text-muted-foreground">{t('patient.referrals.reason')}</p><p className="font-medium">{referral.reason}</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('patient.referrals.timeline')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {history.length ? history.map(h => (
            <div key={h.id} className="border-l-2 border-emerald-200 pl-4 py-2">
              <p className="text-sm text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</p>
              <div className="flex gap-2 items-center">
                <StatusBadge status={{ kind: 'referral', value: h.from_status }} size="sm" />
                <span>→</span>
                <StatusBadge status={{ kind: 'referral', value: h.to_status }} size="sm" />
              </div>
              {h.notes && <p className="text-sm mt-1">{h.notes}</p>}
            </div>
          )) : <p className="text-muted-foreground">{t('common.no_data')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
