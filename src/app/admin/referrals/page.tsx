'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowRight, Clock, AlertTriangle } from 'lucide-react';

interface ReferralData {
  id: string;
  referral_number: string;
  patient_id: string;
  source_facility_id: string;
  destination_facility_id: string;
  urgency: string;
  status: string;
  expected_arrival: string | null;
  created_at: string;
  patients: { full_name: string } | null;
  facilities: { name: string } | null; // Dest facility
  source_facility: { name: string } | null;
}

const STATUS_PIPELINE = [
  'created',
  'pending',
  'acknowledged',
  'in_transit',
  'arrived',
  'in_treatment',
  'completed'
];

export default function ReferralsPage() {
  const { district, facilityId, hasRole, user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);

  const isDistrictAdmin = hasRole('district_admin');

  const loadReferrals = async () => {
    setIsLoading(true);
    try {
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

      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id, referral_number, urgency, status, expected_arrival, created_at,
          patients(full_name),
          facilities!referrals_destination_facility_id_fkey(name),
          source_facility:facilities!referrals_source_facility_id_fkey(name)
        `)
        .or(`source_facility_id.in.(${facilityFilter.join(',')}),destination_facility_id.in.(${facilityFilter.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Need to cast the foreign key relationships properly since we aliased source_facility manually in the query string above but TS doesn't know
      setReferrals((data as any[]) || []);
    } catch (err) {
      console.error('Error loading referrals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReferrals();
  }, [district, facilityId, isDistrictAdmin, supabase]);

  const handleSimulateProgress = async (referral: ReferralData) => {
    if (!user) return;
    setIsSimulating(referral.id);
    
    try {
      const currentIndex = STATUS_PIPELINE.indexOf(referral.status);
      if (currentIndex === -1 || currentIndex >= STATUS_PIPELINE.length - 1) {
        return; // Already completed or not in standard pipeline
      }

      const nextStatus = STATUS_PIPELINE[currentIndex + 1];

      // Update referral
      const { error: updateError } = await supabase
        .from('referrals')
        .update({ status: nextStatus })
        .eq('id', referral.id);

      if (updateError) throw updateError;

      // Insert history
      await supabase.from('referral_status_history').insert({
        referral_id: referral.id,
        from_status: referral.status,
        to_status: nextStatus,
        changed_by: user.id,
        notes: 'Simulated via Admin Dashboard'
      });

      // Reload
      await loadReferrals();
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(null);
    }
  };

  const isNoShow = (ref: ReferralData) => {
    if (!ref.expected_arrival || ref.status === 'arrived' || ref.status === 'in_treatment' || ref.status === 'completed') return false;
    return new Date(ref.expected_arrival) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.referrals_tracking', 'Referral Tracking')}</h1>
          <p className="text-gray-500">Monitor and manage district-wide referrals</p>
        </div>
        <Button variant="outline" onClick={loadReferrals} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading && referrals.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : referrals.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-500">No referrals found in your scope.</div>
        ) : (
          referrals.map((ref) => (
            <Card key={ref.id} className={isNoShow(ref) ? 'border-orange-300 bg-orange-50/30' : ''}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{ref.patients?.full_name || 'Unknown Patient'}</span>
                      <Badge variant="outline" className="text-xs text-gray-500">{ref.referral_number}</Badge>
                      {ref.urgency === 'emergency' && (
                        <Badge variant="destructive" className="animate-pulse text-xs">EMERGENCY</Badge>
                      )}
                      {isNoShow(ref) && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          <AlertTriangle className="h-3 w-3 mr-1"/> NO SHOW
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <span className="font-medium">{ref.source_facility?.name || 'Unknown'}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{ref.facilities?.name || 'Unknown'}</span>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created: {new Date(ref.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-3 min-w-[200px]">
                    <div className="w-full">
                      <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider text-right">Status</div>
                      <div className="flex justify-end">
                        <Badge className="capitalize text-sm px-3 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">
                          {ref.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    {STATUS_PIPELINE.includes(ref.status) && ref.status !== 'completed' && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="w-full sm:w-auto"
                        onClick={() => handleSimulateProgress(ref)}
                        disabled={isSimulating === ref.id}
                      >
                        {isSimulating === ref.id ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Simulate Next Status
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
