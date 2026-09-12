'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/offline/db';
import { syncFromServer } from '@/lib/offline/sync';
import { createClient } from '@/lib/supabase/client';

export function useOfflineData<T>(tableName: string, query?: any) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchLocal = useCallback(async () => {
    try {
      const table = (db as any)[tableName];
      let result;
      if (query && query.eq) {
         result = await table.where(query.eq.column).equals(query.eq.value).toArray();
      } else {
         result = await table.toArray();
      }
      setData(result.filter((item: any) => !item._deleted));
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [tableName, query]);

  const refetch = useCallback(async () => {
    setLoading(true);
    if (navigator.onLine) {
      setIsSyncing(true);
      try {
        await syncFromServer(tableName);
        const supabase = createClient();
        let q = (supabase.from(tableName) as any).select('*');
        if (query && query.eq) {
            q = q.eq(query.eq.column, query.eq.value);
        }
        const { data: supaData, error: supaErr } = await q;
        if (!supaErr && supaData) {
            setData(supaData as T[]);
            const table = (db as any)[tableName];
            await table.bulkPut(supaData.map((item: any) => ({ ...item, _synced: true, _lastModified: new Date().toISOString() })));
        } else {
            await fetchLocal();
        }
      } catch (e) {
        console.error(e);
        await fetchLocal();
      } finally {
        setIsSyncing(false);
        setLoading(false);
      }
    } else {
      await fetchLocal();
    }
  }, [tableName, query, fetchLocal]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    refetch();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch]);

  return { data, loading, error, isOffline, isSyncing, refetch };
}
