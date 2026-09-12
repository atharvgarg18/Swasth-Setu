'use client';
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
}
