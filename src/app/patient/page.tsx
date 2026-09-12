'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, FileText, Calendar, Pill, MapPin, Bell, Loader2, Stethoscope, AlertTriangle } from 'lucide-react';

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();
  const supabase = createClient();
  const [activeReferral, setActiveReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isMr = locale === 'mr';

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const { data: patientData } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      if (patientData) {
        const { data: refData } = await supabase.from('referrals').select('*').eq('patient_id', patientData.id).in('status', ['created', 'pending', 'acknowledged', 'in_transit']).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (refData) setActiveReferral(refData);
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-emerald-800">
          {t('patient.dashboard.welcome')} {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm">{t('patient.dashboard.subtitle')}</p>
      </div>

      {/* === TWO PRIMARY ACTION BUTTONS === */}
      <div className="grid grid-cols-2 gap-3">
        {/* Health Check — simplified triage for patient */}
        <Link href="/patient/health-check" className="col-span-1">
          <div className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white text-center shadow-md shadow-emerald-200 h-full">
            <Stethoscope className="w-8 h-8" />
            <span className="font-bold text-base leading-tight">
              {isMr ? 'आरोग्य तपासणी' : 'Health Check'}
            </span>
            <span className="text-emerald-100 text-xs leading-tight">
              {isMr ? 'लक्षणे सांगा' : 'Check symptoms'}
            </span>
          </div>
        </Link>

        {/* Emergency SOS */}
        <Link href="/patient/sos" className="col-span-1">
          <div className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white text-center shadow-md shadow-red-200 h-full">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
            <span className="font-bold text-base leading-tight">
              {isMr ? 'आपत्कालीन SOS' : 'Emergency SOS'}
            </span>
            <span className="text-red-100 text-xs leading-tight">
              {isMr ? 'त्वरित मदत' : 'Get help now'}
            </span>
          </div>
        </Link>
      </div>

      {/* Active Referral Alert */}
      {activeReferral && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 text-base flex items-center justify-between">
              {t('patient.dashboard.active_referral')}
              <StatusBadge status={{ kind: 'referral', value: activeReferral.status }} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-900 text-sm">{activeReferral.reason}</p>
            <Link href={`/patient/referrals/${activeReferral.id}`}>
              <Button variant="link" className="px-0 text-amber-700 text-sm">{t('common.view_details')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: '/patient/health-record', icon: Activity, title: t('patient.nav.health_record') },
          { href: '/patient/referrals', icon: FileText, title: t('patient.nav.referrals') },
          { href: '/patient/follow-ups', icon: Calendar, title: t('patient.nav.follow_up') },
          { href: '/patient/prescriptions', icon: Pill, title: t('patient.nav.prescriptions') },
          { href: '/patient/facilities', icon: MapPin, title: t('patient.nav.facilities') },
          { href: '/patient/notifications', icon: Bell, title: t('patient.nav.notifications') },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-emerald-400 transition-colors cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-5 text-center space-y-2">
                <item.icon className="h-7 w-7 text-emerald-600" />
                <span className="font-medium text-sm text-slate-700">{item.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}