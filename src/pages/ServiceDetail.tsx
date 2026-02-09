import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, tx, generateQRCode } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, generateReference, toKobo } from '@/lib/paystack';
import type { Service, Purchase, CheckIn, User as UserType } from '@/lib/instantdb';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { ArrowLeft, Package, Users, DollarSign, Clock, TrendingUp, Edit, Save, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { id } from '@instantdb/react';
import { usePaystackPayment } from 'react-paystack';
import { Configs } from '@/configs';

const ServiceDetail: React.FC = () => {
  const { id: serviceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const { data: servicesData } = db.useQuery({ services: {} });
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: checkInsData } = db.useQuery({ checkIns: {} });
  const { data: usersData } = db.useQuery({ users: {} });

  const services = (servicesData?.services || []) as Service[];
  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const checkIns = (checkInsData?.checkIns || []) as CheckIn[];
  const users = (usersData?.users || []) as UserType[];

  const service = services.find(s => s.id === serviceId);
  const servicePurchases = purchases.filter(p => p.serviceId === serviceId).sort((a, b) => b.createdAt - a.createdAt);
  const serviceCheckIns = checkIns.filter(c => {
    const purchase = purchases.find(p => p.id === c.purchaseId);
    return purchase?.serviceId === serviceId;
  });

  const [editForm, setEditForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    type: service?.type || 'one-off',
    duration: service?.duration || 60,
    isPublic: service?.isPublic ?? true,
    isActive: service?.isActive ?? true,
  });

  const isManager = user?.role === 'manager';
  const isStaff = user?.role === 'admin' || user?.role === 'manager';
  const isGuest = user?.role === 'guest';

  if (!service) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Service not found</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/services')}>
          Back to Services
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalRevenue = servicePurchases.filter(p => p.status !== 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalPurchases = servicePurchases.length;
  const activePurchases = servicePurchases.filter(p => p.status === 'paid');
  const uniqueGuests = new Set(servicePurchases.map(p => p.guestId)).size;
  const activeCheckIns = serviceCheckIns.filter(c => c.isActive);

  // Revenue by day (last 30 days)
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const dailyRevenue = last30Days.map(day => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const dayPurchases = servicePurchases.filter(p => p.createdAt >= dayStart && p.createdAt <= dayEnd && p.status !== 'pending');
    const revenue = dayPurchases.reduce((sum, p) => sum + p.amount, 0);
    return {
      date: format(day, 'MMM d'),
      revenue,
      purchases: dayPurchases.length,
    };
  });

  // Check-ins by day (last 30 days)
  const dailyCheckIns = last30Days.map(day => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const count = serviceCheckIns.filter(c => c.checkInTime >= dayStart && c.checkInTime <= dayEnd).length;
    return {
      date: format(day, 'MMM d'),
      checkIns: count,
    };
  });

  const typeLabels: Record<string, string> = {
    'one-off': 'One-time',
    'daily': 'Daily Pass',
    'weekly': 'Weekly Pass',
    'monthly': 'Monthly Pass',
    'fixed-time': `${service.duration} min`,
  };

  const handleSaveEdit = () => {
    if (!editForm.name || editForm.price <= 0) {
      toast.error('Please fill name and price');
      return;
    }

    db.transact([
      tx.services[service.id].update({
        name: editForm.name,
        description: editForm.description,
        price: editForm.price,
        type: editForm.type as Service['type'],
        duration: editForm.type === 'fixed-time' ? editForm.duration : undefined,
        isPublic: editForm.isPublic,
        isActive: editForm.isActive,
        updatedAt: Date.now(),
      }),
    ]);
    toast.success('Service updated');
    setIsEditing(false);
  };

  const handlePurchase = () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      return;
    }

    const reference = generateReference();
    const config = {
      reference,
      email: user.email,
      amount: toKobo(service.price),
      publicKey: Configs.paystack.public_key,
    };

    const onSuccess = () => {
      const purchaseId = id();
      db.transact([
        tx.purchases[purchaseId].update({
          guestId: user.id,
          serviceId: service.id,
          serviceName: service.name,
          serviceType: service.type,
          amount: service.price,
          paymentReference: reference,
          qrCode: generateQRCode(),
          status: 'paid',
          progressUsed: 0,
          progressTotal: service.type === 'weekly' ? 7 : service.type === 'monthly' ? 30 : 1,
          createdAt: Date.now(),
        }),
      ]);
      toast.success('Purchase successful! Check your purchases for QR code.');
    };

    toast.info('Redirecting to payment...');
  };

  return (
    <div className="fade-in">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/services')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Services
      </Button>

      {/* Service Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₦)</Label>
                  <Input
                    type="number"
                    value={editForm.price}
                    onChange={e => setEditForm(f => ({ ...f, price: Number(e.target.value) }))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={v => setEditForm(f => ({ ...f, type: v as Service['type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-off">One-time</SelectItem>
                      <SelectItem value="daily">Daily Pass</SelectItem>
                      <SelectItem value="weekly">Weekly Pass</SelectItem>
                      <SelectItem value="monthly">Monthly Pass</SelectItem>
                      <SelectItem value="fixed-time">Fixed Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editForm.type === 'fixed-time' && (
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={editForm.duration}
                    onChange={e => setEditForm(f => ({ ...f, duration: Number(e.target.value) }))}
                    min={1}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Public</div>
                  <p className="text-xs text-muted-foreground">Visible to guests</p>
                </div>
                <Switch
                  checked={editForm.isPublic}
                  onCheckedChange={v => setEditForm(f => ({ ...f, isPublic: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Active</div>
                  <p className="text-xs text-muted-foreground">Available for purchase</p>
                </div>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={v => setEditForm(f => ({ ...f, isActive: v }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-semibold">{service.name}</h1>
                    <Badge variant="secondary">{typeLabels[service.type]}</Badge>
                    {!service.isActive && <Badge variant="destructive">Inactive</Badge>}
                    {!service.isPublic && <Badge variant="outline">Private</Badge>}
                  </div>
                  <p className="text-muted-foreground mt-1">{service.description}</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(service.price)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {isManager && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                )}
                {isGuest && service.isActive && (
                  <Button onClick={handlePurchase}>Purchase</Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid - Only for staff */}
      {isStaff && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
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
                <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPurchases}</div>
                <p className="text-xs text-muted-foreground">{activePurchases.length} active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unique Guests</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueGuests}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Check-ins</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCheckIns.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyRevenue}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '4px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorRevenue)" />
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
          </div>

          {/* Currently Checked-in Users */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Currently Checked In ({activeCheckIns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeCheckIns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active check-ins</p>
              ) : (
                <div className="space-y-2">
                  {activeCheckIns.map(c => {
                    const guest = users.find(u => u.id === c.guestId);
                    return (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {guest?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="font-medium">{guest?.name || 'Unknown'}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Since {format(new Date(c.checkInTime), 'h:mm a')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Purchases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              {servicePurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchases</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {servicePurchases.slice(0, 20).map(p => {
                    const guest = users.find(u => u.id === p.guestId);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <div>
                          <span className="font-medium">{guest?.name || 'Unknown'}</span>
                          <Badge className="ml-2" variant={p.status === 'paid' ? 'default' : 'secondary'}>
                            {p.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(p.createdAt), 'MMM d, yyyy')}
                          </span>
                          <span className="font-medium">{formatCurrency(p.amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ServiceDetail;
