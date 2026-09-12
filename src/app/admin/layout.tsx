'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Building2, 
  ArrowRightLeft, 
  BarChart3,
  Bell,
  Globe,
  LogOut,
  User,
  ShieldCheck
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
  { icon: LayoutDashboard, labelKey: 'admin.nav.dashboard', path: '/admin' },
  { icon: Building2, labelKey: 'admin.nav.facilities', path: '/admin/facilities' },
  { icon: ArrowRightLeft, labelKey: 'admin.nav.referrals', path: '/admin/referrals' },
  { icon: BarChart3, labelKey: 'admin.nav.analytics', path: '/admin/analytics' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t, setLocale } = useI18n()
  const { user, profile, signOut } = useAuth()
  const { connectionState } = useConnectionStatus()
  const { unreadCount } = useNotifications(user?.id)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <ShieldCheck className="w-6 h-6 text-emerald-400 mr-2" />
          <h1 className="text-xl font-bold tracking-tight">{APP_NAME} Admin</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-slate-200 truncate">{profile?.full_name || 'Admin'}</span>
              <span className="text-xs text-slate-400 truncate">{user?.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b shadow-sm h-16 z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h1 className="text-lg font-bold text-slate-900">Admin</h1>
            </div>
            <ConnectionStatus state={connectionState} />
          </div>
          
          <div className="flex items-center space-x-3">
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
              <DropdownMenuTrigger className="hidden sm:inline-flex items-center justify-center gap-2 h-9 rounded-full px-3 bg-slate-50 border border-slate-200 text-sm font-medium hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium">{profile?.full_name?.split(' ')[0] || 'Admin'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={(e) => { e.preventDefault(); signOut(); }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('auth.sign_out')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Mobile Admin menu triggers for nav can go here if needed, but keeping it simple for now */}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        {/* Mobile Navigation (Minimal for Admin since it's desktop first) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-around z-50 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
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
    </div>
  )
}
