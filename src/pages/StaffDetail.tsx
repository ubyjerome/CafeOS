import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, tx } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User as UserType, CheckIn, Purchase } from '@/lib/instantdb';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { ArrowLeft, Shield, UserCog, Ban, CheckCircle, Users, Clock, QrCode } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const StaffDetail: React.FC = () => {
  const { id: staffId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: usersData } = db.useQuery({ users: {} });
  const { data: checkInsData } = db.useQuery({ checkIns: {} });
  const { data: purchasesData } = db.useQuery({ purchases: {} });

  const users = (usersData?.users || []) as UserType[];
  const checkIns = (checkInsData?.checkIns || []) as CheckIn[];
  const purchases = (purchasesData?.purchases || []) as Purchase[];

  const staff = users.find(u => u.id === staffId);

  const isManager = user?.role === 'manager';

  if (!isManager) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Managers only.</p>
      </div>
    );
  }

  if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Staff member not found</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/staff')}>
          Back to Staff
        </Button>
      </div>
    );
  }

  // For staff metrics, we'd ideally track who validated what
  // For now, show general check-in stats during their employment
  const staffCreatedAt = staff.createdAt;
  const totalGuests = users.filter(u => u.role === 'guest').length;
  const totalCheckIns = checkIns.length;

  // Check-ins by day (last 30 days) - general system activity
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const dailyCheckIns = last30Days.map(day => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const count = checkIns.filter(c => c.checkInTime >= dayStart && c.checkInTime <= dayEnd).length;
    return {
      date: format(day, 'MMM d'),
      checkIns: count,
    };
  });

  const handleToggleBan = () => {
    if (staff.id === user?.id) {
      toast.error("You can't ban yourself");
      return;
    }

    db.transact([
      tx.users[staff.id].update({
        isBanned: !staff.isBanned,
        updatedAt: Date.now(),
      }),
    ]);
    toast.success(staff.isBanned ? 'Staff unbanned' : 'Staff banned');
  };

  const handleRemove = () => {
    if (staff.id === user?.id) {
      toast.error("You can't remove yourself");
      return;
    }

    if (!confirm('Are you sure you want to remove this staff member?')) return;

    db.transact([tx.users[staff.id].delete()]);
    toast.success('Staff member removed');
    navigate('/staff');
  };

  return (
    <div className="fade-in">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/staff')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Staff
      </Button>

      {/* Staff Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                {staff.role === 'manager' ? (
                  <Shield className="h-8 w-8 text-primary" />
                ) : (
                  <UserCog className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold">{staff.name}</h1>
                  <Badge variant={staff.role === 'manager' ? 'default' : 'secondary'}>
                    {staff.role}
                  </Badge>
                  {staff.isBanned && <Badge variant="destructive">Banned</Badge>}
                  {staff.id === user?.id && <Badge variant="outline">You</Badge>}
                </div>
                <p className="text-muted-foreground">{staff.email}</p>
                {staff.phone && <p className="text-sm text-muted-foreground">{staff.phone}</p>}
              </div>
            </div>
            {staff.id !== user?.id && (
              <div className="flex gap-2">
                <Button
                  variant={staff.isBanned ? 'outline' : 'secondary'}
                  onClick={handleToggleBan}
                >
                  {staff.isBanned ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Unban</>
                  ) : (
                    <><Ban className="h-4 w-4 mr-2" /> Ban</>
                  )}
                </Button>
                <Button variant="destructive" onClick={handleRemove}>
                  Remove
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{staff.role}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Joined</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{format(new Date(staff.createdAt), 'MMM d, yyyy')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGuests}</div>
            <p className="text-xs text-muted-foreground">System-wide</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCheckIns}</div>
            <p className="text-xs text-muted-foreground">System-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* System Activity Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">System Check-ins (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyCheckIns}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Check-ins']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '4px', fontSize: '12px' }}
                />
                <Bar dataKey="checkIns" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Staff Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {staff.role === 'manager' ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Create, edit, and manage services</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Add and remove staff members</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>View and manage all guests</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Access analytics and reports</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Update company settings</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Validate QR codes and manage check-ins</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Validate QR codes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Manage check-ins (pause, resume, checkout)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>View guest profiles and history</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Print receipts for guests</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDetail;
