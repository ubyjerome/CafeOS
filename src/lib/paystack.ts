export interface PaystackConfig {
  email: string;
  amount: number; // in kobo (smallest currency unit)
  reference: string;
  onSuccess: (reference: { reference: string }) => void;
  onClose: () => void;
}

export const generateReference = (): string => {
  return `CAFEOS-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
};

// Convert amount to kobo (for Naira)
export const toKobo = (amount: number): number => Math.round(amount * 100);

// Format currency
export const formatCurrency = (amount: number, currency = 'NGN'): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
  }).format(amount);
};
