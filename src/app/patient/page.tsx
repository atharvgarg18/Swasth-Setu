'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Loader2, Stethoscope, AlertTriangle, Activity, FileText, Calendar, Pill, MapPin, Bell, ArrowRight } from 'lucide-react';

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
      const { data: patientData } = await supabase.from('patients')
        .select('id').eq('user_id', user.id).single();
      if (patientData) {
        const { data: refData } = await supabase.from('referrals')
          .select('*').eq('patient_id', patientData.id)
          .in('status', ['created', 'pending', 'acknowledged', 'in_transit'])
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (refData) setActiveReferral(refData);
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (loading) return (
    <div className="pt-16 flex justify-center">
      <Loader2 className="animate-spin h-6 w-6" style={{ color: 'oklch(0.37 0.09 158)' }} />
    </div>
  );

  const firstName = profile?.full_name?.split(' ')[0];
  const greeting = isMr ? `नमस्ते, ${firstName}` : `Namaste, ${firstName}`;

  return (
    <div className="space-y-5 pb-6">

      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>
          {greeting}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'oklch(0.52 0.012 60)' }}>
          {t('patient.dashboard.subtitle')}
        </p>
      </div>

      {/* ── Primary CTA: Health Check ─────────────────────── */}
      <Link href="/patient/health-check">
        <div
          className="rounded-lg p-4 flex items-center justify-between cursor-pointer transition-opacity hover:opacity-95"
          style={{ backgroundColor: 'oklch(0.37 0.09 158)' }}
        >
          <div>
            <p className="font-semibold text-white text-base">
              {isMr ? 'बरे वाटत नाही?' : 'Not feeling well?'}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'oklch(0.82 0.04 158)' }}>
              {isMr ? 'एक झटपट लक्षण तपासणी सुरू करा' : 'Start a quick symptom check →'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ backgroundColor: 'oklch(0.44 0.10 158)' }}>
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
        </div>
      </Link>

      {/* ── Emergency SOS ─────────────────────────────────── */}
      <Link href="/patient/sos">
        <div
          className="rounded-lg p-3.5 flex items-center gap-3 border cursor-pointer transition-colors hover:bg-red-50"
          style={{ borderColor: 'oklch(0.75 0.12 24)', backgroundColor: 'oklch(0.98 0.02 24)' }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'oklch(0.44 0.18 24)' }} />
          <div className="flex-1">
            <span className="font-semibold text-sm" style={{ color: 'oklch(0.30 0.14 24)' }}>
              {isMr ? 'आपत्कालीन SOS' : 'Emergency SOS'}
            </span>
            <span className="text-xs ml-2" style={{ color: 'oklch(0.44 0.18 24)' }}>
              {isMr ? 'त्वरित मदत' : 'Get immediate help'}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.44 0.18 24)' }} />
        </div>
      </Link>

      {/* ── Active Referral ───────────────────────────────── */}
      {activeReferral && (
        <div
          className="rounded-lg p-4 border"
          style={{
            backgroundColor: 'oklch(0.97 0.02 65)',
            borderColor: 'oklch(0.82 0.06 65)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                 style={{ color: 'oklch(0.52 0.08 65)' }}>
                {t('patient.dashboard.active_referral')}
              </p>
              <p className="text-sm font-medium" style={{ color: 'oklch(0.20 0.08 65)' }}>
                {activeReferral.reason}
              </p>
            </div>
            <StatusBadge status={{ kind: 'referral', value: activeReferral.status }} />
          </div>
          <Link
            href={`/patient/referrals/${activeReferral.id}`}
            className="text-xs font-medium mt-2 inline-block"
            style={{ color: 'oklch(0.37 0.09 158)' }}
          >
            {t('common.view_details')} →
          </Link>
        </div>
      )}

      {/* ── Quick navigation ──────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
           style={{ color: 'oklch(0.55 0.01 60)' }}>
          {isMr ? 'द्रुत प्रवेश' : 'Quick access'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: '/patient/health-record', icon: Activity, title: t('patient.nav.health_record') },
            { href: '/patient/referrals', icon: FileText, title: t('patient.nav.referrals') },
            { href: '/patient/follow-ups', icon: Calendar, title: t('patient.nav.follow_up') },
            { href: '/patient/prescriptions', icon: Pill, title: t('patient.nav.prescriptions') },
            { href: '/patient/facilities', icon: MapPin, title: t('patient.nav.facilities') },
            { href: '/patient/notifications', icon: Bell, title: t('patient.nav.notifications') },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className="flex flex-col items-center justify-center py-4 px-2 rounded-lg border text-center cursor-pointer transition-colors hover:bg-white gap-1.5"
                style={{
                  backgroundColor: 'oklch(0.97 0.008 80)',
                  borderColor: 'oklch(0.86 0.012 80)',
                }}
              >
                <item.icon className="w-5 h-5" style={{ color: 'oklch(0.37 0.09 158)' }} />
                <span className="text-xs font-medium leading-tight"
                      style={{ color: 'oklch(0.25 0.012 60)' }}>
                  {item.title}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}