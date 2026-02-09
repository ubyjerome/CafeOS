import React, { useState } from 'react';
import { db } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/paystack';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import type { Purchase, CheckIn, User } from '@/lib/instantdb';
import { TrendingUp, Users, DollarSign, Clock } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary-light))', 'hsl(var(--muted-foreground))', 'hsl(var(--accent))'];

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: checkInsData } = db.useQuery({ checkIns: {} });
  const { data: usersData } = db.useQuery({ users: {} });

  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const checkIns = (checkInsData?.checkIns || []) as CheckIn[];
  const users = (usersData?.users || []) as User[];

  const isManager = user?.role === 'manager';

  if (!isManager) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Managers only.</p>
      </div>
    );
  }

  // Revenue by day (last 30 days)
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const dailyRevenue = last30Days.map(day => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const dayPurchases = purchases.filter(p => p.createdAt >= dayStart && p.createdAt <= dayEnd && p.status !== 'pending');
    const revenue = dayPurchases.reduce((sum, p) => sum + p.amount, 0);
    return {
      date: format(day, 'MMM d'),
      revenue,
      purchases: dayPurchases.length,
    };
  });

  // Revenue by month (last 12 months)
  const last12Months = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date(),
  });

  const monthlyRevenue = last12Months.map(month => {
    const monthStart = startOfMonth(month).getTime();
    const monthEnd = endOfMonth(month).getTime();
    const monthPurchases = purchases.filter(p => p.createdAt >= monthStart && p.createdAt <= monthEnd && p.status !== 'pending');
    const revenue = monthPurchases.reduce((sum, p) => sum + p.amount, 0);
    return {
      date: format(month, 'MMM yyyy'),
      revenue,
      purchases: monthPurchases.length,
    };
  });

  // Check-ins by day (last 30 days)
  const dailyCheckIns = last30Days.map(day => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const count = checkIns.filter(c => c.checkInTime >= dayStart && c.checkInTime <= dayEnd).length;
    return {
      date: format(day, 'MMM d'),
      checkIns: count,
    };
  });

  // Service type breakdown
  const serviceBreakdown = purchases.reduce((acc, p) => {
    if (p.status !== 'pending') {
      acc[p.serviceType] = (acc[p.serviceType] || 0) + p.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(serviceBreakdown).map(([name, value]) => ({ name, value }));

  // Summary stats
  const totalRevenue = purchases.filter(p => p.status !== 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalGuests = users.filter(u => u.role === 'guest').length;
  const totalCheckIns = checkIns.length;
  const avgSessionTime = checkIns
    .filter(c => c.checkOutTime)
    .reduce((sum, c) => sum + ((c.checkOutTime! - c.checkInTime - c.totalPausedTime) / (1000 * 60)), 0) / (checkIns.filter(c => c.checkOutTime).length || 1);

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Revenue and usage insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGuests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCheckIns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgSessionTime)} min</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Revenue</CardTitle>
              <Tabs value={period} onValueChange={v => setPeriod(v as 'daily' | 'monthly')}>
                <TabsList className="h-8">
                  <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={period === 'daily' ? dailyRevenue : monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `₦${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Check-ins (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCheckIns}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Check-ins']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="checkIns" 
                    fill="hsl(var(--primary))" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-sm" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm capitalize">{entry.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
