'use client';
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
}
