'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncToServer } from '@/lib/offline/sync';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  useEffect(() => {
    setStatus(navigator.onLine ? 'online' : 'offline');

    const handleOnline = async () => {
      setStatus('syncing');
      await syncToServer();
      setStatus('online');
    };
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (status === 'offline') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="w-3 h-3" />
        Offline
      </Badge>
    );
  }

  if (status === 'syncing') {
    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100 flex items-center gap-1">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing...
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1">
      <Wifi className="w-3 h-3" />
      Online
    </Badge>
  );
}
