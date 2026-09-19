'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileHeart,
  ArrowRightLeft,
  MapPin,
  Menu,
  Bell,
  Globe,
  Settings,
  CalendarCheck,
  Pill,
  LogOut,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/provider'
import { useI18n } from '@/lib/i18n'
import { useNotifications } from '@/hooks/useRealtime'
import { APP_NAME } from '@/lib/constants'

const mainNavItems = [
  { icon: Home, labelKey: 'patient.nav.home', path: '/patient' },
  { icon: FileHeart, labelKey: 'patient.nav.health_record', path: '/patient/health-record' },
  { icon: ArrowRightLeft, labelKey: 'patient.nav.referrals', path: '/patient/referrals' },
  { icon: MapPin, labelKey: 'patient.nav.facilities', path: '/patient/facilities' },
]

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t, setLocale } = useI18n()
  const { user, signOut } = useAuth()
  const { unreadCount } = useNotifications(user?.id)

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>

      {/* ── Minimal Header ───────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-12"
        style={{
          backgroundColor: 'oklch(0.94 0.014 80)',
          borderBottom: '1px solid oklch(0.86 0.012 80)',
        }}
      >
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: 'oklch(0.37 0.09 158)' }}
        >
          {APP_NAME}
        </span>

        <div className="flex items-center gap-0.5">
          {/* Notifications */}
          <Link
            href="/patient/notifications"
            className="relative flex items-center justify-center w-9 h-9 rounded transition-colors hover:bg-black/[0.04]"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" style={{ color: 'oklch(0.35 0.012 60)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ backgroundColor: 'oklch(0.44 0.18 24)' }}
              />
            )}
          </Link>

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center justify-center w-9 h-9 rounded transition-colors hover:bg-black/[0.04] focus-visible:outline-none"
              aria-label="Language"
            >
              <Globe className="w-5 h-5" style={{ color: 'oklch(0.35 0.012 60)' }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-28">
              <DropdownMenuItem onClick={() => setLocale('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('mr')}>मराठी</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-md mx-auto w-full px-4 py-5">
          {children}
        </div>
      </main>

      {/* ── Bottom navigation ────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          backgroundColor: 'oklch(0.94 0.014 80)',
          borderTop: '1px solid oklch(0.86 0.012 80)',
        }}
      >
        <div className="flex w-full justify-between max-w-md mx-auto">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.path ||
              (item.path !== '/patient' && pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex flex-col items-center justify-center flex-1 py-2.5 gap-0.5 transition-colors"
                style={{ color: isActive ? 'oklch(0.37 0.09 158)' : 'oklch(0.52 0.012 60)' }}
              >
                <item.icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.2 : 1.7}
                />
                <span className="text-[10px] font-medium tracking-wide">
                  {t(item.labelKey)}
                </span>
                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute bottom-0 w-8 h-0.5 rounded-t"
                    style={{ backgroundColor: 'oklch(0.37 0.09 158)' }}
                  />
                )}
              </Link>
            )
          })}

          {/* More menu */}
          <Sheet>
            <SheetTrigger
              className="flex flex-col items-center justify-center flex-1 py-2.5 gap-0.5 transition-colors"
              style={{ color: 'oklch(0.52 0.012 60)' }}
            >
              <Menu className="w-5 h-5" strokeWidth={1.7} />
              <span className="text-[10px] font-medium tracking-wide">
                {t('patient.nav.more', 'More')}
              </span>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-xl px-4 py-5 h-auto"
              style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}
            >
              <SheetTitle className="sr-only">More Options</SheetTitle>
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { href: '/patient/follow-ups', icon: CalendarCheck, label: t('patient.nav.follow_up') },
                  { href: '/patient/prescriptions', icon: Pill, label: t('patient.nav.prescriptions') },
                  { href: '/patient/notifications', icon: Bell, label: t('patient.nav.notifications') },
                  { href: '/patient/settings', icon: Settings, label: t('patient.settings.title') },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'oklch(0.90 0.012 80)' }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: 'oklch(0.37 0.09 158)' }} />
                    </div>
                    <span className="text-xs text-center font-medium"
                          style={{ color: 'oklch(0.25 0.012 60)' }}>
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
              <div style={{ borderTop: '1px solid oklch(0.86 0.012 80)', paddingTop: '1rem' }}>
                <button
                  className="w-full flex items-center justify-center gap-2 h-10 rounded text-sm font-medium transition-colors hover:bg-black/[0.04]"
                  style={{ color: 'oklch(0.44 0.18 24)' }}
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.sign_out')}
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  )
}
