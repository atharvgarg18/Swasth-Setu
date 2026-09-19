'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, LogOut, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/provider'
import { useI18n } from '@/lib/i18n'
import { useConnectionStatus } from '@/hooks/useRealtime'
import { APP_NAME } from '@/lib/constants'

const navItems = [
  { labelKey: 'doctor.nav.consultations', path: '/doctor/consultations', label: 'Queue' },
  { labelKey: 'doctor.nav.referrals', path: '/doctor/referrals', label: 'Incoming referrals' },
  { labelKey: 'doctor.nav.dashboard', path: '/doctor', label: 'My consultations', exact: true },
  { labelKey: 'doctor.nav.patients', path: '/doctor/patients', label: 'My patients' },
]

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t, setLocale } = useI18n()
  const { user, profile, signOut } = useAuth()
  const { connectionState } = useConnectionStatus()

  const isOnline = connectionState === 'connected'

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-5 px-5">
      {/* Back link */}
      <Link
        href="/"
        className="text-xs mb-5 block transition-colors"
        style={{ color: 'oklch(0.52 0.012 60)' }}
      >
        ← {APP_NAME}
      </Link>

      {/* Doctor identity */}
      <div className="mb-5">
        <p className="font-bold text-base leading-tight" style={{ color: 'oklch(0.15 0.012 60)' }}>
          {profile?.full_name ?? user?.email?.split('@')[0] ?? 'Doctor'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.52 0.012 60)' }}>
          District Hospital · General Medicine
        </p>
      </div>

      {/* Divider */}
      <div className="mb-4" style={{ borderTop: '1px solid oklch(0.84 0.012 80)' }} />

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.path
            : pathname === item.path || pathname.startsWith(item.path + '/')
          return (
            <Link
              key={item.path}
              href={item.path}
              className="block py-1.5 text-sm transition-colors font-medium"
              style={{
                color: isActive ? 'oklch(0.37 0.09 158)' : 'oklch(0.35 0.012 60)',
                textDecoration: isActive ? 'underline' : 'none',
                textUnderlineOffset: '3px',
              }}
            >
              {t(item.labelKey, item.label)}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: sync status + actions */}
      <div className="space-y-2 pt-4" style={{ borderTop: '1px solid oklch(0.84 0.012 80)' }}>
        <p className="text-xs" style={{ color: 'oklch(0.60 0.01 60)' }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
            style={{ backgroundColor: isOnline ? 'oklch(0.55 0.13 155)' : 'oklch(0.60 0.01 60)' }}
          />
          {isOnline ? 'Synced just now' : 'Offline'}
        </p>

        <div className="flex items-center gap-2">
          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1 text-xs focus-visible:outline-none transition-colors hover:opacity-70"
              style={{ color: 'oklch(0.52 0.012 60)' }}
            >
              <Globe className="w-3.5 h-3.5" />
              Language
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem onClick={() => setLocale('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('mr')}>मराठी</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span style={{ color: 'oklch(0.80 0.01 60)' }}>·</span>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
            style={{ color: 'oklch(0.52 0.012 60)' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}>

      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-48 flex-shrink-0 border-r"
        style={{
          backgroundColor: 'oklch(0.92 0.014 80)',
          borderColor: 'oklch(0.84 0.012 80)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Right column ─────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between px-4 h-11 flex-shrink-0 border-b"
          style={{
            backgroundColor: 'oklch(0.92 0.014 80)',
            borderColor: 'oklch(0.84 0.012 80)',
          }}
        >
          <span className="font-semibold text-sm" style={{ color: 'oklch(0.37 0.09 158)' }}>
            {APP_NAME}
          </span>
          <Sheet>
            <SheetTrigger
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-black/[0.05] transition-colors"
            >
              <Menu className="w-5 h-5" style={{ color: 'oklch(0.35 0.012 60)' }} />
            </SheetTrigger>
            <SheetContent side="left" className="w-52 p-0" style={{ backgroundColor: 'oklch(0.92 0.014 80)' }}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: 'oklch(0.94 0.014 80)' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
