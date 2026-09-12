'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Activity, CalendarPlus, HeartPulse, AlertTriangle, Clock } from 'lucide-react';

export default function PatientDetail() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    async function loadPatientData() {
      setLoading(true);

      // Fetch patient
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      
      setPatient(patientData);

      // Fetch vitals
      const { data: vitalsData } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setVitals(vitalsData || []);

      // Fetch visits
      const { data: visitsData } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', id)
        .order('visit_date', { ascending: false })
        .limit(5);

      setVisits(visitsData || []);

      // Fetch timeline
      const { data: timelineData } = await supabase
        .from('patient_timeline')
        .select('*')
        .eq('patient_id', id)
        .order('event_at', { ascending: false });

      setTimeline(timelineData || []);

      setLoading(false);
    }

    loadPatientData();
  }, [id, user, supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!patient) {
    return <div>Patient not found</div>;
  }

  const computeAge = (dob: string | null) => {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  const formatAddress = (address: any) => {
    if (!address) return '—';
    return [address.village, address.block, address.district].filter(Boolean).join(', ') || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Link href="/asha/patients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{patient.full_name}</h1>
          {patient.is_high_risk && (
            <Badge variant="destructive" className="ml-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              High Risk
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Link href={`/asha/triage?patient=${id}`}>
              <Activity className="mr-2 h-4 w-4" />
              Start Triage
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Age / Gender</p>
                <p className="font-medium">{computeAge(patient.date_of_birth)} / <span className="capitalize">{patient.gender}</span></p>
              </div>
              <div>
                <p className="text-muted-foreground">Blood Group</p>
                <p className="font-medium">{patient.blood_group || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{patient.phone || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{formatAddress(patient.address)}</p>
              </div>
              {patient.emergency_contact && (
                <div className="col-span-2 border-t pt-2 mt-2">
                  <p className="text-muted-foreground mb-1">Emergency Contact</p>
                  <p className="font-medium">
                    {patient.emergency_contact.name} ({patient.emergency_contact.relationship}) - {patient.emergency_contact.phone}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Chronic Conditions</p>
              <div className="flex flex-wrap gap-2">
                {patient.chronic_conditions?.length ? patient.chronic_conditions.map((c: string) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                )) : <span className="text-sm">None recorded</span>}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {patient.allergies?.length ? patient.allergies.map((a: string) => (
                  <Badge key={a} variant="outline" className="border-red-200 text-red-800">{a}</Badge>
                )) : <span className="text-sm">None recorded</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="vitals">Vitals History</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {timeline.length === 0 ? (
                <p className="text-center text-muted-foreground">No events recorded yet.</p>
              ) : (
                <div className="space-y-8">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="mt-1 bg-slate-100 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-slate-600">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.event_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Vitals</CardTitle>
              <Button size="sm" variant="outline"><HeartPulse className="mr-2 h-4 w-4" /> Record Vitals</Button>
            </CardHeader>
            <CardContent>
              {vitals.length === 0 ? (
                <p className="text-center text-muted-foreground">No vitals recorded.</p>
              ) : (
                <div className="space-y-4">
                  {vitals.map(v => (
                    <div key={v.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <p className="text-xs text-muted-foreground mb-2">{new Date(v.created_at).toLocaleString()}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {v.blood_pressure_systolic && <div>BP: {v.blood_pressure_systolic}/{v.blood_pressure_diastolic}</div>}
                        {v.heart_rate && <div>HR: {v.heart_rate} bpm</div>}
                        {v.temperature && <div>Temp: {v.temperature}°C</div>}
                        {v.spo2 && <div>SpO2: {v.spo2}%</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Visits</CardTitle>
              <Button size="sm" variant="outline"><CalendarPlus className="mr-2 h-4 w-4" /> Log Visit</Button>
            </CardHeader>
            <CardContent>
              {visits.length === 0 ? (
                <p className="text-center text-muted-foreground">No visits recorded.</p>
              ) : (
                <div className="space-y-4">
                  {visits.map(v => (
                    <div key={v.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <p className="text-xs text-muted-foreground mb-1">{new Date(v.visit_date).toLocaleDateString()}</p>
                      <p className="font-medium text-sm capitalize">{v.visit_type.replace('_', ' ')}</p>
                      {v.chief_complaint && <p className="text-sm mt-1">Complaint: {v.chief_complaint}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
