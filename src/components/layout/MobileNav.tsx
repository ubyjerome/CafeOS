import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/instantdb';
import type { CompanySettings } from '@/lib/instantdb';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Package,
  Receipt,
  QrCode,
  Users,
  UserCog,
  Settings,
  BarChart3,
  LogOut,
  Clock,
  Menu,
  CreditCard,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: ('guest' | 'admin' | 'manager')[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['guest', 'admin', 'manager'] },
  { label: 'Services', href: '/services', icon: Package, roles: ['guest', 'admin', 'manager'] },
  { label: 'My Purchases', href: '/purchases', icon: Receipt, roles: ['guest'] },
  { label: 'Transactions', href: '/transactions', icon: CreditCard, roles: ['guest', 'manager'] },
  { label: 'Manage Services', href: '/manage-services', icon: Package, roles: ['manager'] },
  { label: 'Check-ins', href: '/checkins', icon: Clock, roles: ['admin', 'manager'] },
  { label: 'Validate QR', href: '/validate', icon: QrCode, roles: ['admin', 'manager'] },
  { label: 'Guests', href: '/guests', icon: Users, roles: ['admin', 'manager'] },
  { label: 'Staff', href: '/staff', icon: UserCog, roles: ['manager'] },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['manager'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['guest', 'admin', 'manager'] },
];

export const MobileNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const { data: settingsData } = db.useQuery({ companySettings: {} });
  
  const companySettings = (settingsData?.companySettings?.[0] || null) as CompanySettings | null;
  const filteredItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={companySettings?.logoUrl || '/icon.svg'}
              alt={companySettings?.name || 'CafeOS'}
              className="h-8 w-8 rounded object-contain"
            />
            <span className="font-semibold text-sm">{companySettings?.name || 'CafeOS'}</span>
          </div>
          <SheetTrigger asChild>
            <button className="p-2 hover:bg-secondary rounded">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
        </div>

        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-4">
              <img
                src={companySettings?.logoUrl || '/icon.svg'}
                alt={companySettings?.name || 'CafeOS'}
                className="h-10 w-10 rounded object-contain"
              />
              <div>
                <h1 className="text-sm font-semibold">{companySettings?.name || 'CafeOS'}</h1>
                <p className="text-xs text-muted-foreground">Café Management</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* User */}
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
