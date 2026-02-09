import React, { useState } from 'react';
import { db } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/paystack';
import type { Purchase, CompanySettings } from '@/lib/instantdb';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Package } from 'lucide-react';
import { format } from 'date-fns';
import { downloadPdf } from '@/services/pdf';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  paid: 'bg-success/10 text-success',
  consumed: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive',
};

const Purchases: React.FC = () => {
  const { user } = useAuth();
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: settingsData } = db.useQuery({ companySettings: {} });
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const allPurchases = (purchasesData?.purchases || []) as Purchase[];
  const companySettings = (settingsData?.companySettings?.[0] || null) as CompanySettings | null;
  const myPurchases = allPurchases
    .filter(p => p.guestId === user?.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const paginatedPurchases = myPurchases.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(myPurchases.length / pageSize);

  const isConsumedOrExpired = (purchase: Purchase) => {
    return purchase.status === 'consumed' || purchase.status === 'expired';
  };

  const handleDownloadReceipt = async (purchase: Purchase) => {
    await downloadPdf('receipt', purchase, {
      companyName: companySettings?.name,
      companyAddress: companySettings?.address,
    });
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">My Purchases</h1>
        <p className="text-muted-foreground text-sm">View your payment history and QR codes</p>
      </div>

      {myPurchases.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No purchases yet</p>
          <Button className="mt-4" variant="outline" asChild>
            <a href="/services">Browse Services</a>
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedPurchases.map(purchase => (
              <Card key={purchase.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{purchase.serviceName}</span>
                      <Badge className={statusColors[purchase.status]}>{purchase.status}</Badge>
                      {isConsumedOrExpired(purchase) && (
                        <Badge variant="outline" className="text-xs">Validated</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(purchase.createdAt), 'MMM d, yyyy · h:mm a')}
                    </div>
                    {purchase.progressTotal && purchase.progressTotal > 1 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Progress: {purchase.progressUsed || 0}/{purchase.progressTotal} days used
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(purchase.amount)}</span>
                    <div className="flex gap-2">
                      {/* Only show QR code button for active (paid) purchases */}
                      {purchase.status === 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedPurchase(purchase)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(purchase)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground py-2">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-4">
            {selectedPurchase && (
              <>
                <div className="bg-white p-4 rounded">
                  <QRCodeSVG value={selectedPurchase.qrCode} size={200} />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Show this code to staff for validation
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-2">
                  {selectedPurchase.qrCode}
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
