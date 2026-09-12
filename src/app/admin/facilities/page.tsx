'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Phone, Bed, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FacilityData {
  id: string;
  name: string;
  type: string;
  phone: string;
  bed_capacity: number;
  services: string[];
  stock_alerts: number;
  diagnostic_count: number;
}

export default function FacilitiesPage() {
  const { district, facilityId, hasRole } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDistrictAdmin = hasRole('district_admin');

  useEffect(() => {
    async function loadFacilities() {
      setIsLoading(true);
      setError(null);
      try {
        let query = supabase.from('facilities').select('id, name, type, phone, bed_capacity, services');
        
        if (isDistrictAdmin && district) {
          query = query.eq('district', district);
        } else if (facilityId) {
          query = query.eq('id', facilityId);
        } else {
          throw new Error('No facilities configured for this admin.');
        }

        const { data: facs, error: facError } = await query;
        if (facError) throw facError;

        // Fetch stock and diagnostic stats per facility
        const facilitiesWithStats = await Promise.all(
          (facs || []).map(async (f) => {
            const { count: stockAlerts } = await supabase
              .from('medicine_stock')
              .select('*', { count: 'exact', head: true })
              .eq('facility_id', f.id)
              .in('status', ['low_stock', 'out_of_stock']);

            const { count: diagCount } = await supabase
              .from('diagnostic_availability')
              .select('*', { count: 'exact', head: true })
              .eq('facility_id', f.id)
              .eq('is_available', true);

            return {
              ...f,
              stock_alerts: stockAlerts || 0,
              diagnostic_count: diagCount || 0,
            };
          })
        );

        setFacilities(facilitiesWithStats);
      } catch (err: any) {
        console.error('Error loading facilities:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadFacilities();
  }, [district, facilityId, isDistrictAdmin, supabase]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.facilities', 'Facilities Management')}</h1>
        <p className="text-gray-500">
          {isDistrictAdmin ? `Managing facilities in ${district}` : 'Managing your facility'}
        </p>
      </div>

      <div className="space-y-4">
        {facilities.map((fac) => (
          <Card key={fac.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                    {fac.name}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-4">
                    <Badge variant="secondary" className="uppercase tracking-wider text-xs">
                      {fac.type.replace('_', ' ')}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3" /> {fac.phone || 'N/A'}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex gap-3">
                  <div className="text-center px-3 py-1 bg-gray-50 rounded-md border">
                    <div className="text-xs text-gray-500 uppercase flex items-center gap-1"><Bed className="h-3 w-3"/> Beds</div>
                    <div className="font-bold">{fac.bed_capacity || 0}</div>
                  </div>
                  <div className={`text-center px-3 py-1 rounded-md border ${fac.stock_alerts > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <div className="text-xs uppercase flex items-center gap-1">
                      {fac.stock_alerts > 0 ? <AlertCircle className="h-3 w-3"/> : <CheckCircle2 className="h-3 w-3"/>}
                      Stock Alerts
                    </div>
                    <div className="font-bold">{fac.stock_alerts}</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion className="w-full">
                <AccordionItem value="services" className="border-none">
                  <AccordionTrigger className="py-2 text-sm text-gray-600 hover:text-gray-900">
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Services & Capabilities ({fac.services?.length || 0} Services, {fac.diagnostic_count} Diagnostics)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Available Services</h4>
                        <div className="flex flex-wrap gap-2">
                          {fac.services?.map(s => (
                            <Badge key={s} variant="outline" className="bg-white">{s}</Badge>
                          )) || <span className="text-sm text-gray-500">None</span>}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Quick Stats</h4>
                        <ul className="text-sm space-y-1 text-gray-600">
                          <li>â€¢ Active Diagnostics: {fac.diagnostic_count}</li>
                          <li>â€¢ Bed Capacity: {fac.bed_capacity}</li>
                          <li>â€¢ Low/Out of Stock Medicines: {fac.stock_alerts}</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
