import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, tx } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/paystack';
import type { User as UserType, Purchase, CheckIn } from '@/lib/instantdb';
import { format, formatDistanceStrict } from 'date-fns';
import { ArrowLeft, User, Clock, Play, Pause, LogOut, Receipt, Package } from 'lucide-react';
import { toast } from 'sonner';

const CheckInDetail: React.FC = () => {
  const { id: checkInId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [elapsed, setElapsed] = useState('');

  const { data: checkInsData } = db.useQuery({ checkIns: {} });
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: usersData } = db.useQuery({ users: {} });

  const checkIns = (checkInsData?.checkIns || []) as CheckIn[];
  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const users = (usersData?.users || []) as UserType[];

  const checkIn = checkIns.find(c => c.id === checkInId);
  const purchase = purchases.find(p => p.id === checkIn?.purchaseId);
  const guest = users.find(u => u.id === checkIn?.guestId);

  const isStaff = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!checkIn) return;

    const calculateElapsed = () => {
      const now = Date.now();
      let totalActive = 0;
      
      if (checkIn.pausedAt) {
        totalActive = checkIn.pausedAt - checkIn.checkInTime - checkIn.totalPausedTime;
      } else if (checkIn.isActive) {
        totalActive = now - checkIn.checkInTime - checkIn.totalPausedTime;
      } else if (checkIn.checkOutTime) {
        totalActive = checkIn.checkOutTime - checkIn.checkInTime - checkIn.totalPausedTime;
      }
      
      const hours = Math.floor(totalActive / (1000 * 60 * 60));
      const minutes = Math.floor((totalActive % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((totalActive % (1000 * 60)) / 1000);
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    calculateElapsed();
    if (checkIn.isActive) {
      const interval = setInterval(calculateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [checkIn]);

  if (!isStaff) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Staff only.</p>
      </div>
    );
  }

  if (!checkIn) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Check-in not found</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/checkins')}>
          Back to Check-ins
        </Button>
      </div>
    );
  }

  const isPaused = !!checkIn.pausedAt;

  const handlePause = () => {
    db.transact([
      tx.checkIns[checkIn.id].update({
        pausedAt: Date.now(),
      }),
    ]);
    toast.success('Timer paused');
  };

  const handleResume = () => {
    const pauseDuration = Date.now() - (checkIn.pausedAt || Date.now());
    db.transact([
      tx.checkIns[checkIn.id].update({
        pausedAt: null,
        totalPausedTime: checkIn.totalPausedTime + pauseDuration,
      }),
    ]);
    toast.success('Timer resumed');
  };

  const handleCheckOut = () => {
    const now = Date.now();
    let totalPaused = checkIn.totalPausedTime;
    
    if (checkIn.pausedAt) {
      totalPaused += now - checkIn.pausedAt;
    }

    db.transact([
      tx.checkIns[checkIn.id].update({
        isActive: false,
        checkOutTime: now,
        pausedAt: null,
        totalPausedTime: totalPaused,
      }),
    ]);

    // Update purchase progress for time-based services
    if (purchase && purchase.progressTotal && purchase.progressTotal > 1) {
      const newProgress = (purchase.progressUsed || 0) + 1;
      const updates: Record<string, any> = { progressUsed: newProgress };
      
      if (newProgress >= purchase.progressTotal) {
        updates.status = 'consumed';
      }
      
      db.transact([tx.purchases[purchase.id].update(updates)]);
    }

    toast.success('Checked out successfully');
  };

  const handleDownloadReceipt = async () => {
    if (!purchase) return;
    
    const { pdf } = await import('@react-pdf/renderer');
    const { ReceiptDocument } = await import('@/components/pdf/ReceiptDocument');
    
    const blob = await pdf(<ReceiptDocument purchase={purchase} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${purchase.paymentReference}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/checkins')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Check-ins
      </Button>

      {/* Check-in Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{guest?.name || 'Unknown Guest'}</h1>
                  {checkIn.isActive ? (
                    isPaused ? (
                      <Badge variant="secondary">Paused</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )
                  ) : (
                    <Badge variant="outline">Completed</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{purchase?.serviceName}</p>
                {guest?.email && <p className="text-sm text-muted-foreground">{guest.email}</p>}
              </div>
            </div>
            {checkIn.isActive && (
              <div className="flex gap-2">
                {isPaused ? (
                  <Button variant="outline" onClick={handleResume}>
                    <Play className="h-4 w-4 mr-2" /> Resume
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handlePause}>
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </Button>
                )}
                <Button variant="destructive" onClick={handleCheckOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Check Out
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timer Display */}
      <Card className="mb-6">
        <CardContent className="py-8 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className={`font-mono text-5xl font-bold ${isPaused ? 'text-warning' : checkIn.isActive ? 'text-primary' : 'text-muted-foreground'}`}>
            {elapsed}
          </div>
          <p className="text-muted-foreground mt-2">
            {checkIn.isActive ? (isPaused ? 'Timer Paused' : 'Active Session') : 'Session Complete'}
          </p>
        </CardContent>
      </Card>

      {/* Session Details */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Check-in Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {format(new Date(checkIn.checkInTime), 'h:mm a')}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(checkIn.checkInTime), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Check-out Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {checkIn.checkOutTime ? format(new Date(checkIn.checkOutTime), 'h:mm a') : '—'}
            </div>
            {checkIn.checkOutTime && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(checkIn.checkOutTime), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paused</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {Math.round(checkIn.totalPausedTime / (1000 * 60))} min
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Service Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {purchase?.progressTotal && purchase.progressTotal > 1 ? (
              <div className="text-lg font-bold">
                {purchase.progressUsed || 0}/{purchase.progressTotal} days
              </div>
            ) : (
              <div className="text-lg font-bold">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Info */}
      {purchase && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Purchase Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{purchase.serviceName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{purchase.serviceType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">{formatCurrency(purchase.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Reference</p>
                <p className="font-mono text-sm">{purchase.paymentReference}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={purchase.status === 'paid' ? 'default' : 'secondary'}>
                  {purchase.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchased On</p>
                <p className="font-medium">{format(new Date(purchase.createdAt), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>
            <Button className="mt-4" variant="outline" onClick={handleDownloadReceipt}>
              <Receipt className="h-4 w-4 mr-2" /> Download Receipt
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Guest Info */}
      {guest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Guest Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{guest.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{guest.email}</p>
              </div>
              {guest.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{guest.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">{format(new Date(guest.createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => navigate(`/guests/${guest.id}`)}
            >
              View Full Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CheckInDetail;
