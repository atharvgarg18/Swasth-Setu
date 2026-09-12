'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, AlertTriangle } from 'lucide-react';

export default function PatientList() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    async function loadPatients() {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('assigned_worker_id', user!.id)
        .order('full_name');

      if (!error && data) {
        setPatients(data);
      }
      setLoading(false);
    }

    loadPatients();
  }, [user, supabase]);

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const computeAge = (dob: string | null) => {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  const formatAddress = (address: any) => {
    if (!address) return '—';
    return [address.village, address.block].filter(Boolean).join(', ') || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('asha.nav.patients')}</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/asha/patients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            {t('asha.actions.register')}
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('asha.patients.search')}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <Link key={patient.id} href={`/asha/patients/${patient.id}`}>
              <Card className="hover:border-emerald-500 transition-colors cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{patient.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {patient.gender === 'male' ? t('common.male') : patient.gender === 'female' ? t('common.female') : t('common.other')} • {computeAge(patient.date_of_birth)} {t('common.years')}
                      </p>
                    </div>
                    {patient.is_high_risk && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        High Risk
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">{t('common.phone')}:</span> {patient.phone || '—'}</p>
                    <p><span className="text-muted-foreground">{t('common.address')}:</span> {formatAddress(patient.address)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
