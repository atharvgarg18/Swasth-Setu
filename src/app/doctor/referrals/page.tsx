'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DoctorReferrals() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: refs } = await supabase.from('referrals')
        .select('*, patient:patients(full_name), dest:facilities!referrals_destination_facility_id_fkey(name)')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false });
      if (refs) setReferrals(refs);
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('doctor.referrals.title')}</h1>
      {referrals.length === 0 ? <p className="text-muted-foreground">{t('common.no_data')}</p> : (
        <div className="grid gap-4">
          {referrals.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{(r.patient as any)?.full_name}</h3>
                  <StatusBadge status={{ kind: 'referral', value: r.status }} />
                </div>
                <p className="text-sm"><strong>{t('doctor.referrals.destination')}:</strong> {(r.dest as any)?.name}</p>
                <p className="text-sm"><strong>{t('doctor.referrals.reason')}:</strong> {r.reason}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
