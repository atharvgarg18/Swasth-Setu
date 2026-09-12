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
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <div className="flex flex-col min-h-screen bg-white">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm h-14">
        <h1 className="text-xl font-semibold text-emerald-700 tracking-tight">{APP_NAME}</h1>
        
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="relative text-slate-600" aria-label={t('patient.nav.notifications')}>
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge className="absolute top-0 right-0 px-1 min-w-[1.25rem] h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 w-10 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-slate-600" aria-label={t('patient.settings.language')}>
              <Globe className="w-6 h-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => setLocale('en')} className="text-base py-2">English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('mr')} className="text-base py-2">मराठी</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-md mx-auto w-full px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation PWA */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-between px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="flex w-full justify-between max-w-md mx-auto">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/patient' && pathname.startsWith(item.path))
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex flex-col items-center justify-center w-full py-3 space-y-1 ${
                  isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'fill-emerald-100' : ''}`} />
                <span className="text-[11px] font-medium tracking-wide">{t(item.labelKey)}</span>
              </Link>
            )
          })}
          
          {/* More Menu Sheet */}
          <Sheet>
            <SheetTrigger className="flex flex-col items-center justify-center w-full py-3 space-y-1 text-slate-500 hover:text-emerald-600 cursor-pointer">
                <Menu className="w-6 h-6" />
                <span className="text-[11px] font-medium tracking-wide">{t('patient.nav.more', 'More')}</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl px-4 py-6 h-auto">
              <SheetTitle className="sr-only">More Options</SheetTitle>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Link href="/patient/follow-ups" className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-center font-medium">{t('patient.nav.follow_up')}</span>
                </Link>
                <Link href="/patient/prescriptions" className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                    <Pill className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-center font-medium">{t('patient.nav.prescriptions')}</span>
                </Link>
                <Link href="/patient/notifications" className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 relative">
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                  </div>
                  <span className="text-xs text-center font-medium">{t('patient.nav.notifications')}</span>
                </Link>
                <Link href="/patient/settings" className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                    <Settings className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-center font-medium">{t('patient.settings.title')}</span>
                </Link>
              </div>
              
              <div className="border-t pt-4">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2 text-slate-700 h-12 text-base" onClick={signOut}>
                  <LogOut className="w-5 h-5" />
                  {t('auth.sign_out')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  )
}
