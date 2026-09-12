'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ListOrdered, 
  Stethoscope, 
  ArrowRightLeft, 
  Users,
  Bell,
  Globe,
  LogOut,
  User,
  Menu,
  ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/lib/auth/provider'
import { useI18n } from '@/lib/i18n'
import { useConnectionStatus, useNotifications } from '@/hooks/useRealtime'
import { APP_NAME } from '@/lib/constants'
import { ConnectionStatus } from '@/components/shared/StatusBadge'

const navItems = [
  { icon: LayoutDashboard, labelKey: 'doctor.nav.dashboard', path: '/doctor' },
  { icon: ListOrdered, labelKey: 'doctor.nav.queue', path: '/doctor/queue' },
  { icon: Stethoscope, labelKey: 'doctor.nav.consultations', path: '/doctor/consultations' },
  { icon: ArrowRightLeft, labelKey: 'doctor.nav.referrals', path: '/doctor/referrals' },
  { icon: Users, labelKey: 'doctor.nav.patients', path: '/doctor/patients' },
]

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t, setLocale } = useI18n()
  const { user, profile, signOut } = useAuth()
  const { connectionState } = useConnectionStatus()
  const { unreadCount } = useNotifications(user?.id)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const renderNavItems = () => (
    <div className="flex-1 space-y-1 p-3">
      {navItems.map((item) => {
        const isActive = pathname === item.path || (item.path !== '/doctor' && pathname.startsWith(item.path))
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
              isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={collapsed ? t(item.labelKey) : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium truncate">{t(item.labelKey)}</span>}
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-white border-r transition-all duration-300 z-20 ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {!collapsed && <h1 className="text-xl font-bold text-emerald-700 truncate">{APP_NAME}</h1>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto" aria-label="Toggle Sidebar">
            {collapsed ? <Menu className="w-5 h-5 text-slate-600" /> : <ChevronLeft className="w-5 h-5 text-slate-600" />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderNavItems()}
        </div>
      </aside>

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm h-16 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent hover:text-accent-foreground md:hidden cursor-pointer">
                  <Menu className="w-5 h-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="h-16 flex items-center px-4 border-b">
                  <h1 className="text-xl font-bold text-emerald-700">{APP_NAME}</h1>
                </div>
                {renderNavItems()}
              </SheetContent>
            </Sheet>

            <div className="md:hidden">
              <h1 className="text-lg font-bold text-emerald-700">{APP_NAME}</h1>
            </div>
            <div className="hidden sm:flex">
              <ConnectionStatus state={connectionState} />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="sm:hidden flex items-center">
              <ConnectionStatus state={connectionState} />
            </div>

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
                  <div className="text-xs text-slate-500">Doctor</div>
                </div>
                <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={(e) => { e.preventDefault(); signOut(); }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('auth.sign_out')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
