import { Configs } from '@/configs';
import { init, tx, id } from '@instantdb/react';

// InstantDB types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role: 'guest' | 'admin' | 'manager';
  passwordHash: string;
  isBanned: boolean;
  theme: 'light' | 'dark';
  createdAt: number;
  updatedAt: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'one-off' | 'daily' | 'weekly' | 'monthly' | 'fixed-time';
  duration?: number; // in minutes for fixed-time
  isPublic: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Purchase {
  id: string;
  guestId: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  amount: number;
  paymentReference: string;
  paymentMethod?: string; // cash, transfer, pos, online
  qrCode: string;
  status: 'pending' | 'paid' | 'consumed' | 'expired';
  consumedAt?: number;
  validUntil?: number;
  progressUsed?: number; // for weekly/monthly tracking (e.g., days used)
  progressTotal?: number; // total days/units
  createdAt: number;
}

export interface CheckIn {
  id: string;
  guestId: string;
  purchaseId: string;
  checkInTime: number;
  checkOutTime?: number;
  pausedAt?: number;
  totalPausedTime: number; // in milliseconds
  isActive: boolean;
  createdAt: number;
}

export interface CompanySettings {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  address?: string;
  phone?: string;
  email?: string;
  updatedAt: number;
}

// Initialize without schema typing for flexibility
export const db = init({ appId: Configs.instantdb.app_id });

export { tx, id };

// Password hashing (client-side obfuscation - NOT cryptographically secure)
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'cafeos-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
};

// Generate unique QR code
export const generateQRCode = (): string => {
  return `CAFEOS-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};
