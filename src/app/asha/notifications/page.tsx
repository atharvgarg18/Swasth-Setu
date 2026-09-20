'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Bell, Check } from 'lucide-react';

const TYPE_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  referral_created: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '📋' },
  referral_acknowledged: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: '👨‍⚕️' },
  referral_status_update: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🔄' },
  referral_completed: { bg: 'bg-green-50', text: 'text-green-700', icon: '✅' },
  referral_incoming: { bg: 'bg-purple-50', text: 'text-purple-700', icon: '🔀' },
  consultation_completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '✅' },
  follow_up_reminder: { bg: 'bg-orange-50', text: 'text-orange-700', icon: '⏰' },
  general: { bg: 'bg-slate-50', text: 'text-slate-700', icon: '🔔' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AshaNotifications() {
  const { user } = useAuth();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('asha-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, supabase, load]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    load();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'oklch(0.15 0.012 60)' }}>
              <Bell className="w-6 h-6" /> Notifications
            </h1>
            {unreadCount > 0 && <p className="text-sm mt-0.5" style={{ color: 'oklch(0.47 0.012 60)' }}>{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-green-50"
              style={{ color: 'oklch(0.37 0.09 158)', borderColor: 'oklch(0.37 0.09 158)' }}
            >
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-700" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{ borderColor: 'oklch(0.83 0.016 80)' }}>
            <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'oklch(0.75 0.01 60)' }} />
            <p className="font-semibold" style={{ color: 'oklch(0.47 0.012 60)' }}>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.general;
              return (
                <div
                  key={n.id}
                  className={`rounded-xl p-4 border ${n.is_read ? 'opacity-60' : ''}`}
                  style={{ backgroundColor: 'white', borderColor: n.is_read ? 'oklch(0.88 0.014 80)' : 'oklch(0.37 0.09 158)', borderWidth: n.is_read ? 1 : 1.5 }}
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-xl flex-shrink-0">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>{n.title}</p>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'oklch(0.40 0.012 60)' }}>{n.message}</p>
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.65 0.01 60)' }}>{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
