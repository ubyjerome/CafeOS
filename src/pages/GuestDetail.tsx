import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, tx, id, generateQRCode } from "@/lib/instantdb";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, generateReference } from "@/lib/paystack";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type {
  User as UserType,
  Purchase,
  CheckIn,
  Service,
  CompanySettings,
} from "@/lib/instantdb";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
} from "date-fns";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Receipt,
  Clock,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Download,
  Mail,
  Check,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "sonner";
import { Configs } from "@/configs";
import { downloadPdf } from "@/services/pdf";

const GuestDetail: React.FC = () => {
  const { id: guestId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [purchaseStep, setPurchaseStep] = useState<"select" | "payment">(
    "select"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoCheckIn, setAutoCheckIn] = useState(true);

  const { data: usersData } = db.useQuery({ users: {} });
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: checkInsData } = db.useQuery({ checkIns: {} });
  const { data: servicesData } = db.useQuery({ services: {} });
  const { data: settingsData } = db.useQuery({ companySettings: {} });

  const users = (usersData?.users || []) as UserType[];
  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const checkIns = (checkInsData?.checkIns || []) as CheckIn[];
  const services = ((servicesData?.services || []) as Service[]).filter(
    (s) => s.isActive
  );
  const companySettings = (settingsData?.companySettings?.[0] ||
    null) as CompanySettings | null;

  const guest = users.find((u) => u.id === guestId);
  const guestPurchases = purchases
    .filter((p) => p.guestId === guestId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const guestCheckIns = checkIns
    .filter((c) => c.guestId === guestId)
    .sort((a, b) => b.checkInTime - a.checkInTime);

  const isStaff = user?.role === "admin" || user?.role === "manager";

  if (!isStaff) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Staff only.</p>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Guest not found</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate("/guests")}
        >
          Back to Guests
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalSpent = guestPurchases.reduce((sum, p) => sum + p.amount, 0);
  const activePurchases = guestPurchases.filter((p) => p.status === "paid");
  const totalCheckInTime = guestCheckIns
    .filter((c) => c.checkOutTime)
    .reduce(
      (sum, c) =>
        sum + (c.checkOutTime! - c.checkInTime - c.totalPausedTime),
      0
    );
  const avgSessionTime =
    guestCheckIns.filter((c) => c.checkOutTime).length > 0
      ? totalCheckInTime /
        guestCheckIns.filter((c) => c.checkOutTime).length /
        (1000 * 60)
      : 0;

  // Check-ins by day (last 30 days)
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const dailyCheckIns = last30Days.map((day) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const count = guestCheckIns.filter(
      (c) => c.checkInTime >= dayStart && c.checkInTime <= dayEnd
    ).length;
    return { date: format(day, "MMM d"), checkIns: count };
  });

  const dailySpending = last30Days.map((day) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const dayPurchases = guestPurchases.filter(
      (p) => p.createdAt >= dayStart && p.createdAt <= dayEnd
    );
    const amount = dayPurchases.reduce((sum, p) => sum + p.amount, 0);
    return { date: format(day, "MMM d"), amount };
  });

  const handleToggleBan = () => {
    db.transact([
      tx.users[guest.id].update({
        isBanned: !guest.isBanned,
        updatedAt: Date.now(),
      }),
    ]);
    toast.success(guest.isBanned ? "Guest unbanned" : "Guest banned");
  };

  const openPurchaseDialog = () => {
    setSelectedService(null);
    setPaymentMethod("");
    setPurchaseStep("select");
    setIsPurchaseOpen(true);
    setAutoCheckIn(true);
  };

  const handleSelectService = () => {
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    // Check if guest already has active purchase for non-one-off services
    if (selectedService.type !== "one-off") {
      const existingActive = guestPurchases.find(
        (p) => p.serviceId === selectedService.id && p.status === "paid"
      );
      if (existingActive) {
        toast.error(
          "Guest already has an active purchase for this service. Wait until it expires."
        );
        return;
      }
    }

    setPurchaseStep("payment");
  };

  const handleProcessPayment = async () => {
    if (!selectedService || !paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setIsProcessing(true);
    try {
      const reference = generateReference();
      const purchaseId = id();
      const qrCode = generateQRCode();

      await db.transact([
        tx.purchases[purchaseId].update({
          guestId: guest.id,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceType: selectedService.type,
          amount: selectedService.price,
          paymentReference: reference,
          paymentMethod: paymentMethod,
          qrCode,
          status: "paid",
          progressUsed: 0,
          progressTotal:
            selectedService.type === "weekly"
              ? 7
              : selectedService.type === "monthly"
                ? 30
                : 1,
          createdAt: Date.now(),
        }),
      ]);

      // Auto check-in if selected
      if (autoCheckIn && selectedService.type !== "one-off") {
        const checkInId = id();
        await db.transact([
          tx.checkIns[checkInId].update({
            guestId: guest.id,
            purchaseId,
            checkInTime: Date.now(),
            totalPausedTime: 0,
            isActive: true,
            createdAt: Date.now(),
          }),
        ]);
      } else if (autoCheckIn && selectedService.type === "one-off") {
        // For one-off, mark as consumed
        await db.transact([
          tx.purchases[purchaseId].update({
            status: "consumed",
            consumedAt: Date.now(),
          }),
        ]);
      }

      toast.success("Purchase completed successfully!");
      setIsPurchaseOpen(false);

      // Offer to print voucher
      const fakePurchase: Purchase = {
        id: purchaseId,
        guestId: guest.id,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceType: selectedService.type,
        amount: selectedService.price,
        paymentReference: reference,
        paymentMethod,
        qrCode,
        status: "paid",
        progressUsed: 0,
        progressTotal:
          selectedService.type === "weekly"
            ? 7
            : selectedService.type === "monthly"
              ? 30
              : 1,
        createdAt: Date.now(),
      } as Purchase;

      // Auto-download the voucher
      await downloadPdf("voucher", fakePurchase, {
        guestName: guest.name,
        guestEmail: guest.email,
        companyName: companySettings?.name,
        companyAddress: companySettings?.address,
        paymentMethod,
      });
    } catch (error) {
      toast.error("Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintVoucher = async (purchase: Purchase) => {
    await downloadPdf("voucher", purchase, {
      guestName: guest.name,
      guestEmail: guest.email,
      companyName: companySettings?.name,
      companyAddress: companySettings?.address,
      paymentMethod: (purchase as any).paymentMethod || "Online",
    });
  };

  const handleEmailVoucher = (purchase: Purchase) => {
    // Mocked email functionality
    toast.success(
      `Voucher email sent to ${guest.email} (mocked — email integration pending)`
    );
  };

  // Available services that the guest doesn't already have (except one-off)
  const getServiceAvailability = (service: Service) => {
    if (service.type === "one-off") return true;
    const activeP = guestPurchases.find(
      (p) => p.serviceId === service.id && p.status === "paid"
    );
    return !activeP;
  };

  return (
    <div className="fade-in">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate("/guests")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Guests
      </Button>

      {/* Guest Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={Configs.getAvatar(guest.id) || "/avatar-placeholder.png"}
                alt={guest.name || "User Avatar"}
                className="h-16 w-16 rounded-full object-cover bg-primary"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{guest.name}</h1>
                  {guest.isBanned && (
                    <Badge variant="destructive">Banned</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{guest.email}</p>
                {guest.phone && (
                  <p className="text-sm text-muted-foreground">{guest.phone}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={openPurchaseDialog}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Get Service
              </Button>
              <Button
                variant={guest.isBanned ? "outline" : "destructive"}
                onClick={handleToggleBan}
              >
                {guest.isBanned ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" /> Unban
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" /> Ban
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Purchases
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guestPurchases.length}</div>
            <p className="text-xs text-muted-foreground">
              {activePurchases.length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Check-ins
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guestCheckIns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(avgSessionTime)} min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySpending}>
                  <defs>
                    <linearGradient
                      id="colorSpendingGuest"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Spent",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorSpendingGuest)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Check-ins (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCheckIns}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Check-ins"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "4px",
                      fontSize: "12px",
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
      </div>

      {/* Active Subscriptions */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Active Subscriptions ({activePurchases.length})
            </CardTitle>
            <Button size="sm" onClick={openPurchaseDialog}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Get Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activePurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active subscriptions
            </p>
          ) : (
            <div className="space-y-2">
              {activePurchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded"
                >
                  <div>
                    <span className="font-medium">{p.serviceName}</span>
                    {p.progressTotal && p.progressTotal > 1 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({p.progressUsed || 0}/{p.progressTotal} days)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(p.createdAt), "MMM d, yyyy")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(p.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintVoucher(p)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEmailVoucher(p)}
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          {guestPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {guestPurchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded"
                >
                  <div>
                    <span className="font-medium">{p.serviceName}</span>
                    <Badge
                      className="ml-2"
                      variant={p.status === "paid" ? "default" : "secondary"}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(p.createdAt), "MMM d, yyyy")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(p.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintVoucher(p)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEmailVoucher(p)}
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {guestCheckIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {guestCheckIns.slice(0, 20).map((c) => {
                const purchase = purchases.find((p) => p.id === c.purchaseId);
                const duration = c.checkOutTime
                  ? (c.checkOutTime - c.checkInTime - c.totalPausedTime) /
                    (1000 * 60)
                  : null;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded"
                  >
                    <div>
                      <span className="font-medium">
                        {purchase?.serviceName || "Unknown"}
                      </span>
                      {c.isActive && (
                        <Badge className="ml-2" variant="default">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(c.checkInTime), "MMM d, yyyy h:mm a")}
                      {duration !== null && ` · ${Math.round(duration)} min`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Service Dialog */}
      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {purchaseStep === "select"
                ? "Select Service"
                : "Payment Method"}
            </DialogTitle>
          </DialogHeader>

          {purchaseStep === "select" ? (
            <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No services available
                </p>
              ) : (
                services.map((service) => {
                  const isAvailable = getServiceAvailability(service);
                  return (
                    <div
                      key={service.id}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        selectedService?.id === service.id
                          ? "border-primary bg-primary/5"
                          : isAvailable
                            ? "border-border hover:border-primary/50"
                            : "border-border opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        isAvailable && setSelectedService(service)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{service.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {service.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                          {!isAvailable && (
                            <p className="text-xs text-destructive mt-1">
                              Guest already has active subscription
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatCurrency(service.price)}
                          </span>
                          {selectedService?.id === service.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/30 rounded">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Service
                  </span>
                  <span className="font-medium">
                    {selectedService?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Amount
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(selectedService?.price || 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Auto Check-in</div>
                  <p className="text-xs text-muted-foreground">
                    {selectedService?.type === "one-off"
                      ? "Mark as consumed immediately"
                      : "Start check-in session automatically"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoCheckIn}
                  onChange={(e) => setAutoCheckIn(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {purchaseStep === "payment" && (
              <Button
                variant="outline"
                onClick={() => setPurchaseStep("select")}
              >
                Back
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsPurchaseOpen(false)}
            >
              Cancel
            </Button>
            {purchaseStep === "select" ? (
              <Button onClick={handleSelectService} disabled={!selectedService}>
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleProcessPayment}
                disabled={!paymentMethod || isProcessing}
              >
                {isProcessing ? "Processing..." : "Complete Purchase"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestDetail;
