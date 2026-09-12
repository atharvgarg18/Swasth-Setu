'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  /** Table name to subscribe to */
  table: string;
  /** Schema name (default: 'public') */
  schema?: string;
  /** Optional filter in the format 'column=eq.value' */
  filter?: string;
  /** Callback when a row is inserted */
  onInsert?: (payload: Record<string, unknown>) => void;
  /** Callback when a row is updated */
  onUpdate?: (payload: Record<string, unknown>) => void;
  /** Callback when a row is deleted */
  onDelete?: (payload: Record<string, unknown>) => void;
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

/**
 * Hook for subscribing to Supabase Realtime Postgres changes.
 */
export function useRealtime({
  table,
  schema = 'public',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!enabled) return;

    const channelName = `${table}-${filter ?? 'all'}-${Date.now()}`;
    const channelConfig: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: '*',
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as 'system',
        channelConfig as unknown as Record<string, string>,
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new);
              break;
            case 'UPDATE':
              onUpdate?.(payload.new);
              break;
            case 'DELETE':
              onDelete?.(payload.old);
              break;
          }
        }
      )
      .subscribe((subscriptionStatus: string) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (subscriptionStatus === 'CLOSED' || subscriptionStatus === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        } else {
          setStatus('connecting');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setStatus('disconnected');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, schema, filter, enabled]);

  return { status };
}

/**
 * Hook to track online/offline and realtime connection status.
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsOnline(navigator.onLine);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const connectionState: 'connected' | 'reconnecting' | 'offline' = isOnline ? 'connected' : 'offline';

  return {
    isOnline,
    connectionState,
  };
}

/**
 * Hook to subscribe to notifications for the current user.
 */
export function useNotifications(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    is_read: boolean;
    created_at: string;
  }>>([]);

  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: { is_read: boolean }) => !n.is_read).length);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useRealtime({
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    onInsert: (notification) => {
      setNotifications((prev) => [notification as typeof notifications[0], ...prev]);
      setUnreadCount((prev) => prev + 1);
    },
    onUpdate: () => {
      fetchNotifications();
    },
  });

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    fetchNotifications();
  }, [userId, supabase, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
