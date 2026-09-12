'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, Clock, ArrowRight, UserPlus, FileHeart } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export default function AshaDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    highRiskPatients: 0,
    pendingFollowUps: 0,
  });
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    async function loadDashboard() {
      setLoading(true);
      try {
        // Fetch patient counts
        const { count: totalPatients } = await supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_worker_id', user!.id);

        const { count: highRiskPatients } = await supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_worker_id', user!.id)
          .eq('is_high_risk', true);

        // Fetch pending follow-ups
        const { count: pendingFollowUps } = await supabase
          .from('follow_ups')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_worker_id', user!.id)
          .in('status', ['due', 'overdue']);

        setStats({
          totalPatients: totalPatients || 0,
          highRiskPatients: highRiskPatients || 0,
          pendingFollowUps: pendingFollowUps || 0,
        });

        // Fetch recent referrals
        const { data: referrals } = await supabase
          .from('referrals')
          .select(`
            id,
            status,
            urgency,
            created_at,
            patients!inner(full_name)
          `)
          .eq('patients.assigned_worker_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentReferrals(referrals || []);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('asha.dashboard.title')}</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('asha.dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('asha.dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/asha/patients/new">
              <UserPlus className="mr-2 h-4 w-4" />
              {t('asha.actions.register')}
            </Link>
          </Button>
          <Button variant="outline">
            <Link href="/asha/triage">
              <Activity className="mr-2 h-4 w-4" />
              {t('asha.actions.triage')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('asha.stats.totalPatients')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('asha.stats.highRisk')}</CardTitle>
            <FileHeart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highRiskPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('asha.stats.pendingFollowUps')}</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingFollowUps}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('asha.dashboard.recentReferrals')}</CardTitle>
            <CardDescription>{t('asha.dashboard.recentReferralsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReferrals.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              <div className="space-y-4">
                {recentReferrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ref.patients.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={{ kind: 'priority', value: ref.urgency }} size="sm" />
                      <StatusBadge status={{ kind: 'referral', value: ref.status }} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="link" className="w-full mt-4">
              <Link href="/asha/referrals">
                {t('asha.dashboard.viewAllReferrals')} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('asha.dashboard.quickLinks')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start">
              <Link href="/asha/patients">
                <Users className="mr-2 h-4 w-4" />
                {t('asha.nav.patients')}
              </Link>
            </Button>
            <Button variant="outline" className="justify-start">
              <Link href="/asha/follow-ups">
                <Clock className="mr-2 h-4 w-4" />
                {t('asha.nav.followUps')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
