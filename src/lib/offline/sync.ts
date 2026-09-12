import { db } from './db';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export async function syncFromServer(tableName: string) {
  const supabase = createClient();
  const lastSync = localStorage.getItem(`sync_${tableName}`) || new Date(0).toISOString();
  
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .gt('updated_at', lastSync);
    
  if (error || !data) return;
  
  if (data.length > 0) {
    const table = (db as any)[tableName];
    await table.bulkPut(data.map((item: any) => ({ ...item, _synced: true, _lastModified: new Date().toISOString() })));
    localStorage.setItem(`sync_${tableName}`, new Date().toISOString());
  }
}

export async function queueMutation(tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
  const table = (db as any)[tableName];
  
  if (operation === 'INSERT' || operation === 'UPDATE') {
    await table.put({ ...data, _synced: false, _lastModified: new Date().toISOString() });
  } else if (operation === 'DELETE') {
    await table.update(data.id, { _deleted: true, _synced: false, _lastModified: new Date().toISOString() });
  }
  
  await db.mutations.add({
    id: uuidv4(),
    table: tableName,
    operation,
    data,
    timestamp: Date.now()
  });
  
  if (navigator.onLine) {
    syncToServer();
  }
}

export async function syncToServer() {
  if (!navigator.onLine) return;
  
  const supabase = createClient();
  const mutations = await db.mutations.orderBy('timestamp').toArray();
  
  for (const mutation of mutations) {
    try {
      if (mutation.operation === 'INSERT') {
        const { error } = await supabase.from(mutation.table).insert(mutation.data);
        if (error) throw error;
      } else if (mutation.operation === 'UPDATE') {
        const { error } = await supabase.from(mutation.table).update(mutation.data).eq('id', mutation.data.id);
        if (error) throw error;
      } else if (mutation.operation === 'DELETE') {
        const { error } = await supabase.from(mutation.table).delete().eq('id', mutation.data.id);
        if (error) throw error;
      }
      
      const table = (db as any)[mutation.table];
      if (mutation.operation !== 'DELETE') {
         await table.update(mutation.data.id, { _synced: true });
      }
      await db.mutations.delete(mutation.id);
    } catch (e) {
      console.error('Sync failed for mutation', mutation, e);
      break; 
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', syncToServer);
}
