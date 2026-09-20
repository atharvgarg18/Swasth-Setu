'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Loader2, ChevronRight, ArrowUpRight, Inbox, Send } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-blue-50 text-blue-700 border-blue-200',
  acknowledged: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_transit: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  arrived: 'bg-orange-50 text-orange-700 border-orange-200',
  in_treatment: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const URGENCY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-700',
  urgent: 'bg-orange-100 text-orange-700',
  routine: 'bg-slate-100 text-slate-600',
};

export default function DoctorReferrals() {
  const { user } = useAuth();
  const supabase = createClient();
  const [tab, setTab] = useState<'sent' | 'incoming'>('incoming');
  const [sent, setSent] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [sentRes, incomingRes] = await Promise.all([
      supabase.from('referrals')
        .select(`
          id, status, urgency, reason, service, created_at,
          patient:patients(full_name),
          dest:facilities!referrals_destination_facility_id_fkey(name)
        `)
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false }),

      supabase.from('referrals')
        .select(`
          id, status, urgency, reason, service, created_at,
          patient:patients(full_name),
          referrer:profiles!referrals_referred_by_fkey(full_name)
        `)
        .eq('referred_to_doctor_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (sentRes.data) setSent(sentRes.data);
    if (incomingRes.data) setIncoming(incomingRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const list = tab === 'sent' ? sent : incoming;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>Referrals</h1>
          <p className="text-sm mt-0.5" style={{ color: 'oklch(0.47 0.012 60)' }}>Manage sent and incoming patient referrals</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'oklch(0.85 0.016 80)', backgroundColor: 'oklch(0.90 0.014 80)' }}>
          {(['incoming', 'sent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all"
              style={{
                backgroundColor: tab === t ? 'oklch(0.37 0.09 158)' : 'transparent',
                color: tab === t ? 'white' : 'oklch(0.47 0.012 60)',
              }}
            >
              {t === 'incoming' ? <Inbox className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {t === 'incoming' ? `Incoming (${incoming.length})` : `Sent (${sent.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-green-700" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{ borderColor: 'oklch(0.83 0.016 80)', color: 'oklch(0.55 0.012 60)' }}>
            <div className="text-4xl mb-3">{tab === 'incoming' ? '📭' : '📤'}</div>
            <p className="font-semibold">No {tab} referrals</p>
            <p className="text-sm mt-1">{tab === 'incoming' ? 'Referrals sent to you will appear here' : 'Referrals you create during consultations appear here'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(r => {
              const isNew = Date.now() - new Date(r.created_at).getTime() < 86400000;
              return (
                <Link
                  key={r.id}
                  href={`/doctor/referrals/${r.id}`}
                  className="block rounded-xl p-4 border shadow-sm hover:shadow-md transition-all group"
                  style={{ backgroundColor: 'white', borderColor: 'oklch(0.88 0.014 80)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate" style={{ color: 'oklch(0.15 0.012 60)' }}>
                          {(r.patient as any)?.full_name ?? 'Unknown Patient'}
                        </p>
                        {isNew && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">New</span>}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${URGENCY_COLORS[r.urgency] ?? 'bg-slate-100 text-slate-600'}`}>
                          {r.urgency}
                        </span>
                      </div>
                      {tab === 'incoming' && (
                        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.012 60)' }}>
                          From Dr. {(r.referrer as any)?.full_name ?? '—'}
                        </p>
                      )}
                      <p className="text-xs mt-1 line-clamp-1" style={{ color: 'oklch(0.47 0.012 60)' }}>
                        {r.service} · {r.reason}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'oklch(0.60 0.01 60)' }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] ?? 'bg-slate-50 text-slate-600'}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: 'oklch(0.60 0.01 60)' }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
