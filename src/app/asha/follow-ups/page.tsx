'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle, Clock } from 'lucide-react';
import type { FollowUpStatus } from '@/lib/constants';

export default function FollowUps() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<any[]>([]);

  const fetchFollowUps = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('follow_ups')
      .select(`
        *,
        patients!inner(id, full_name, phone)
      `)
      .eq('assigned_worker_id', user.id)
      .order('due_date', { ascending: true });

    if (data) setFollowUps(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFollowUps();
  }, [user]);

  const markCompleted = async (id: string) => {
    await supabase
      .from('follow_ups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    // Optimistic update
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'completed' } : f));
  };

  const renderList = (statusFilter: FollowUpStatus[]) => {
    const filtered = followUps.filter(f => statusFilter.includes(f.status));
    
    if (loading) {
      return (
        <div className="space-y-4 mt-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <Card className="mt-4">
          <CardContent className="p-8 text-center text-muted-foreground">
            No follow-ups found in this category.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4 mt-4">
        {filtered.map(f => (
          <Card key={f.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/asha/patients/${f.patients.id}`} className="font-semibold hover:underline">
                    {f.patients.full_name}
                  </Link>
                  <StatusBadge status={{ kind: 'followUp', value: f.status }} size="sm" />
                  {f.priority === 'urgent' && <StatusBadge status={{ kind: 'priority', value: 'urgent' }} size="sm" />}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="capitalize">Category: {f.category.replace('_', ' ')}</p>
                  <p>Reason: {f.reason}</p>
                  <p className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" /> Due: {new Date(f.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {f.status !== 'completed' && (
                <Button 
                  variant="outline" 
                  className="shrink-0"
                  onClick={() => markCompleted(f.id)}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  Mark Completed
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('asha.nav.followUps')}</h1>
      </div>

      <Tabs defaultValue="due">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overdue" className="text-red-600 data-[state=active]:text-red-700">Overdue</TabsTrigger>
          <TabsTrigger value="due" className="text-amber-600 data-[state=active]:text-amber-700">Due Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="overdue">
          {renderList(['overdue', 'missed'])}
        </TabsContent>
        <TabsContent value="due">
          {renderList(['due'])}
        </TabsContent>
        <TabsContent value="upcoming">
          {renderList(['upcoming'])}
        </TabsContent>
        <TabsContent value="completed">
          {renderList(['completed'])}
        </TabsContent>
      </Tabs>
    </div>
  );
}
