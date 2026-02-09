import React, { useState, useEffect, useRef } from "react";
import { db, tx, id } from "@/lib/instantdb";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Check, X, Search, Clock, User } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import type { Purchase, User as UserType } from "@/lib/instantdb";
import { format } from "date-fns";

const Validate: React.FC = () => {
  const { user } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [validatedPurchase, setValidatedPurchase] = useState<Purchase | null>(
    null
  );
  const [purchaseGuest, setPurchaseGuest] = useState<UserType | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: usersData } = db.useQuery({ users: {} });

  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const users = (usersData?.users || []) as UserType[];

  const isStaff = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    return () => {
      try {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch {}
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleValidate(decodedText);
          scanner.stop().catch(() => {});
          setIsScanning(false);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (error) {
      toast.error("Failed to start camera");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      setIsScanning(false);
    }
  };

  const handleValidate = (code: string) => {
    if (!code.trim()) {
      toast.error("Please enter a code");
      return;
    }

    const purchase = purchases.find((p) => p.qrCode === code.trim());

    if (!purchase) {
      toast.error("Invalid QR code — no matching purchase found");
      setValidatedPurchase(null);
      setPurchaseGuest(null);
      return;
    }

    // Check if already consumed/expired
    if (purchase.status === "consumed" || purchase.status === "expired") {
      toast.error(
        `This service has already been ${purchase.status}. It cannot be used again.`
      );
      setValidatedPurchase(purchase);
      const guest = users.find((u) => u.id === purchase.guestId) || null;
      setPurchaseGuest(guest);
      return;
    }

    const guest = users.find((u) => u.id === purchase.guestId) || null;
    setValidatedPurchase(purchase);
    setPurchaseGuest(guest);
    setManualCode("");
  };

  const handleConsume = () => {
    if (!validatedPurchase) return;

    // Extra safety: don't allow consumption of already consumed/expired
    if (
      validatedPurchase.status === "consumed" ||
      validatedPurchase.status === "expired"
    ) {
      toast.error("This service has already been used up and cannot be consumed again.");
      return;
    }

    if (validatedPurchase.serviceType === "one-off") {
      db.transact([
        tx.purchases[validatedPurchase.id].update({
          status: "consumed",
          consumedAt: Date.now(),
        }),
      ]);
      toast.success("Service consumed successfully");
    } else {
      const checkInId = id();
      db.transact([
        tx.checkIns[checkInId].update({
          guestId: validatedPurchase.guestId,
          purchaseId: validatedPurchase.id,
          checkInTime: Date.now(),
          totalPausedTime: 0,
          isActive: true,
          createdAt: Date.now(),
        }),
      ]);
      toast.success("Check-in started");
    }

    setValidatedPurchase(null);
    setPurchaseGuest(null);
  };

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
        <h1 className="text-2xl font-semibold">Validate QR Code</h1>
        <p className="text-muted-foreground text-sm">
          Scan or enter guest QR codes
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QR Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              id="qr-reader"
              className="w-full max-w-sm mx-auto mb-4 overflow-hidden rounded"
            />

            {!isScanning ? (
              <Button onClick={startScanner} className="w-full">
                <QrCode className="h-4 w-4 mr-2" /> Start Scanner
              </Button>
            ) : (
              <Button
                onClick={stopScanner}
                variant="outline"
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" /> Stop Scanner
              </Button>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Enter QR code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleValidate(manualCode)
                }
              />
              <Button onClick={() => handleValidate(manualCode)}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Result</CardTitle>
          </CardHeader>
          <CardContent>
            {!validatedPurchase ? (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Scan or enter a QR code to validate</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {purchaseGuest?.name || "Unknown Guest"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {purchaseGuest?.email}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium">
                      {validatedPurchase.serviceName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">
                      {validatedPurchase.serviceType}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant={
                        validatedPurchase.status === "paid"
                          ? "default"
                          : validatedPurchase.status === "consumed" ||
                              validatedPurchase.status === "expired"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {validatedPurchase.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchased</span>
                    <span>
                      {format(
                        new Date(validatedPurchase.createdAt),
                        "MMM d, yyyy"
                      )}
                    </span>
                  </div>
                  {validatedPurchase.progressTotal &&
                    validatedPurchase.progressTotal > 1 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span>
                          {validatedPurchase.progressUsed || 0}/
                          {validatedPurchase.progressTotal} days
                        </span>
                      </div>
                    )}
                </div>

                {validatedPurchase.status === "paid" && (
                  <Button onClick={handleConsume} className="w-full">
                    {validatedPurchase.serviceType === "one-off" ? (
                      <>
                        <Check className="h-4 w-4 mr-2" /> Mark as Consumed
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-2" /> Start Check-in
                      </>
                    )}
                  </Button>
                )}

                {(validatedPurchase.status === "consumed" ||
                  validatedPurchase.status === "expired") && (
                  <div className="p-4 bg-destructive/10 rounded text-center">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ This service has already been {validatedPurchase.status}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This QR code can no longer be used
                    </p>
                  </div>
                )}

                {validatedPurchase.status === "pending" && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Payment is still pending for this purchase
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Validate;
