import React, { useState } from "react";
import { db, tx, id, hashPassword } from "@/lib/instantdb";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User, Plus, Trash2, Shield, UserCog, Users } from "lucide-react";
import type { User as UserType } from "@/lib/instantdb";
import { format } from "date-fns";
import { Configs } from "@/configs";

const Staff: React.FC = () => {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "manager",
  });

  const { data: usersData } = db.useQuery({ users: {} });
  const users = (usersData?.users || []) as UserType[];

  const staffMembers = users
    .filter((u) => u.role === "admin" || u.role === "manager")
    .sort((a, b) => b.createdAt - a.createdAt);

  const isManager = user?.role === "manager";

  if (!isManager) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Managers only.</p>
      </div>
    );
  }

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      toast.error("Please fill all fields");
      return;
    }

    const exists = users.find(
      (u) => u?.email?.toLowerCase() === newStaff.email.toLowerCase(),
    );
    if (exists) {
      toast.error("Email already exists");
      return;
    }

    const staffId = id();
    const passwordHash = await hashPassword(newStaff.password);

    db.transact([
      tx.users[staffId].update({
        email: newStaff.email.toLowerCase(),
        name: newStaff.name,
        role: newStaff.role,
        passwordHash,
        isBanned: false,
        theme: "light",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ]);

    toast.success("Staff member added");
    setIsAddOpen(false);
    setNewStaff({ name: "", email: "", password: "", role: "admin" });
  };

  const handleRemoveStaff = (staff: UserType) => {
    if (staff.id === user?.id) {
      toast.error("You can't remove yourself");
      return;
    }

    db.transact([tx.users[staff.id].delete()]);
    toast.success("Staff member removed");
  };

  const handleToggleBan = (staff: UserType) => {
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
    toast.success(staff.isBanned ? "Staff unbanned" : "Staff banned");
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Staff</h1>
          <p className="text-muted-foreground text-sm">
            Manage admins and managers
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Staff
        </Button>
      </div>

      {staffMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No staff members</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {staffMembers.map((staff) => (
            <Card key={staff.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      Configs.getAvatar(staff?.id) || "/avatar-placeholder.png"
                    }
                    alt={staff?.name || "User Avatar"}
                    className="h-9 w-9 rounded-full object-cover bg-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{staff.name}</span>
                      <Badge
                        variant={
                          staff.role === "manager" ? "default" : "secondary"
                        }
                      >
                        {staff.role}
                      </Badge>
                      {staff.isBanned && (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                      {staff.id === user?.id && (
                        <Badge variant="outline">You</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {staff.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground hidden sm:block">
                    Added {format(new Date(staff.createdAt), "MMM d, yyyy")}
                  </div>
                  {staff.id !== user?.id && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleBan(staff)}
                      >
                        {staff.isBanned ? "Unban" : "Ban"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveStaff(staff)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Full name"
                value={newStaff.name}
                onChange={(e) =>
                  setNewStaff((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Email address"
                value={newStaff.email}
                onChange={(e) =>
                  setNewStaff((s) => ({ ...s, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Password"
                value={newStaff.password}
                onChange={(e) =>
                  setNewStaff((s) => ({ ...s, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newStaff.role}
                onValueChange={(v) =>
                  setNewStaff((s) => ({ ...s, role: v as "admin" | "manager" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff}>Add Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;
