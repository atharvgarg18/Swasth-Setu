import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/metrics - Get district-level metrics
 * Query params: district, facility_id
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const district = searchParams.get('district');

  // Total patients
  const { count: totalPatients } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true });

  // Referral metrics
  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, status, urgency, created_at');

  const totalReferrals = referrals?.length ?? 0;
  const completedReferrals = referrals?.filter((r) => r.status === 'completed').length ?? 0;
  const pendingReferrals = referrals?.filter((r) => !['completed', 'cancelled', 'rejected'].includes(r.status)).length ?? 0;
  const overdueReferrals = referrals?.filter((r) => r.status === 'no_show' || (r.status !== 'completed' && r.status !== 'cancelled')).length ?? 0;
  const completionRate = totalReferrals > 0 ? Math.round((completedReferrals / totalReferrals) * 100) : 0;

  // Follow-up metrics
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('id, status, category');

  const totalFollowUps = followUps?.length ?? 0;
  const overdueFollowUps = followUps?.filter((f) => f.status === 'overdue' || f.status === 'missed').length ?? 0;
  const completedFollowUps = followUps?.filter((f) => f.status === 'completed').length ?? 0;

  // Emergency cases
  const { count: activeEmergencies } = await supabase
    .from('emergency_cases')
    .select('id', { count: 'exact', head: true })
    .not('status', 'eq', 'resolved');

  // Medicine stock issues
  const { count: stockIssues } = await supabase
    .from('medicine_stock')
    .select('id', { count: 'exact', head: true })
    .in('status', ['low_stock', 'out_of_stock']);

  // High-risk patients
  const { count: highRiskPatients } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('is_high_risk', true);

  // Facility-wise referral breakdown
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, name, type');

  const facilityMetrics = await Promise.all(
    (facilities ?? []).map(async (facility) => {
      const { data: facReferrals } = await supabase
        .from('referrals')
        .select('id, status')
        .or(`source_facility_id.eq.${facility.id},destination_facility_id.eq.${facility.id}`);

      const total = facReferrals?.length ?? 0;
      const completed = facReferrals?.filter((r) => r.status === 'completed').length ?? 0;
      const pending = facReferrals?.filter((r) => !['completed', 'cancelled', 'rejected'].includes(r.status)).length ?? 0;

      return {
        facility_id: facility.id,
        facility_name: facility.name,
        facility_type: facility.type,
        total_referrals: total,
        completed_referrals: completed,
        pending_referrals: pending,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    })
  );

  // Referral status breakdown
  const statusBreakdown: Record<string, number> = {};
  referrals?.forEach((r) => {
    statusBreakdown[r.status] = (statusBreakdown[r.status] ?? 0) + 1;
  });

  return NextResponse.json({
    data: {
      patients: {
        total: totalPatients ?? 0,
        high_risk: highRiskPatients ?? 0,
      },
      referrals: {
        total: totalReferrals,
        completed: completedReferrals,
        pending: pendingReferrals,
        overdue: overdueReferrals,
        completion_rate: completionRate,
        status_breakdown: statusBreakdown,
      },
      follow_ups: {
        total: totalFollowUps,
        completed: completedFollowUps,
        overdue: overdueFollowUps,
      },
      emergencies: {
        active: activeEmergencies ?? 0,
      },
      medicine: {
        stock_issues: stockIssues ?? 0,
      },
      facility_metrics: facilityMetrics,
    },
  });
}
