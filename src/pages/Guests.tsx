import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, tx, id, hashPassword } from "@/lib/instantdb";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { User, Search, Ban, CheckCircle, Users, Plus } from "lucide-react";
import type { User as UserType, Purchase, CheckIn } from "@/lib/instantdb";
import { formatCurrency } from "@/lib/paystack";
import { Configs } from "@/configs";

const Guests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: "", email: "" });
  const [isAdding, setIsAdding] = useState(false);
  const pageSize = 15;

  const { data: usersData } = db.useQuery({ users: {} });
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const { data: checkInsData } = db.useQuery({ checkIns: {} });

  const users = (usersData?.users || []) as UserType[];
  const purchases = (purchasesData?.purchases || []) as Purchase[];
  const checkIns = (checkInsData?.checkIns || []) as CheckIn[];

  const guests = users
    .filter((u) => u.role === "guest")
    .filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const paginatedGuests = guests.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(guests.length / pageSize);

  const getGuestStats = (guestId: string) => {
    const guestPurchases = purchases.filter((p) => p.guestId === guestId);
    const guestCheckIns = checkIns.filter((c) => c.guestId === guestId);
    const totalSpent = guestPurchases.reduce((sum, p) => sum + p.amount, 0);
    return {
      purchases: guestPurchases.length,
      checkIns: guestCheckIns.length,
      totalSpent,
    };
  };

  const handleToggleBan = (guest: UserType) => {
    db.transact([
      tx.users[guest.id].update({
        isBanned: !guest.isBanned,
        updatedAt: Date.now(),
      }),
    ]);
    toast.success(guest.isBanned ? "Guest unbanned" : "Guest banned");
  };

  const handleAddGuest = async () => {
    if (!newGuest.name.trim() || !newGuest.email.trim()) {
      toast.error("Please fill in name and email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newGuest.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const exists = users.find(
      (u) => u.email?.toLowerCase() === newGuest.email.toLowerCase()
    );
    if (exists) {
      toast.error("A user with this email already exists");
      return;
    }

    setIsAdding(true);
    try {
      const guestId = id();
      // Create a default password for walk-in guests
      const passwordHash = await hashPassword("guest-" + Date.now());

      await db.transact([
        tx.users[guestId].update({
          email: newGuest.email.toLowerCase().trim(),
          name: newGuest.name.trim(),
          role: "guest",
          passwordHash,
          isBanned: false,
          theme: "light",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      ]);

      toast.success("Guest added successfully");
      setIsAddOpen(false);
      setNewGuest({ name: "", email: "" });

      // Navigate to the new guest's detail page
      setTimeout(() => {
        navigate(`/guests/${guestId}`);
      }, 300);
    } catch (error) {
      toast.error("Failed to add guest");
    } finally {
      setIsAdding(false);
    }
  };

  const isStaff = user?.role === "admin" || user?.role === "manager";

  if (!isStaff) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Staff only.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Guests</h1>
          <p className="text-muted-foreground text-sm">
            Manage registered guests
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Guest
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {guests.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No guests found</p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedGuests.map((guest) => {
              const stats = getGuestStats(guest.id);
              return (
                <Card key={guest.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          Configs.getAvatar(guest.id) ||
                          "/avatar-placeholder.png"
                        }
                        alt={guest.name || "User Avatar"}
                        className="h-10 w-10 rounded-full object-cover bg-primary"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{guest.name}</span>
                          {guest.isBanned && (
                            <Badge variant="destructive" className="text-xs">
                              Banned
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {guest.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm hidden sm:block">
                        <div className="text-muted-foreground">
                          {stats.purchases} purchases · {stats.checkIns}{" "}
                          check-ins
                        </div>
                        <div className="font-medium">
                          {formatCurrency(stats.totalSpent)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/guests/${guest.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant={guest.isBanned ? "outline" : "destructive"}
                          onClick={() => handleToggleBan(guest)}
                        >
                          {guest.isBanned ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

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

      {/* Add Guest Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Guest name"
                value={newGuest.name}
                onChange={(e) =>
                  setNewGuest((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Email address"
                value={newGuest.email}
                onChange={(e) =>
                  setNewGuest((s) => ({ ...s, email: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGuest} disabled={isAdding}>
              {isAdding ? "Adding..." : "Add Guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Guests;
