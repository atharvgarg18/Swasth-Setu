'use client';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-800">{t('patient.settings.title')}</h1>
      
      <Card>
        <CardHeader><CardTitle>{t('patient.settings.profile')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><p className="text-sm text-muted-foreground">{t('patient.settings.name')}</p><p className="font-medium">{profile?.full_name || '—'}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.settings.phone')}</p><p className="font-medium">{profile?.phone || '—'}</p></div>
          <div><p className="text-sm text-muted-foreground">{t('patient.settings.email')}</p><p className="font-medium">{profile?.email || '—'}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('patient.settings.language')}</CardTitle></CardHeader>
        <CardContent className="flex gap-4">
          <Button variant={locale === 'en' ? 'default' : 'outline'} onClick={() => setLocale('en')}>English</Button>
          <Button variant={locale === 'hi' ? 'default' : 'outline'} onClick={() => setLocale('hi')}>हिंदी</Button>
          <Button variant={locale === 'mr' ? 'default' : 'outline'} onClick={() => setLocale('mr')}>मराठी</Button>
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={signOut} className="w-full">{t('auth.sign_out')}</Button>
    </div>
  );
}
