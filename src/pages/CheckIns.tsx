import React, { useState, useEffect } from 'react';
import { db, tx } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, LogOut, User } from 'lucide-react';
import { format, formatDistanceStrict } from 'date-fns';
import type { CheckIn, Purchase, User as UserType } from '@/lib/instantdb';

const ActiveCheckInCard: React.FC<{
  checkIn: CheckIn;
  purchase: Purchase | undefined;
  guest: UserType | undefined;
  onPause: () => void;
  onResume: () => void;
  onCheckOut: () => void;
}> = ({ checkIn, purchase, guest, onPause, onResume, onCheckOut }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const now = Date.now();
      let totalActive = 0;
      
      if (checkIn.pausedAt) {
        // Timer is paused
        totalActive = checkIn.pausedAt - checkIn.checkInTime - checkIn.totalPausedTime;
      } else {
        // Timer is running
        totalActive = now - checkIn.checkInTime - checkIn.totalPausedTime;
      }
      
      const hours = Math.floor(totalActive / (1000 * 60 * 60));
      const minutes = Math.floor((totalActive % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((totalActive % (1000 * 60)) / 1000);
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [checkIn]);

  const isPaused = !!checkIn.pausedAt;

  return (
    <Card className="">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">{guest?.name || 'Unknown Guest'}</div>
              <div className="text-sm text-muted-foreground">{purchase?.serviceName}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`font-mono text-lg font-semibold ${isPaused ? 'text-warning' : 'text-primary'}`}>
                {elapsed}
              </span>
              {isPaused && <Badge variant="outline" className="text-xs">Paused</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              Started {format(new Date(checkIn.checkInTime), 'h:mm a')}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          {isPaused ? (
            <Button size="sm" variant="outline" onClick={onResume}>
              <Play className="h-4 w-4 mr-1" /> Resume
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" /> Pause
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={onCheckOut}>
            <LogOut className="h-4 w-4 mr-1" /> Check Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const CheckIns: React.FC = () => {
  const { user } = useAuth();
  const { data: checkInsData } = db.useQuery({ checkIns: {} });
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: usersData } = db.useQuery({ users: {} });

  const checkIns = (checkInsData?.checkIns || []) as CheckIn[];
  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const users = (usersData?.users || []) as UserType[];

  const activeCheckIns = checkIns.filter(c => c.isActive).sort((a, b) => b.checkInTime - a.checkInTime);
  const pastCheckIns = checkIns.filter(c => !c.isActive).sort((a, b) => b.checkInTime - a.checkInTime).slice(0, 20);

  const getPurchase = (id: string) => purchases.find(p => p.id === id);
  const getGuest = (id: string) => users.find(u => u.id === id);

  const handlePause = (checkIn: CheckIn) => {
    db.transact([
      tx.checkIns[checkIn.id].update({
        pausedAt: Date.now(),
      }),
    ]);
  };

  const handleResume = (checkIn: CheckIn) => {
    const pauseDuration = Date.now() - (checkIn.pausedAt || Date.now());
    db.transact([
      tx.checkIns[checkIn.id].update({
        pausedAt: null,
        totalPausedTime: checkIn.totalPausedTime + pauseDuration,
      }),
    ]);
  };

  const handleCheckOut = (checkIn: CheckIn) => {
    const now = Date.now();
    let totalPaused = checkIn.totalPausedTime;
    
    // If currently paused, add remaining pause time
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
    const purchase = getPurchase(checkIn.purchaseId);
    if (purchase && purchase.progressTotal && purchase.progressTotal > 1) {
      const newProgress = (purchase.progressUsed || 0) + 1;
      const updates: Record<string, any> = { progressUsed: newProgress };
      
      if (newProgress >= purchase.progressTotal) {
        updates.status = 'consumed';
      }
      
      db.transact([tx.purchases[purchase.id].update(updates)]);
    }
  };

  const isStaff = user?.role === 'admin' || user?.role === 'manager';

  if (!isStaff) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Staff only.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Check-ins</h1>
        <p className="text-muted-foreground text-sm">Manage active sessions and timers</p>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Active Sessions ({activeCheckIns.length})
        </h2>
        {activeCheckIns.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No active check-ins</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeCheckIns.map(checkIn => (
              <ActiveCheckInCard
                key={checkIn.id}
                checkIn={checkIn}
                purchase={getPurchase(checkIn.purchaseId)}
                guest={getGuest(checkIn.guestId)}
                onPause={() => handlePause(checkIn)}
                onResume={() => handleResume(checkIn)}
                onCheckOut={() => handleCheckOut(checkIn)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">Recent Sessions</h2>
        {pastCheckIns.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No past sessions</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pastCheckIns.map(checkIn => {
              const guest = getGuest(checkIn.guestId);
              const purchase = getPurchase(checkIn.purchaseId);
              const duration = (checkIn.checkOutTime || Date.now()) - checkIn.checkInTime - checkIn.totalPausedTime;
              
              return (
                <Card key={checkIn.id} className="p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{guest?.name || 'Unknown'}</span>
                      <span className="text-muted-foreground"> · {purchase?.serviceName}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {format(new Date(checkIn.checkInTime), 'MMM d, h:mm a')} · {formatDistanceStrict(0, duration)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckIns;
