'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { APP_NAME, DEMO_CREDENTIALS, ROLE_LABELS, LOCALE_NAMES, SUPPORTED_LOCALES } from '@/lib/constants';
import type { SupportedLocale, UserRole } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Heart, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const { signIn } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      // Middleware will redirect based on role
      router.refresh();
    }
  };

  const handleDemoLogin = async (role: string) => {
    const creds = DEMO_CREDENTIALS[role as keyof typeof DEMO_CREDENTIALS];
    if (!creds) return;

    setError(null);
    setLoadingRole(role);

    const result = await signIn(creds.email, creds.password);
    if (result.error) {
      setError(result.error);
      setLoadingRole(null);
    } else {
      router.refresh();
    }
  };

  const demoRoles = Object.keys(DEMO_CREDENTIALS) as (keyof typeof DEMO_CREDENTIALS)[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex flex-col items-center justify-center p-4">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 flex gap-2">
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc as SupportedLocale)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              locale === loc
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-emerald-50 border border-gray-200'
            }`}
          >
            {LOCALE_NAMES[loc as SupportedLocale]}
          </button>
        ))}
      </div>

      {/* Logo + Title */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{APP_NAME}</h1>
        <p className="text-gray-500 mt-1">{t('common.tagline')}</p>
      </div>

      {/* Login Form */}
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth.loginTitle', { appName: APP_NAME })}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('auth.login')}
            </Button>
          </form>

          <Separator className="my-6" />

          {/* Demo Accounts */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-gray-500">
              {t('auth.demoAccounts')}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {demoRoles.map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  disabled={loadingRole !== null}
                  onClick={() => handleDemoLogin(role)}
                >
                  {loadingRole === role && (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  )}
                  <span className="text-xs text-gray-400 mr-2 w-24">
                    {ROLE_LABELS[role as UserRole]?.[locale as SupportedLocale] ?? role}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {DEMO_CREDENTIALS[role].email}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="mt-6 text-xs text-gray-400 text-center max-w-sm">
        Demo application. This system does not provide medical advice, diagnosis, or treatment.
        Always consult a qualified healthcare professional.
      </p>
    </div>
  );
}
