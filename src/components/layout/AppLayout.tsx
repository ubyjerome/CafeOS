import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { db } from '@/lib/instantdb';
import { CompanySettings } from '@/lib/instantdb';

export const AppLayout: React.FC = () => {
  const { data: settingsData } = db.useQuery({ companySettings: {} });
  const companySettings = (settingsData?.companySettings?.[0] ||
    null) as CompanySettings | null
  const { user, isLoading } = useAuth();
  const loaderImgUrl = companySettings?.logoUrl || `/logo.png?${Date.now()}`

if (isLoading) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <img
          src={loaderImgUrl}
          alt="Loading"
          className="h-16 w-16 mx-auto mb-4 animate-pulse"
        />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}


  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
