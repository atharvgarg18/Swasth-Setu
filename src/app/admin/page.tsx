'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Users, Activity, Building2, TrendingUp, HeartPulse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';

interface DashboardMetrics {
  totalPatients: number;
  activeReferrals: number;
  pendingFollowUps: number;
  emergencyCases: number;
  stockAlerts: number;
}

export default function AdminDashboardPage() {
  const { district, facilityId, hasRole } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
  const [recentEmergencies, setRecentEmergencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDistrictAdmin = hasRole('district_admin');

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        // Build facility filter
        let facilityFilter: string[] = [];
        if (isDistrictAdmin && district) {
          const { data: facilities } = await supabase
            .from('facilities')
            .select('id')
            .eq('district', district);
          facilityFilter = facilities?.map(f => f.id) || [];
        } else if (facilityId) {
          facilityFilter = [facilityId];
        }

        if (facilityFilter.length === 0) {
          throw new Error('No facilities configured for this admin.');
        }

        // Metrics queries
        const [
          { count: patientsCount },
          { count: referralsCount },
          { count: followUpsCount },
          { count: emergenciesCount },
          { count: stockAlertsCount }
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }).in('registered_facility_id', facilityFilter),
          supabase.from('referrals').select('*', { count: 'exact', head: true }).in('status', ['created', 'pending', 'acknowledged', 'in_transit', 'arrived', 'in_treatment']).in('source_facility_id', facilityFilter),
          supabase.from('follow_ups').select('*', { count: 'exact', head: true }).in('status', ['upcoming', 'due', 'overdue']), // Note: need join if filtering by facility
          supabase.from('emergency_cases').select('*', { count: 'exact', head: true }).in('status', ['reported', 'escalated', 'facility_notified', 'accepted', 'in_transit', 'arrived', 'treating']).in('target_facility_id', facilityFilter),
          supabase.from('medicine_stock').select('*', { count: 'exact', head: true }).in('status', ['low_stock', 'out_of_stock']).in('facility_id', facilityFilter)
        ]);

        setMetrics({
          totalPatients: patientsCount || 0,
          activeReferrals: referralsCount || 0,
          pendingFollowUps: followUpsCount || 0,
          emergencyCases: emergenciesCount || 0,
          stockAlerts: stockAlertsCount || 0,
        });

        // Recent Referrals
        const { data: refs } = await supabase
          .from('referrals')
          .select('id, referral_number, urgency, status, created_at, patients(full_name), facilities!referrals_destination_facility_id_fkey(name)')
          .in('source_facility_id', facilityFilter)
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentReferrals(refs || []);

        // Recent Emergencies
        const { data: emergencies } = await supabase
          .from('emergency_cases')
          .select('id, severity, status, created_at, patients(full_name)')
          .in('target_facility_id', facilityFilter)
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentEmergencies(emergencies || []);

      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [district, facilityId, isDistrictAdmin, supabase]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h3 className="font-bold">Error loading dashboard</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.dashboard', 'Admin Dashboard')}</h1>
        <p className="text-gray-500">
          {isDistrictAdmin 
            ? t('admin.district_overview', 'District Overview: {district}').replace('{district}', district || '')
            : t('admin.facility_overview', 'Facility Overview')}
        </p>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <Button variant="outline" className="shrink-0">
          <Link href="/admin/facilities"><Building2 className="mr-2 h-4 w-4" /> Facilities</Link>
        </Button>
        <Button variant="outline" className="shrink-0">
          <Link href="/admin/referrals"><TrendingUp className="mr-2 h-4 w-4" /> Referrals</Link>
        </Button>
        <Button variant="outline" className="shrink-0">
          <Link href="/admin/analytics"><Activity className="mr-2 h-4 w-4" /> Analytics</Link>
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.total_patients', 'Total Patients')}</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.active_referrals', 'Active Referrals')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeReferrals}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-red-50/50 rounded-t-lg">
            <CardTitle className="text-sm font-medium text-red-800">{t('admin.emergencies', 'Emergency Cases')}</CardTitle>
            <HeartPulse className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{metrics?.emergencyCases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.stock_alerts', 'Stock Alerts')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.stockAlerts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.pending_follow_ups', 'Pending Follow-ups')}</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingFollowUps}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Referrals */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.recent_referrals', 'Recent Referrals')}</CardTitle>
            <CardDescription>{t('admin.recent_referrals_desc', 'Latest outgoing referrals')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReferrals.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No recent referrals.</p>
            ) : (
              <div className="space-y-4">
                {recentReferrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{ref.patients?.full_name || 'Unknown Patient'}</p>
                      <p className="text-xs text-gray-500">To: {ref.facilities?.name || 'Unknown Facility'}</p>
                      <p className="text-xs text-gray-400">{new Date(ref.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={ref.urgency === 'emergency' ? 'destructive' : 'secondary'}>
                        {ref.urgency}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{ref.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button variant="link" className="p-0">
                <Link href="/admin/referrals">View all referrals &rarr;</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Emergencies */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.recent_emergencies', 'Recent Emergencies')}</CardTitle>
            <CardDescription>{t('admin.recent_emergencies_desc', 'Latest emergency cases')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEmergencies.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No recent emergency cases.</p>
            ) : (
              <div className="space-y-4">
                {recentEmergencies.map((em) => (
                  <div key={em.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{em.patients?.full_name || 'Unknown Patient'}</p>
                      <p className="text-xs text-gray-400">{new Date(em.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="destructive" className="capitalize">
                        {em.severity.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{em.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
