import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/instantdb";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/paystack";
import type { Purchase, User as UserType, CompanySettings } from "@/lib/instantdb";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Receipt,
  Calendar,
} from "lucide-react";
import { Configs } from "@/configs";
import { downloadPdf } from "@/services/pdf";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  consumed: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: usersData } = db.useQuery({ users: {} });
  const { data: settingsData } = db.useQuery({ companySettings: {} });

  const allPurchases = (purchasesData?.purchases || []) as Purchase[];
  const users = (usersData?.users || []) as UserType[];
  const companySettings = (settingsData?.companySettings?.[0] ||
    null) as CompanySettings | null;

  const isStaff = user?.role === "admin" || user?.role === "manager";

  // Filter purchases based on role
  let filteredPurchases = isStaff
    ? allPurchases
    : allPurchases.filter((p) => p.guestId === user?.id);

  // Apply search filter
  if (search) {
    filteredPurchases = filteredPurchases.filter((p) => {
      const guest = users.find((u) => u.id === p.guestId);
      return (
        p.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
        p.paymentReference?.toLowerCase().includes(search.toLowerCase()) ||
        guest?.name?.toLowerCase().includes(search.toLowerCase()) ||
        guest?.email?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filteredPurchases = filteredPurchases.filter(
      (p) => p.status === statusFilter
    );
  }

  // Sort by date
  filteredPurchases = filteredPurchases.sort(
    (a, b) => b.createdAt - a.createdAt
  );

  // Group by day
  const groupedTransactions: Record<string, Purchase[]> = {};
  filteredPurchases.forEach((purchase) => {
    const date = startOfDay(new Date(purchase.createdAt)).getTime();
    let label = format(new Date(purchase.createdAt), "EEEE, MMMM d, yyyy");
    if (isToday(new Date(purchase.createdAt))) label = "Today";
    else if (isYesterday(new Date(purchase.createdAt))) label = "Yesterday";

    if (!groupedTransactions[label]) {
      groupedTransactions[label] = [];
    }
    groupedTransactions[label].push(purchase);
  });

  // Pagination
  const paginatedPurchases = filteredPurchases.slice(
    page * pageSize,
    (page + 1) * pageSize
  );
  const totalPages = Math.ceil(filteredPurchases.length / pageSize);

  // Group paginated results by day
  const paginatedGroups: Record<string, Purchase[]> = {};
  paginatedPurchases.forEach((purchase) => {
    let label = format(new Date(purchase.createdAt), "EEEE, MMMM d, yyyy");
    if (isToday(new Date(purchase.createdAt))) label = "Today";
    else if (isYesterday(new Date(purchase.createdAt))) label = "Yesterday";

    if (!paginatedGroups[label]) {
      paginatedGroups[label] = [];
    }
    paginatedGroups[label].push(purchase);
  });

  const getGuest = (guestId: string) =>
    users.find((u) => u.id === guestId);

  const totalRevenue = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);

  const handleDownload = async (purchase: Purchase) => {
    const guest = getGuest(purchase.guestId);
    await downloadPdf("transaction", purchase, {
      guestName: guest?.name,
      guestEmail: guest?.email,
      companyName: companySettings?.name,
      companyAddress: companySettings?.address,
      paymentMethod: (purchase as any).paymentMethod,
    });
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {isStaff ? "Transactions" : "My Transactions"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isStaff
            ? "View all system transactions"
            : "View your transaction history"}
        </p>
      </div>

      {/* Summary */}
      {/* <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPurchases.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Amount
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPurchases.filter((p) => p.status === "paid").length}
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              isStaff
                ? "Search by guest, service, reference..."
                : "Search by service, reference..."
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="consumed">Consumed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped Transactions */}
      {filteredPurchases.length === 0 ? (
        <Card className="p-8 text-center">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No transactions found</p>
        </Card>
      ) : (
        <>
          {Object.entries(paginatedGroups).map(
            ([dateLabel, datePurchases]) => (
              <div key={dateLabel} className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {dateLabel}
                </h3>
                <div className="space-y-2">
                  {datePurchases.map((purchase) => {
                    const guest = getGuest(purchase.guestId);
                    return (
                      <Card key={purchase.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                            onClick={() =>
                              navigate(`/transactions/${purchase.id}`)
                            }
                          >
                            {isStaff && (
                              <img
                                src={
                                  Configs.getAvatar(purchase.guestId) ||
                                  "/avatar-placeholder.png"
                                }
                                alt="avatar"
                                className="h-9 w-9 rounded-full object-cover bg-primary"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">
                                  {purchase.serviceName}
                                </span>
                                <Badge
                                  className={
                                    statusColors[purchase.status] || ""
                                  }
                                >
                                  {purchase.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {isStaff && (
                                  <span>
                                    {guest?.name || "Unknown"} ·{" "}
                                  </span>
                                )}
                                {format(
                                  new Date(purchase.createdAt),
                                  "h:mm a"
                                )}
                                {(purchase as any).paymentMethod && (
                                  <span>
                                    {" "}
                                    · {(purchase as any).paymentMethod}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              {formatCurrency(purchase.amount)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(purchase);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Transactions;
