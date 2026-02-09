import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/instantdb';
import type { CompanySettings } from '@/lib/instantdb';
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
  InfoIcon,
  CreditCard,
} from 'lucide-react';
import { Configs } from '@/configs';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: ('guest' | 'admin' | 'manager')[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['guest', 'admin', 'manager'] },
  { label: 'Services', href: '/services', icon: Package, roles: ['guest', 'admin'] },
  { label: 'My Purchases', href: '/purchases', icon: Receipt, roles: ['guest'] },
  { label: 'Transactions', href: '/transactions', icon: CreditCard, roles: ['guest', 'manager'] },
  { label: 'Manage Services', href: '/manage-services', icon: Package, roles: ['manager'] },
  { label: 'Check-ins', href: '/checkins', icon: Clock, roles: ['admin', 'manager'] },
  { label: 'Validate QR', href: '/validate', icon: QrCode, roles: ['admin', 'manager'] },
  { label: 'Guests', href: '/guests', icon: Users, roles: ['admin', 'manager'] },
  { label: 'Staff', href: '/staff', icon: UserCog, roles: ['manager'] },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['manager'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['guest', 'admin', 'manager'] },
  { label: 'About', href: '/about', icon: InfoIcon, roles: ['guest', 'admin', 'manager'] },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { data: settingsData } = db.useQuery({ companySettings: {} });
  
  const companySettings = (settingsData?.companySettings?.[0] || null) as CompanySettings | null;
  const filteredItems = navItems.filter(item => user && item.roles.includes(user.role));

  const getRoleBadge = () => {
    if (!user) return null;
    const roleConfig = {
      guest: { label: 'Guest', className: 'bg-secondary text-secondary-foreground' },
      admin: { label: 'Admin', className: 'bg-primary/10 text-primary' },
      manager: { label: 'Manager', className: 'bg-success/10 text-success' },
    };
    const config = roleConfig[user.role];
    return (
      <span className={cn('text-xs px-2 py-0.5 rounded', config.className)}>
        {config.label}
      </span>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        {/* Logo and Company */}
        
        <div className="flex items-center border-b border-border px-4 py-4">
          <img
            src={companySettings?.logoUrl || '/icon.svg'}
            alt={companySettings?.name || 'CafeOS'}
            className="h-10 w-10 rounded object-contain"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">
              {companySettings?.name || 'CafeOS'}
            </h1>
            <p className="text-xs text-muted-foreground">Café Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
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

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={Configs.getAvatar(user?.id) || '/avatar-placeholder.png'}
              alt={user?.name || 'User Avatar'}
              className="h-9 w-9 rounded-full object-cover bg-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <div className="flex items-center gap-2">
                {getRoleBadge()}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
};
