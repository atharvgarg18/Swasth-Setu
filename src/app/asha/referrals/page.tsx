'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, MapPin } from 'lucide-react';

export default function ReferralTracking() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    async function fetchReferrals() {
      setLoading(true);
      // We join patients to filter by assigned_worker_id,
      // and we alias facilities to get source and destination names.
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          patients!inner(id, full_name),
          source_facility:facilities!source_facility_id(name),
          destination_facility:facilities!destination_facility_id(name)
        `)
        .eq('patients.assigned_worker_id', user!.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReferrals(data);
      } else {
        console.error('Failed to load referrals', error);
      }
      setLoading(false);
    }

    fetchReferrals();
  }, [user, supabase]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('asha.dashboard.recentReferrals')}</h1>
        <p className="text-muted-foreground">Track ongoing and past referrals for your assigned patients.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : referrals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No referrals found for your patients.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {referrals.map(ref => (
            <Card key={ref.id}>
              <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <Link href={`/asha/patients/${ref.patients.id}`} className="font-semibold text-lg hover:underline">
                      {ref.patients.full_name}
                    </Link>
                    <StatusBadge status={{ kind: 'referral', value: ref.status }} />
                    {ref.urgency !== 'routine' && (
                      <StatusBadge status={{ kind: 'priority', value: ref.urgency }} />
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="truncate max-w-[150px]">{ref.source_facility?.name || 'Unknown'}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium truncate max-w-[150px]">{ref.destination_facility?.name || 'Unknown'}</span>
                    </div>
                  </div>

                  {ref.reason && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      <span className="font-medium">Reason:</span> {ref.reason}
                    </p>
                  )}
                </div>

                <div className="text-sm text-muted-foreground whitespace-nowrap text-right flex flex-col justify-between">
                  <p>Created: {new Date(ref.created_at).toLocaleDateString()}</p>
                  <p className="mt-2 text-xs font-mono">{ref.referral_number}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
