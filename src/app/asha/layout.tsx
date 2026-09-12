'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Activity, 
  ArrowRightLeft, 
  CalendarCheck,
  Bell,
  AlertTriangle,
  Globe,
  LogOut,
  User,
  Menu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/provider'
import { useI18n } from '@/lib/i18n'
import { useConnectionStatus, useNotifications } from '@/hooks/useRealtime'
import { APP_NAME } from '@/lib/constants'
import { ConnectionStatus } from '@/components/shared/StatusBadge'

const navItems = [
  { icon: Home, labelKey: 'asha.nav.dashboard', path: '/asha' },
  { icon: Users, labelKey: 'asha.nav.patients', path: '/asha/patients' },
  { icon: Activity, labelKey: 'asha.nav.triage', path: '/asha/triage' },
  { icon: ArrowRightLeft, labelKey: 'asha.nav.referrals', path: '/asha/referrals' },
  { icon: CalendarCheck, labelKey: 'asha.nav.followUps', path: '/asha/follow-ups' },
]

export default function AshaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t, setLocale } = useI18n()
  const { user, profile, signOut } = useAuth()
  const { connectionState } = useConnectionStatus()
  const { unreadCount } = useNotifications(user?.id)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm h-16">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold text-emerald-700 md:hidden lg:block">{APP_NAME}</h1>
          <ConnectionStatus state={connectionState} />
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <Button variant="destructive" size="sm" className="hidden sm:flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('asha.actions.sos', 'Emergency SOS')}</span>
          </Button>

          <Button variant="ghost" size="icon" className="relative" aria-label={t('patient.nav.notifications')}>
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-5 flex items-center justify-center bg-red-500 text-white rounded-full">
                {unreadCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" aria-label={t('patient.settings.language')}>
              <Globe className="w-5 h-5 text-slate-600" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('mr')}>मराठी</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center text-sm font-medium h-9 w-9 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full bg-emerald-100 text-emerald-700">
              <User className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-3 py-2 text-sm font-medium text-slate-900 border-b mb-1">
                <div className="font-semibold">{profile?.full_name || user?.email}</div>
                <div className="text-xs text-slate-500">ASHA Worker</div>
              </div>
              <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={(e) => { e.preventDefault(); signOut(); }}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.sign_out')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r z-40 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="p-4 flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/asha' && pathname.startsWith(item.path))
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </div>
          <div className="p-4 border-t">
            <Button variant="destructive" className="w-full flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('asha.actions.sos', 'Emergency SOS')}</span>
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-around z-50 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/asha' && pathname.startsWith(item.path))
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center justify-center w-full py-2 space-y-1 ${
                isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
