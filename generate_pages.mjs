import fs from 'fs';
import path from 'path';

const APP_DIR = 'd:/n/SIH_/gramin-care/src/app';

const files = {
  "patient/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { APP_NAME } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, FileText, Calendar, Pill, MapPin, Bell, Stethoscope, Loader2 } from 'lucide-react';

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [activeReferral, setActiveReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const { data: patientData } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      if (patientData) {
        const { data: refData } = await supabase.from('referrals').select('*').eq('patient_id', patientData.id).in('status', ['created', 'pending', 'acknowledged', 'in_transit']).order('created_at', { ascending: false }).limit(1).single();
        if (refData) setActiveReferral(refData);
      }
      setLoading(false);
    }
    loadData();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-800">
            {t('patient.dashboard.welcome')} {profile?.full_name}
          </h1>
          <p className="text-muted-foreground">{t('patient.dashboard.subtitle')} {APP_NAME}</p>
        </div>
        <Link href="/asha/triage">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Stethoscope className="mr-2 h-4 w-4" />
            {t('patient.dashboard.triage_button')}
          </Button>
        </Link>
      </div>
      
      {activeReferral && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 text-lg flex items-center justify-between">
              {t('patient.dashboard.active_referral')}
              <StatusBadge status={{ kind: 'referral', value: activeReferral.status }} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-900">{activeReferral.service} - {activeReferral.reason}</p>
            <Link href={\`/patient/referrals/\${activeReferral.id}\`}>
              <Button variant="link" className="px-0 text-amber-700">{t('common.view_details')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: '/patient/health-record', icon: Activity, title: 'patient.nav.health_record' },
          { href: '/patient/referrals', icon: FileText, title: 'patient.nav.referrals' },
          { href: '/patient/follow-ups', icon: Calendar, title: 'patient.nav.follow_ups' },
          { href: '/patient/prescriptions', icon: Pill, title: 'patient.nav.prescriptions' },
          { href: '/patient/facilities', icon: MapPin, title: 'patient.nav.facilities' },
          { href: '/patient/notifications', icon: Bell, title: 'patient.nav.notifications' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-emerald-500 transition-colors cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                <item.icon className="h-8 w-8 text-emerald-600" />
                <span className="font-medium">{t(item.title)}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}`,
  "patient/health-record/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function HealthRecordPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: p } = await supabase.from('patients').select('*').eq('user_id', user.id).single();
      if (p) {
        setPatient(p);
        const { data: tl } = await supabase.from('patient_timeline').select('*').eq('patient_id', p.id).order('event_at', { ascending: false });
        if (tl) setTimeline(tl);
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;
  if (!patient) return <div className="p-8 text-center text-muted-foreground">{t('common.no_data')}</div>;

  const age = patient.date_of_birth ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000) : '—';
  const addressStr = patient.address ? [patient.address.village, patient.address.block, patient.address.district].filter(Boolean).join(', ') : '—';

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.health_record.title')}</h1>
      <Card>
        <CardHeader><CardTitle>{t('patient.health_record.demographics')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.name')}</p><p className="font-medium">{patient.full_name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.age')}</p><p className="font-medium">{age}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.gender')}</p><p className="font-medium capitalize">{patient.gender}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.health_record.blood_group')}</p><p className="font-medium">{patient.blood_group || '—'}</p></div>
          <div className="col-span-2 md:col-span-4"><p className="text-sm text-muted-foreground">{t('patient.health_record.address')}</p><p className="font-medium">{addressStr}</p></div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('patient.health_record.allergies')}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {patient.allergies?.length ? patient.allergies.map((a: string) => <Badge key={a} variant="destructive">{a}</Badge>) : <span className="text-muted-foreground">{t('common.none')}</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('patient.health_record.conditions')}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {patient.chronic_conditions?.length ? patient.chronic_conditions.map((c: string) => <Badge key={c} variant="secondary">{c}</Badge>) : <span className="text-muted-foreground">{t('common.none')}</span>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{t('patient.health_record.timeline')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {timeline.length ? timeline.map(event => (
            <div key={event.id} className="border-l-2 border-emerald-200 pl-4 py-2">
              <p className="text-sm text-muted-foreground">{new Date(event.event_at).toLocaleDateString()}</p>
              <p className="font-medium">{event.title}</p>
              {event.description && <p className="text-sm text-gray-600">{event.description}</p>}
            </div>
          )) : <p className="text-muted-foreground">{t('common.no_data')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}`,
  "patient/referrals/page.tsx": `'use client';
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
                <Link href={\`/patient/referrals/\${ref.id}\`}>
                  <Button variant="outline">{t('common.view_details')}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}`,
  "patient/referrals/[id]/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ReferralDetailPage() {
  const params = useParams();
  const { t } = useI18n();
  const supabase = createClient();
  const [referral, setReferral] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!params.id) return;
      const { data: ref } = await supabase.from('referrals')
        .select('*, source_facility:facilities!referrals_source_facility_id_fkey(name), destination_facility:facilities!referrals_destination_facility_id_fkey(name), doctor:profiles!referrals_referred_by_fkey(full_name)')
        .eq('id', params.id as string).single();
      
      if (ref) {
        setReferral(ref);
        const { data: hist } = await supabase.from('referral_status_history')
          .select('*').eq('referral_id', ref.id).order('changed_at', { ascending: false });
        if (hist) setHistory(hist);
      }
      setLoading(false);
    }
    load();
  }, [params.id, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;
  if (!referral) return <div className="p-8 text-center text-muted-foreground">{t('common.no_data')}</div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.referrals.detail')}</h1>
        <StatusBadge status={{ kind: 'referral', value: referral.status }} />
      </div>
      <Card>
        <CardHeader><CardTitle>{t('patient.referrals.info')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.source')}</p><p className="font-medium">{(referral.source_facility as any)?.name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.destination')}</p><p className="font-medium">{(referral.destination_facility as any)?.name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.doctor')}</p><p className="font-medium">{(referral.doctor as any)?.full_name}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.referrals.urgency')}</p><StatusBadge status={{ kind: 'priority', value: referral.urgency }} className="mt-1" /></div>
          <div className="col-span-1 md:col-span-2"><p className="text-sm text-muted-foreground">{t('patient.referrals.reason')}</p><p className="font-medium">{referral.reason}</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('patient.referrals.timeline')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {history.length ? history.map(h => (
            <div key={h.id} className="border-l-2 border-emerald-200 pl-4 py-2">
              <p className="text-sm text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</p>
              <div className="flex gap-2 items-center">
                <StatusBadge status={{ kind: 'referral', value: h.from_status }} size="sm" />
                <span>→</span>
                <StatusBadge status={{ kind: 'referral', value: h.to_status }} size="sm" />
              </div>
              {h.notes && <p className="text-sm mt-1">{h.notes}</p>}
            </div>
          )) : <p className="text-muted-foreground">{t('common.no_data')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}`,
  "patient/follow-ups/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function FollowUpsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: p } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      if (p) {
        const { data: fu } = await supabase.from('follow_ups')
          .select('*, worker:profiles!follow_ups_assigned_worker_id_fkey(full_name)')
          .eq('patient_id', p.id)
          .order('due_date', { ascending: true });
        if (fu) setFollowUps(fu);
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.follow_ups.title')}</h1>
      {followUps.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('common.no_data')}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {followUps.map(fu => (
            <Card key={fu.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-lg capitalize">{fu.category.replace('_', ' ')}</span>
                  <StatusBadge status={{ kind: 'followUp', value: fu.status }} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>{t('patient.follow_ups.reason')}:</strong> {fu.reason}
                </p>
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>{t('patient.follow_ups.date')}:</strong> {new Date(fu.due_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>{t('patient.follow_ups.worker')}:</strong> {(fu.worker as any)?.full_name || 'Unassigned'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}`,
  "patient/prescriptions/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: p } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      if (p) {
        const { data: rx } = await supabase.from('prescriptions')
          .select('*, doctor:profiles!prescriptions_prescribed_by_fkey(full_name)')
          .eq('patient_id', p.id)
          .order('created_at', { ascending: false });
        if (rx) setPrescriptions(rx);
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.prescriptions.title')}</h1>
      {prescriptions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('common.no_data')}</CardContent></Card>
      ) : (
        <div className="grid gap-6">
          {prescriptions.map(rx => (
            <Card key={rx.id}>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between">
                  <span>{new Date(rx.created_at).toLocaleDateString()}</span>
                  <span className="text-sm font-normal text-muted-foreground">{t('patient.prescriptions.doctor')}: {(rx.doctor as any)?.full_name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(rx.medications || []).map((med: any, idx: number) => (
                    <div key={idx} className="border-b pb-2 last:border-0">
                      <p className="font-semibold">{med.name}</p>
                      <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                        <p>{t('patient.prescriptions.dosage')}: {med.dosage}</p>
                        <p>{t('patient.prescriptions.frequency')}: {med.frequency}</p>
                        <p>{t('patient.prescriptions.duration')}: {med.duration}</p>
                        <p>{t('patient.prescriptions.instructions')}: {med.instructions}</p>
                      </div>
                    </div>
                  ))}
                  {rx.notes && (
                    <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium">{t('patient.prescriptions.notes')}</p>
                      <p className="text-sm mt-1">{rx.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}`,
  "patient/notifications/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: notifs } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (notifs) setNotifications(notifs);
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.notifications.title')}</h1>
      {notifications.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('common.no_data')}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {notifications.map(n => (
            <Card key={n.id} className={n.is_read ? 'opacity-70' : 'border-emerald-200 bg-emerald-50'}>
              <CardContent className="p-4 flex justify-between items-center gap-4">
                <div>
                  <div className="flex gap-2 items-center mb-1">
                    <Badge variant="outline">{n.type}</Badge>
                    <span className="font-semibold">{n.title}</span>
                  </div>
                  <p className="text-sm text-gray-700">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                    {t('patient.notifications.mark_read')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}`,
  "patient/facilities/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FACILITY_TYPE_LABELS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function FacilitiesPage() {
  const { t, locale } = useI18n();
  const supabase = createClient();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: facs } = await supabase.from('facilities').select('*').eq('is_active', true).order('name');
      if (facs) setFacilities(facs);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.facilities.title')}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {facilities.map(fac => (
          <Card key={fac.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-lg">{fac.name}</span>
                <Badge>{FACILITY_TYPE_LABELS[fac.type as keyof typeof FACILITY_TYPE_LABELS]?.[locale as 'en' | 'mr'] || fac.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{fac.address}</p>
              <div className="text-sm space-y-1">
                <p><strong>{t('patient.facilities.phone')}:</strong> {fac.phone || '—'}</p>
                <p><strong>{t('patient.facilities.beds')}:</strong> {fac.bed_capacity || '—'}</p>
              </div>
              {fac.services?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {fac.services.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`,
  "patient/settings/page.tsx": `'use client';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.settings.title')}</h1>
      
      <Card>
        <CardHeader><CardTitle>{t('patient.settings.profile')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><p className="text-sm text-muted-foreground">{t('patient.settings.name')}</p><p className="font-medium">{profile?.full_name || '—'}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.settings.phone')}</p><p className="font-medium">{profile?.phone || '—'}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.settings.email')}</p><p className="font-medium">{profile?.email || '—'}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('patient.settings.language')}</CardTitle></CardHeader>
        <CardContent className="flex gap-4">
          <Button variant={locale === 'en' ? 'default' : 'outline'} onClick={() => setLocale('en')}>English</Button>
          <Button variant={locale === 'mr' ? 'default' : 'outline'} onClick={() => setLocale('mr')}>मराठी</Button>
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={signOut} className="w-full">{t('auth.sign_out')}</Button>
    </div>
  );
}`,
  "patient/consultation/[id]/page.tsx": `'use client';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { MobileVideoRoom } from '@/components/video/MobileVideoRoom';
import { Card, CardContent } from '@/components/ui/card';

export default function PatientConsultationPage() {
  const params = useParams();
  const { profile } = useAuth();
  const { t } = useI18n();
  const roomId = params.id as string;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Card className="rounded-none border-x-0 border-t-0 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between bg-emerald-50">
          <div className="font-semibold text-emerald-900">{t('patient.consultation.active_call')}</div>
          <div className="text-sm text-emerald-700">{profile?.full_name}</div>
        </CardContent>
      </Card>
      <div className="flex-1 bg-black overflow-hidden relative">
        <MobileVideoRoom roomId={roomId} />
      </div>
    </div>
  );
}`,

  "doctor/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { APP_NAME } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Video, FileText, Activity, Loader2, Pill } from 'lucide-react';

export default function DoctorDashboard() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [queue, setQueue] = useState<any[]>([]);
  const [recentRx, setRecentRx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      // Fetch queue
      const { data: q } = await supabase.from('consultations')
        .select('*, patient:patients(full_name)')
        .eq('doctor_id', user.id)
        .in('status', ['requested', 'queued', 'in_progress'])
        .order('created_at', { ascending: false });
      if (q) setQueue(q);

      // Fetch recent rx
      const { data: rx } = await supabase.from('prescriptions')
        .select('*, patient:patients(full_name)')
        .eq('prescribed_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (rx) setRecentRx(rx);
      
      setLoading(false);
    }
    loadData();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-800">
            {t('doctor.dashboard.welcome')} Dr. {profile?.full_name}
          </h1>
          <p className="text-muted-foreground">{APP_NAME} {t('doctor.dashboard.portal')}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">{t('doctor.dashboard.pending_consultations')}</p>
              <h2 className="text-3xl font-bold text-blue-900">{queue.length}</h2>
            </div>
            <Video className="h-10 w-10 text-blue-400" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{t('doctor.dashboard.today_queue')}</CardTitle>
            <Link href="/doctor/consultations"><Button variant="ghost" size="sm">{t('common.view_all')}</Button></Link>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? <p className="text-muted-foreground">{t('common.no_data')}</p> : (
              <div className="space-y-3">
                {queue.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{(c.patient as any)?.full_name || 'Unknown'}</p>
                      <div className="flex gap-2 mt-1">
                        <StatusBadge status={{ kind: 'consultation', value: c.status }} size="sm" />
                        <StatusBadge status={{ kind: 'priority', value: c.priority }} size="sm" />
                      </div>
                    </div>
                    <Link href={\`/doctor/consultations/\${c.id}\`}><Button size="sm">{t('doctor.dashboard.join')}</Button></Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{t('doctor.dashboard.recent_rx')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRx.length === 0 ? <p className="text-muted-foreground">{t('common.no_data')}</p> : (
              <div className="space-y-3">
                {recentRx.map(r => (
                  <div key={r.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">{(r.patient as any)?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <Pill className="h-5 w-5 text-emerald-500" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`,
  "doctor/consultations/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ConsultationsQueue() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: q } = await supabase.from('consultations')
        .select('*, patient:patients(full_name)')
        .eq('doctor_id', user.id)
        .in('status', ['requested', 'queued', 'in_progress'])
        .order('created_at', { ascending: false });
      if (q) setQueue(q);
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('doctor.consultations.queue')}</h1>
      {queue.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('common.no_data')}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {queue.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg">{(c.patient as any)?.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{t('doctor.consultations.type')}: {c.consultation_type}</p>
                  <div className="flex gap-2">
                    <StatusBadge status={{ kind: 'consultation', value: c.status }} />
                    <StatusBadge status={{ kind: 'priority', value: c.priority }} />
                  </div>
                </div>
                <Link href={\`/doctor/consultations/\${c.id}\`}>
                  <Button className="w-full md:w-auto">{t('doctor.consultations.join_call')}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}`,
  "doctor/consultations/[id]/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DoctorVideoRoom } from '@/components/video/DoctorVideoRoom';
import { Loader2 } from 'lucide-react';

export default function DoctorConsultationRoom() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [notes, setNotes] = useState('');
  const [assessment, setAssessment] = useState('');
  const [meds, setMeds] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!params.id) return;
      const { data: c } = await supabase.from('consultations')
        .select('*, patient:patients(*)').eq('id', params.id as string).single();
      if (c) {
        setConsultation(c);
        setNotes(c.clinical_notes || '');
        setAssessment(c.assessment || '');
      }
      setLoading(false);
    }
    load();
  }, [params.id, supabase]);

  const addMed = () => setMeds([...meds, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);

  const completeConsultation = async () => {
    setSaving(true);
    await supabase.from('consultations').update({
      clinical_notes: notes,
      assessment: assessment,
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', consultation.id);

    if (meds.length > 0) {
      await supabase.from('prescriptions').insert({
        consultation_id: consultation.id,
        patient_id: consultation.patient_id,
        prescribed_by: user?.id,
        medications: meds
      });
    }

    setSaving(false);
    router.push('/doctor');
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      <div className="w-full lg:w-1/2 bg-black border-r border-gray-200">
        <DoctorVideoRoom roomId={params.id as string} />
      </div>
      <div className="w-full lg:w-1/2 bg-white overflow-y-auto p-4 space-y-6">
        <Card>
          <CardHeader><CardTitle>{t('doctor.consultations.patient_info')}</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold text-lg">{(consultation.patient as any)?.full_name}</p>
            <p className="text-sm text-muted-foreground capitalize">{(consultation.patient as any)?.gender} | {(consultation.patient as any)?.blood_group}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('doctor.consultations.clinical_notes')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('doctor.consultations.notes')}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t('doctor.consultations.assessment')}</Label>
              <Textarea value={assessment} onChange={e => setAssessment(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>{t('doctor.consultations.prescription')}</CardTitle>
            <Button variant="outline" size="sm" onClick={addMed}>{t('doctor.consultations.add_med')}</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {meds.map((m, idx) => (
              <div key={idx} className="p-3 border rounded-md space-y-3">
                <Input placeholder={t('doctor.consultations.med_name')} value={m.name} onChange={e => { const nm = [...meds]; nm[idx].name = e.target.value; setMeds(nm); }} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder={t('doctor.consultations.med_dosage')} value={m.dosage} onChange={e => { const nm = [...meds]; nm[idx].dosage = e.target.value; setMeds(nm); }} />
                  <Input placeholder={t('doctor.consultations.med_freq')} value={m.frequency} onChange={e => { const nm = [...meds]; nm[idx].frequency = e.target.value; setMeds(nm); }} />
                  <Input placeholder={t('doctor.consultations.med_dur')} value={m.duration} onChange={e => { const nm = [...meds]; nm[idx].duration = e.target.value; setMeds(nm); }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button onClick={completeConsultation} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="animate-spin mr-2" /> : null}
          {t('doctor.consultations.complete')}
        </Button>
      </div>
    </div>
  );
}`,
  "doctor/patients/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DoctorPatients() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      // Get all patients who had consultations with this doctor
      const { data: cons } = await supabase.from('consultations').select('patient_id, patient:patients(*)').eq('doctor_id', user.id);
      
      if (cons) {
        // Unique patients
        const pMap = new Map();
        cons.forEach(c => {
          if (c.patient && !pMap.has(c.patient_id)) {
            pMap.set(c.patient_id, c.patient);
          }
        });
        setPatients(Array.from(pMap.values()));
      }
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('doctor.patients.title')}</h1>
      {patients.length === 0 ? <p className="text-muted-foreground">{t('common.no_data')}</p> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg">{p.full_name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{p.gender} | {p.blood_group || '—'}</p>
                <p className="text-sm mt-2">{p.phone}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}`,
  "doctor/referrals/page.tsx": `'use client';
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
}`
};

Object.entries(files).forEach(([relPath, content]) => {
  const fullPath = path.join(APP_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
  console.log('Created:', fullPath);
});
