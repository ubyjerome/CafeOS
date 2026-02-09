import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/instantdb";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/paystack";
import type {
  Purchase,
  User as UserType,
  CompanySettings,
} from "@/lib/instantdb";
import { format } from "date-fns";
import { ArrowLeft, Download, Mail, User, Receipt } from "lucide-react";
import { toast } from "sonner";
import { downloadPdf } from "@/services/pdf";
import { Configs } from "@/configs";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  consumed: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};

const TransactionDetail: React.FC = () => {
  const { id: purchaseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: usersData } = db.useQuery({ users: {} });
  const { data: settingsData } = db.useQuery({ companySettings: {} });

  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const users = (usersData?.users || []) as UserType[];
  const companySettings = (settingsData?.companySettings?.[0] ||
    null) as CompanySettings | null;

  const purchase = purchases.find((p) => p.id === purchaseId);
  const guest = purchase
    ? users.find((u) => u.id === purchase.guestId)
    : null;

  const isStaff = user?.role === "admin" || user?.role === "manager";

  if (!purchase) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Transaction not found</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate("/transactions")}
        >
          Back to Transactions
        </Button>
      </div>
    );
  }

  // Check access - guests can only see their own
  if (!isStaff && purchase.guestId !== user?.id) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  const handleDownload = async () => {
    await downloadPdf("transaction", purchase, {
      guestName: guest?.name,
      guestEmail: guest?.email,
      companyName: companySettings?.name,
      companyAddress: companySettings?.address,
      paymentMethod: (purchase as any).paymentMethod,
    });
  };

  const handleEmail = () => {
    toast.success(
      `Transaction detail emailed to ${guest?.email || user?.email} (mocked — email integration pending)`
    );
  };

  return (
    <div className="fade-in">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate("/transactions")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Transactions
      </Button>

      {/* Transaction Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded bg-muted flex items-center justify-center">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">
                  {purchase.serviceName}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Ref: {purchase.paymentReference}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
              <Button variant="outline" onClick={handleEmail}>
                <Mail className="h-4 w-4 mr-2" /> Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">
                {purchase.paymentReference}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{purchase.serviceName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{purchase.serviceType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-lg">
                {formatCurrency(purchase.amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge className={statusColors[purchase.status]}>
                {purchase.status}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>
                {format(
                  new Date(purchase.createdAt),
                  "MMMM d, yyyy · h:mm a"
                )}
              </span>
            </div>
            {(purchase as any).paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <Badge variant="outline">
                  {(purchase as any).paymentMethod}
                </Badge>
              </div>
            )}
            {purchase.progressTotal && purchase.progressTotal > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>
                  {purchase.progressUsed || 0}/{purchase.progressTotal} days
                </span>
              </div>
            )}
            {purchase.consumedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consumed At</span>
                <span>
                  {format(
                    new Date(purchase.consumedAt),
                    "MMMM d, yyyy · h:mm a"
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            {guest ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                  <img
                    src={
                      Configs.getAvatar(guest.id) ||
                      "/avatar-placeholder.png"
                    }
                    alt={guest.name}
                    className="h-12 w-12 rounded-full object-cover bg-primary"
                  />
                  <div>
                    <div className="font-medium">{guest.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {guest.email}
                    </div>
                    {guest.phone && (
                      <div className="text-sm text-muted-foreground">
                        {guest.phone}
                      </div>
                    )}
                  </div>
                </div>
                {isStaff && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/guests/${guest.id}`)}
                  >
                    <User className="h-4 w-4 mr-2" /> View Guest Profile
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Guest information not available
              </p>
            )}

            {/* QR/Access Code */}
            {purchase.qrCode && (
              <div className="mt-4 p-4 bg-muted/30 rounded text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Access Code
                </p>
                <p className="font-mono text-sm font-semibold">
                  {purchase.qrCode}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionDetail;
