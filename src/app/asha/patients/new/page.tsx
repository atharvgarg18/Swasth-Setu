'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPatient() {
  const { user, facilityId } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    const address = {
      village: formData.get('village'),
      block: formData.get('block'),
      district: formData.get('district'),
      state: formData.get('state'),
      pincode: formData.get('pincode'),
    };

    const emergency_contact = {
      name: formData.get('ec_name'),
      phone: formData.get('ec_phone'),
      relationship: formData.get('ec_relationship'),
    };

    const newPatient = {
      full_name: formData.get('full_name'),
      date_of_birth: formData.get('date_of_birth'),
      gender: formData.get('gender'),
      blood_group: formData.get('blood_group') || null,
      phone: formData.get('phone'),
      address,
      emergency_contact,
      assigned_worker_id: user.id,
      registered_facility_id: facilityId,
      registered_by: user.id,
    };

    const { error: dbError } = await supabase.from('patients').insert(newPatient);

    if (dbError) {
      console.error(dbError);
      setError(t('common.error'));
      setLoading(false);
    } else {
      router.push('/asha/patients');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Link href="/asha/patients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t('asha.actions.register')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
          <CardDescription>Enter the personal details of the patient.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input id="date_of_birth" name="date_of_birth" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select name="gender" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('common.male')}</SelectItem>
                    <SelectItem value="female">{t('common.female')}</SelectItem>
                    <SelectItem value="other">{t('common.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select name="blood_group">
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Address</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="village">Village / Ward</Label>
                  <Input id="village" name="village" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block">Block</Label>
                  <Input id="block" name="block" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" name="district" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">PIN Code</Label>
                  <Input id="pincode" name="pincode" required />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ec_name">Name</Label>
                  <Input id="ec_name" name="ec_name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ec_phone">Phone</Label>
                  <Input id="ec_phone" name="ec_phone" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ec_relationship">Relationship</Label>
                  <Input id="ec_relationship" name="ec_relationship" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? (
                t('common.saving')
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('asha.actions.register')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
