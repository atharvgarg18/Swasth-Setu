'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ReferralsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: p } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      if (p) {
        const { data: refs } = await supabase.from('referrals')
          .select('*, source_facility:facilities!referrals_source_facility_id_fkey(name), destination_facility:facilities!referrals_destination_facility_id_fkey(name)')
          .eq('patient_id', p.id)
          .order('created_at', { ascending: false });
        if (refs) setReferrals(refs);
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.referrals.title')}</h1>
      {referrals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('common.no_data')}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {referrals.map(ref => (
            <Card key={ref.id}>
              <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-lg">{ref.service}</span>
                    <StatusBadge status={{ kind: 'referral', value: ref.status }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(ref.source_facility as any)?.name || 'Unknown'} → {(ref.destination_facility as any)?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</p>
                </div>
                <Link href={`/patient/referrals/${ref.id}`}>
                  <Button variant="outline">{t('common.view_details')}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
