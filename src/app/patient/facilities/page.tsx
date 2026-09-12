'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FACILITY_TYPE_LABELS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function FacilitiesPage() {
  const { t, locale } = useI18n();
  const supabase = createClient();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: facs } = await supabase.from('facilities').select('*').eq('is_active', true).order('name');
      if (facs) setFacilities(facs);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.facilities.title')}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {facilities.map(fac => (
          <Card key={fac.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-lg">{fac.name}</span>
                <Badge>{FACILITY_TYPE_LABELS[fac.type as keyof typeof FACILITY_TYPE_LABELS]?.[locale as 'en' | 'mr'] || fac.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{fac.address}</p>
              <div className="text-sm space-y-1">
                <p><strong>{t('patient.facilities.phone')}:</strong> {fac.phone || '—'}</p>
                <p><strong>{t('patient.facilities.beds')}:</strong> {fac.bed_capacity || '—'}</p>
              </div>
              {fac.services?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {fac.services.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
