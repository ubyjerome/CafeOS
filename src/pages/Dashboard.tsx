import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/instantdb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/paystack';
import { Package, Receipt, Users, Clock } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: usersData } = db.useQuery({ users: {} });
  const { data: servicesData } = db.useQuery({ services: {} });
  const { data: checkInsData } = db.useQuery({ checkIns: {} });

  const purchases = (purchasesData?.purchases || []) as any[];
  const users = (usersData?.users || []) as any[];
  const services = (servicesData?.services || []) as any[];
  const checkIns = (checkInsData?.checkIns || []) as any[];

  const myPurchases = purchases.filter(p => p.guestId === user?.id);
  const activePurchases = myPurchases.filter(p => p.status === 'paid');
  const activeCheckIns = checkIns.filter(c => c.isActive);
  const guests = users.filter(u => u.role === 'guest');
  const totalRevenue = purchases.filter(p => p.status !== 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

  const isStaff = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground text-sm">
          {isStaff ? 'Manage your café operations' : 'Browse services and manage your purchases'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isStaff ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Check-ins</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCheckIns.length}</div>
                <p className="text-xs text-muted-foreground">Currently in café</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{guests.length}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Services</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{services.length}</div>
                <p className="text-xs text-muted-foreground">Available services</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Total earnings</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Services</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activePurchases.length}</div>
                <p className="text-xs text-muted-foreground">Ready to use</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myPurchases.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
