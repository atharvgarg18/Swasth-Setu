'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { useI18n } from '@/lib/i18n';
import { APP_NAME, DEMO_CREDENTIALS, ROLE_LABELS, LOCALE_NAMES, SUPPORTED_LOCALES } from '@/lib/constants';
import type { SupportedLocale, UserRole } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';

const ROLE_SUBTITLES: Record<string, Record<SupportedLocale, string>> = {
  patient: { en: 'Check symptoms, track referrals, see your record.', hi: 'लक्षण जांचें, रेफरल ट्रैक करें, रिकॉर्ड देखें।', mr: 'लक्षणे तपासा, रेफरल ट्रॅक करा.' },
  asha: { en: 'Register patients, run triage, manage your caseload.', hi: 'मरीज़ दर्ज करें, ट्राइज करें, कार्यभार प्रबंधित करें।', mr: 'रुग्ण नोंदवा, ट्रायज करा.' },
  doctor: { en: 'Video consultations, prescriptions, referrals.', hi: 'वीडियो परामर्श, नुस्खे, रेफरल।', mr: 'व्हिडिओ सल्ला, प्रिस्क्रिप्शन.' },
  admin: { en: 'Facility metrics, analytics, district overview.', hi: 'सुविधा मेट्रिक्स, विश्लेषण, जिला अवलोकन।', mr: 'सुविधा मेट्रिक्स, विश्लेषण.' },
};

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
    <div className="min-h-screen flex" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>

      {/* ── Left: Brand panel (hidden on mobile) ─────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 border-r p-10"
           style={{ borderColor: 'oklch(0.84 0.012 80)' }}>
        <div>
          <p className="text-xs font-medium tracking-widest uppercase mb-12"
             style={{ color: 'oklch(0.47 0.012 60)' }}>
            {APP_NAME}
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-4"
              style={{ color: 'oklch(0.15 0.012 60)' }}>
            {locale === 'mr'
              ? 'एक रुग्ण नोंद.\nसतत आरोग्य सेवा.'
              : 'One patient record.\nContinuous care.'}
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'oklch(0.47 0.012 60)' }}>
            {locale === 'mr'
              ? 'रेफरल, ट्रायज आणि फॉलो-अप साठी एक सातत्य स्तर.'
              : 'A continuity layer for referrals, triage and follow-up across all facility tiers.'}
          </p>
        </div>

        {/* Role cards — like inspiration image 3 */}
        <div className="space-y-0 border-t" style={{ borderColor: 'oklch(0.84 0.012 80)' }}>
          {demoRoles.map((role) => (
            <button
              key={role}
              onClick={() => handleDemoLogin(role)}
              disabled={loadingRole !== null}
              className="w-full text-left py-4 border-b flex items-start gap-3 group transition-colors hover:bg-black/[0.02]"
              style={{ borderColor: 'oklch(0.84 0.012 80)' }}
            >
              <div className="w-0.5 h-full self-stretch rounded-full flex-shrink-0 mt-1"
                   style={{ minHeight: '2.5rem', backgroundColor: 'oklch(0.37 0.09 158)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'oklch(0.15 0.012 60)' }}>
                    {ROLE_LABELS[role as UserRole]?.[locale as SupportedLocale] ?? role}
                  </span>
                  {loadingRole === role
                    ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'oklch(0.37 0.09 158)' }} />
                    : <span className="text-xs group-hover:translate-x-0.5 transition-transform"
                             style={{ color: 'oklch(0.37 0.09 158)' }}>→</span>}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(0.47 0.012 60)' }}>
                  {ROLE_SUBTITLES[role]?.[locale as SupportedLocale] ?? ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Login form ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">

        {/* Language switcher */}
        <div className="absolute top-5 right-5 flex gap-1">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => setLocale(loc as SupportedLocale)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={locale === loc
                ? { backgroundColor: 'oklch(0.37 0.09 158)', color: '#fff' }
                : { backgroundColor: 'oklch(0.90 0.012 80)', color: 'oklch(0.47 0.012 60)' }}
            >
              {LOCALE_NAMES[loc as SupportedLocale]}
            </button>
          ))}
        </div>

        {/* Mobile brand header */}
        <div className="lg:hidden text-center mb-8">
          <p className="text-xs font-medium tracking-widest uppercase mb-3"
             style={{ color: 'oklch(0.47 0.012 60)' }}>{APP_NAME}</p>
          <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.012 60)' }}>
            {locale === 'mr' ? 'एक रुग्ण नोंद. सतत आरोग्य सेवा.' : 'One patient record. Continuous care.'}
          </h1>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'oklch(0.15 0.012 60)' }}>
            {t('auth.loginTitle', { appName: APP_NAME })}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'oklch(0.47 0.012 60)' }}>
            {t('auth.loginSubtitle')}
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded mb-4 text-sm"
                 style={{ backgroundColor: 'oklch(0.95 0.04 24)', border: '1px solid oklch(0.80 0.08 24)', color: 'oklch(0.44 0.18 24)' }}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium"
                     style={{ color: 'oklch(0.25 0.012 60)' }}>
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                autoComplete="email"
                className="h-10 bg-white"
                style={{ border: '1px solid oklch(0.84 0.012 80)' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium"
                     style={{ color: 'oklch(0.25 0.012 60)' }}>
                {t('auth.password')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-10 bg-white"
                style={{ border: '1px solid oklch(0.84 0.012 80)' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'oklch(0.37 0.09 158)', color: '#fff' }}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('auth.login')}
            </button>
          </form>

          {/* Separator */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'oklch(0.84 0.012 80)' }} />
            <span className="text-xs" style={{ color: 'oklch(0.55 0.01 60)' }}>or try a demo account</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'oklch(0.84 0.012 80)' }} />
          </div>

          {/* Mobile role cards */}
          <div className="lg:hidden space-y-0 border-t border-b"
               style={{ borderColor: 'oklch(0.84 0.012 80)' }}>
            {demoRoles.map((role) => (
              <button
                key={role}
                onClick={() => handleDemoLogin(role)}
                disabled={loadingRole !== null}
                className="w-full text-left py-3.5 border-b flex items-center gap-3 hover:bg-black/[0.02] transition-colors"
                style={{ borderColor: 'oklch(0.84 0.012 80)' }}
              >
                <div className="w-0.5 h-8 rounded-full flex-shrink-0"
                     style={{ backgroundColor: 'oklch(0.37 0.09 158)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm" style={{ color: 'oklch(0.15 0.012 60)' }}>
                      {ROLE_LABELS[role as UserRole]?.[locale as SupportedLocale] ?? role}
                    </span>
                    {loadingRole === role
                      ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'oklch(0.37 0.09 158)' }} />
                      : <span className="text-xs" style={{ color: 'oklch(0.37 0.09 158)' }}>→</span>}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(0.55 0.01 60)' }}>
                    {DEMO_CREDENTIALS[role].email}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: show emails only */}
          <div className="hidden lg:block space-y-1">
            {demoRoles.map((role) => (
              <button
                key={role}
                onClick={() => handleDemoLogin(role)}
                disabled={loadingRole !== null}
                className="w-full text-left text-xs flex items-center gap-2 py-1.5 rounded px-2 hover:bg-black/[0.04] transition-colors"
                style={{ color: 'oklch(0.47 0.012 60)' }}
              >
                {loadingRole === role && <Loader2 className="w-3 h-3 animate-spin" />}
                <span className="w-20 flex-shrink-0 font-medium" style={{ color: 'oklch(0.25 0.012 60)' }}>
                  {ROLE_LABELS[role as UserRole]?.[locale as SupportedLocale] ?? role}
                </span>
                <span className="truncate">{DEMO_CREDENTIALS[role].email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-8 text-xs text-center max-w-xs" style={{ color: 'oklch(0.60 0.01 60)' }}>
          Demo application · Does not provide medical advice
        </p>
      </div>
    </div>
  );
}
