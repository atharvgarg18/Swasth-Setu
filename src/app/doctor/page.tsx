'use client';
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
                    <Link href={`/doctor/consultations/${c.id}`}><Button size="sm">{t('doctor.dashboard.join')}</Button></Link>
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
}
