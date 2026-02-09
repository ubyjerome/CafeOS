import React, { useState } from 'react';
import { db, tx, id } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/paystack';
import type { Service } from '@/lib/instantdb';

const emptyService = {
  name: '',
  description: '',
  price: 0,
  type: 'one-off' as Service['type'],
  duration: 60,
  isPublic: true,
  isActive: true,
};

const ManageServices: React.FC = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);

  const { data: servicesData } = db.useQuery({ services: {} });
  const services = (servicesData?.services || []) as Service[];

  const isManager = user?.role === 'manager';

  if (!isManager) {
    return (
      <div className="fade-in p-8 text-center">
        <p className="text-muted-foreground">Access denied. Managers only.</p>
      </div>
    );
  }

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setForm({
        name: service.name,
        description: service.description,
        price: service.price,
        type: service.type,
        duration: service.duration || 60,
        isPublic: service.isPublic,
        isActive: service.isActive,
      });
    } else {
      setEditingService(null);
      setForm(emptyService);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || form.price <= 0) {
      toast.error('Please fill name and price');
      return;
    }

    const serviceData = {
      name: form.name,
      description: form.description,
      price: form.price,
      type: form.type,
      duration: form.type === 'fixed-time' ? form.duration : undefined,
      isPublic: form.isPublic,
      isActive: form.isActive,
      updatedAt: Date.now(),
    };

    if (editingService) {
      db.transact([tx.services[editingService.id].update(serviceData)]);
      toast.success('Service updated');
    } else {
      const serviceId = id();
      db.transact([
        tx.services[serviceId].update({
          ...serviceData,
          createdAt: Date.now(),
        }),
      ]);
      toast.success('Service created');
    }

    setIsDialogOpen(false);
    setEditingService(null);
    setForm(emptyService);
  };

  const handleDelete = (service: Service) => {
    if (!confirm('Delete this service?')) return;
    db.transact([tx.services[service.id].delete()]);
    toast.success('Service deleted');
  };

  const typeLabels: Record<string, string> = {
    'one-off': 'One-time',
    'daily': 'Daily Pass',
    'weekly': 'Weekly Pass',
    'monthly': 'Monthly Pass',
    'fixed-time': 'Fixed Time',
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Manage Services</h1>
          <p className="text-muted-foreground text-sm">Create and edit café services</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No services yet</p>
          <Button className="mt-4" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Create First Service
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {services.map(service => (
            <Card key={service.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant="secondary">{typeLabels[service.type]}</Badge>
                    {!service.isActive && <Badge variant="destructive">Inactive</Badge>}
                    {!service.isPublic && <Badge variant="outline">Private</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{formatCurrency(service.price)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(service)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Service name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Service description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₦)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(f => ({ ...f, type: v as Service['type'] }))}
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
            {form.type === 'fixed-time' && (
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
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
                checked={form.isPublic}
                onCheckedChange={v => setForm(f => ({ ...f, isPublic: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Active</div>
                <p className="text-xs text-muted-foreground">Available for purchase</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingService ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageServices;
