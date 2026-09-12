'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, TrendingUp, AlertTriangle, Users, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnalyticsData {
  facilitiesCount: number;
  totalPatients: number;
  patientsByFacility: { name: string; count: number }[];
  followUpStats: { total: number; completed: number; rate: string };
  referralStats: { total: number; completed: number; avgTimeHours: string };
  stockAlerts: { facility: string; medicine: string; qty: number }[];
}

export default function AnalyticsPage() {
  const { district, facilityId, hasRole } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDistrictAdmin = hasRole('district_admin');

  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        let facilityFilter: string[] = [];
        
        // 1. Get facilities in scope
        let facQuery = supabase.from('facilities').select('id, name');
        if (isDistrictAdmin && district) {
          facQuery = facQuery.eq('district', district);
        } else if (facilityId) {
          facQuery = facQuery.eq('id', facilityId);
        } else {
          throw new Error('No configuration found');
        }

        const { data: facilities } = await facQuery;
        if (!facilities || facilities.length === 0) throw new Error('No facilities found');
        
        facilityFilter = facilities.map(f => f.id);
        const facilityMap = facilities.reduce((acc, f) => ({ ...acc, [f.id]: f.name }), {} as Record<string, string>);

        // 2. Patients by facility
        const patientsByFacility: { name: string; count: number }[] = [];
        let totalPatients = 0;
        
        for (const fId of facilityFilter) {
          const { count } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .eq('registered_facility_id', fId);
          
          if (count !== null) {
            patientsByFacility.push({ name: facilityMap[fId], count });
            totalPatients += count;
          }
        }
        patientsByFacility.sort((a, b) => b.count - a.count);

        // 3. Follow-up stats (using patients registered in these facilities)
        // Simplified approach for demo: get all follow-ups, then filter or just get stats if we can join
        const { data: followUps } = await supabase
          .from('follow_ups')
          .select('status, patients!inner(registered_facility_id)')
          .in('patients.registered_facility_id', facilityFilter);
        
        const totalFollowUps = followUps?.length || 0;
        const completedFollowUps = followUps?.filter(f => f.status === 'completed').length || 0;
        const fuRate = totalFollowUps > 0 ? ((completedFollowUps / totalFollowUps) * 100).toFixed(1) : '0.0';

        // 4. Referral stats
        const { data: referrals } = await supabase
          .from('referrals')
          .select('status, created_at, completed_at')
          .in('source_facility_id', facilityFilter);

        const totalRefs = referrals?.length || 0;
        const completedRefs = referrals?.filter(r => r.status === 'completed') || [];
        
        let avgTimeHours = '0.0';
        if (completedRefs.length > 0) {
          const totalMs = completedRefs.reduce((acc, r) => {
            if (r.completed_at && r.created_at) {
              return acc + (new Date(r.completed_at).getTime() - new Date(r.created_at).getTime());
            }
            return acc;
          }, 0);
          avgTimeHours = (totalMs / completedRefs.length / (1000 * 60 * 60)).toFixed(1);
        }

        // 5. Stock alerts (quantity < 10)
        const { data: stocks } = await supabase
          .from('medicine_stock')
          .select('facility_id, medicine_name, quantity')
          .in('facility_id', facilityFilter)
          .lt('quantity', 10)
          .order('quantity', { ascending: true })
          .limit(10);

        const stockAlerts = stocks?.map(s => ({
          facility: facilityMap[s.facility_id] || 'Unknown',
          medicine: s.medicine_name,
          qty: s.quantity
        })) || [];

        setData({
          facilitiesCount: facilities.length,
          totalPatients,
          patientsByFacility,
          followUpStats: { total: totalFollowUps, completed: completedFollowUps, rate: fuRate },
          referralStats: { total: totalRefs, completed: completedRefs.length, avgTimeHours },
          stockAlerts
        });

      } catch (err: any) {
        console.error('Analytics Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [district, facilityId, isDistrictAdmin, supabase]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h3 className="font-bold">Error</h3>
        <p>{error || 'Failed to load analytics'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <PieChart className="h-8 w-8 text-emerald-600" />
          {t('admin.analytics', 'District Analytics')}
        </h1>
        <p className="text-gray-500">Key performance indicators across {data.facilitiesCount} facilities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Registration Stats */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
              <Users className="h-5 w-5" /> Patient Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-blue-900 mb-4">{data.totalPatients}</div>
            <div className="space-y-2">
              {data.patientsByFacility.slice(0, 4).map((f, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-blue-700 truncate pr-2">{f.name}</span>
                  <span className="font-medium bg-white px-2 py-0.5 rounded text-blue-900">{f.count}</span>
                </div>
              ))}
              {data.patientsByFacility.length > 4 && (
                <div className="text-xs text-blue-600 italic">+{data.patientsByFacility.length - 4} more facilities</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Follow-up Stats */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Follow-up Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-black text-emerald-900">{data.followUpStats.rate}%</span>
              <span className="text-sm text-emerald-700">completion rate</span>
            </div>
            <div className="space-y-3">
              <div className="w-full bg-emerald-200 rounded-full h-2.5">
                <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${data.followUpStats.rate}%` }}></div>
              </div>
              <div className="flex justify-between text-sm text-emerald-800 font-medium">
                <span>{data.followUpStats.completed} Completed</span>
                <span>{data.followUpStats.total} Total</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Stats */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Referral Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-3xl font-black text-purple-900">{data.referralStats.total}</div>
                <div className="text-xs font-medium text-purple-700 uppercase tracking-wider">Total Refs</div>
              </div>
              <div>
                <div className="text-3xl font-black text-purple-900">{data.referralStats.completed}</div>
                <div className="text-xs font-medium text-purple-700 uppercase tracking-wider">Completed</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200 flex items-center justify-between">
              <span className="text-sm font-medium text-purple-800">Avg Turnaround</span>
              <Badge variant="secondary" className="bg-white text-purple-900 flex items-center gap-1">
                <Clock className="h-3 w-3"/> {data.referralStats.avgTimeHours} hrs
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Stock Alerts */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" /> Critical Stock Alerts (Qty &lt; 10)
          </CardTitle>
          <CardDescription>Medicines requiring immediate restocking</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.stockAlerts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No critical stock alerts.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.stockAlerts.map((alert, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-semibold text-gray-900">{alert.medicine}</div>
                    <div className="text-sm text-gray-500">{alert.facility}</div>
                  </div>
                  <Badge variant="destructive" className="px-3 py-1 text-sm">
                    Qty: {alert.qty}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
