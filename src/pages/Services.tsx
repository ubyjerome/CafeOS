import React from 'react';
import { db, tx, id } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, generateReference, toKobo } from '@/lib/paystack';
import { generateQRCode } from '@/lib/instantdb';
import type { Service, Purchase } from '@/lib/instantdb';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import { Configs } from '@/configs';

const ServiceCard: React.FC<{
  service: Service;
  onPurchase: (service: Service) => void;
  hasActivePurchase: boolean;
}> = ({ service, onPurchase, hasActivePurchase }) => {
  const typeLabels: Record<string, string> = {
    'one-off': 'One-time',
    'daily': 'Daily Pass',
    'weekly': 'Weekly Pass',
    'monthly': 'Monthly Pass',
    'fixed-time': `${service.duration} min`,
  };

  const isDisabled = hasActivePurchase && service.type !== 'one-off';

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{service.name}</CardTitle>
          <Badge variant="secondary" className="text-xs">{typeLabels[service.type]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground mb-4 flex-1">{service.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{formatCurrency(service.price)}</span>
          <Button
            size="sm"
            onClick={() => onPurchase(service)}
            disabled={isDisabled}
            variant={isDisabled ? "secondary" : "default"}
          >
            {isDisabled ? 'Purchased' : 'Purchase'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Services: React.FC = () => {
  const { user } = useAuth();
  const { data: servicesData } = db.useQuery({ services: {} });
  const { data: purchasesData } = db.useQuery({ purchases: {} });
  const services = ((servicesData?.services || []) as Service[]).filter(s => s.isActive && s.isPublic);
  const purchases = (purchasesData?.purchases || []) as Purchase[];

  // Get user's active purchases
  const userActivePurchases = purchases.filter(
    p => p.guestId === user?.id && p.status === 'paid'
  );

  const hasActivePurchaseForService = (serviceId: string) => {
    return userActivePurchases.some(p => p.serviceId === serviceId);
  };

  const handlePurchase = (service: Service) => {
    if (!user) {
      toast.error('Please sign in to purchase');
      return;
    }

    // Validation: Check for duplicate non-one-off purchases
    if (service.type !== 'one-off') {
      const existingActive = userActivePurchases.find(
        p => p.serviceId === service.id
      );
      if (existingActive) {
        toast.error('You already have an active purchase for this service. Wait until it expires before purchasing again.');
        return;
      }
    }

    const reference = generateReference();
    const config = {
      reference,
      email: user.email,
      amount: toKobo(service.price),
      publicKey: Configs.paystack.public_key,
    };

    const onSuccess = () => {
      const purchaseId = id();
      db.transact([
        tx.purchases[purchaseId].update({
          guestId: user.id,
          serviceId: service.id,
          serviceName: service.name,
          serviceType: service.type,
          amount: service.price,
          paymentReference: reference,
          qrCode: generateQRCode(),
          status: 'paid',
          progressUsed: 0,
          progressTotal: service.type === 'weekly' ? 7 : service.type === 'monthly' ? 30 : 1,
          createdAt: Date.now(),
        }),
      ]);
      toast.success('Purchase successful! Check your purchases for QR code.');
    };

    const onClose = () => {
      toast.info('Payment cancelled');
    };

    const initializePayment = usePaystackPayment(config);
    initializePayment({ onSuccess, onClose });
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="text-muted-foreground text-sm">Browse and purchase café services</p>
      </div>

      {services.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No services available yet</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onPurchase={handlePurchase}
              hasActivePurchase={hasActivePurchaseForService(service.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Services;
