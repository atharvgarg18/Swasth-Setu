'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, RefreshCw, Play, Clock, MessageSquare,
  CheckCircle, Settings, ChevronDown, ChevronUp, Loader2,
  Activity, Phone, User, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string;
  patient_name: string;
  facility_name: string;
  service: string;
  referral_age_hours: number;
  asha_phone: string;
  payload: Record<string, any>;
  status: string;
  escalated_at: string;
  asha_worker?: { full_name: string; phone: string };
}

interface Config {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export default function NoShowLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<Config[]>([]);
  const [stats, setStats] = useState({ total_escalated: 0, escalated_last_24h: 0 });
  const [cron, setCron] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [lastRun, setLastRun] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/no-show/logs');
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs ?? []);
        setConfig(json.config ?? []);
        setStats(json.stats ?? {});
        setCron(json.cron ?? null);
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const triggerManually = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/no-show/logs', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setLastRun(JSON.stringify(json.result, null, 2));
        await fetchLogs();
      }
    } catch (_) {}
    setTriggering(false);
  };

  const saveConfig = async (key: string) => {
    await fetch('/api/no-show/logs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: editValue }),
    });
    setEditingConfig(null);
    fetchLogs();
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const priorityColor = (p: string) =>
    p === 'CRITICAL' ? 'text-red-700 bg-red-100 border-red-300'
    : p === 'HIGH' ? 'text-orange-700 bg-orange-100 border-orange-300'
    : 'text-blue-700 bg-blue-100 border-blue-300';

  return (
    <div className="p-4 pb-20 space-y-5 max-w-3xl mx-auto" style={{ color: 'oklch(0.15 0.012 60)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            No-Show Escalation Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Challenge 2 — pg_cron background worker</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
          <Button
            onClick={triggerManually}
            disabled={triggering}
            size="sm"
            className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700"
          >
            {triggering
              ? <><Loader2 className="w-3 h-3 animate-spin" />Running...</>
              : <><Play className="w-3 h-3" />Trigger Now</>}
          </Button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Escalated', value: stats.total_escalated, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Last 24 Hours', value: stats.escalated_last_24h, icon: Clock, color: 'text-orange-600' },
          { label: 'CRON Status', value: cron?.active === true ? 'Active' : cron ? 'Inactive' : 'Unknown', icon: Activity, color: cron?.active ? 'text-green-600' : 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CRON info */}
      {cron && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <span className="text-green-700 font-medium">
            pg_cron job <strong>"{cron.jobname}"</strong> running on schedule <strong>{cron.schedule}</strong>
          </span>
        </div>
      )}

      {/* ── Manual trigger result ── */}
      {lastRun && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Last Manual Run Result</p>
          <pre className="text-[11px] text-slate-700 font-mono whitespace-pre-wrap">{lastRun}</pre>
        </div>
      )}

      {/* ── System Config ── */}
      <div className="bg-white rounded-xl border border-slate-100">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold">System Configuration</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {config.map(cfg => (
            <div key={cfg.key} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-semibold text-slate-700">{cfg.key}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{cfg.description}</p>
              </div>
              {editingConfig === cfg.key ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-24 text-xs border border-slate-300 rounded px-2 py-1"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => saveConfig(cfg.key)} className="text-xs text-green-600 font-semibold">Save</button>
                  <button onClick={() => setEditingConfig(null)} className="text-xs text-slate-400">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingConfig(cfg.key); setEditValue(cfg.value); }}
                  className="text-xs font-mono bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                >
                  {cfg.value}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── SMS Gateway Log ── */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          NHM SMS Gateway Log
          <span className="text-[10px] font-normal text-slate-400">(simulated payloads)</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-100">
            <AlertTriangle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No escalations yet</p>
            <p className="text-xs text-slate-300 mt-1">
              Set NO_SHOW_WINDOW_HOURS to 0.017 (≈1 min) and click "Trigger Now" to demo
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border-2 border-red-100 overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{log.patient_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priorityColor(log.payload?.priority ?? 'NORMAL')}`}>
                        {log.payload?.priority ?? 'NORMAL'}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        SIMULATED
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{log.facility_name ?? '—'} · {log.service}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{log.referral_age_hours}h stale
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" />{log.asha_worker?.full_name ?? 'ASHA'}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{log.asha_phone}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(log.escalated_at)}</p>
                  </div>
                  {expandedLog === log.id
                    ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>

                {/* Expanded: full NHM payload */}
                {expandedLog === log.id && (
                  <div className="border-t border-red-100 bg-slate-950 px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                      NHM SMS Gateway Payload
                    </p>
                    <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
