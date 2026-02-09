import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, hashPassword, verifyPassword, id, tx, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_COMPANY_LOGO } from '@/lib/instantdb';
import type { User } from '@/lib/instantdb';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: usersData } = db.useQuery({ users: {} });
  const { data: settingsData } = db.useQuery({ companySettings: {} });

  // Initialize default admin and company settings
  const initializeDefaults = useCallback(async () => {
    if (isInitialized) return;
    
    const users = (usersData?.users || []) as User[];
    const settings = (settingsData?.companySettings || []) as any[];

    // Create default admin if it doesn't exist
    const adminExists = users.some(u => u.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
    if (!adminExists) {
      const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
      db.transact([
        tx.users[id()].update({
          email: DEFAULT_ADMIN_EMAIL,
          name: 'Admin',
          role: 'manager',
          passwordHash,
          isBanned: false,
          theme: 'light',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      ]);
    }

    // Create default company settings
    if (settings.length === 0) {
      db.transact([
        tx.companySettings[id()].update({
          name: 'CafeOS',
          description: 'Welcome to our cyber café! We offer premium internet services and computer access.',
          logoUrl: DEFAULT_COMPANY_LOGO,
          address: '123 Tech Street, Digital City',
          phone: '+234 123 456 7890',
          email: 'info@cafeos.demo',
          updatedAt: Date.now(),
        }),
      ]);
    }

    setIsInitialized(true);
  }, [usersData, settingsData, isInitialized]);

  useEffect(() => {
    if (usersData !== undefined && settingsData !== undefined) {
      initializeDefaults();
    }
  }, [usersData, settingsData, initializeDefaults]);

  // Check for stored session
  useEffect(() => {
    const storedUserId = localStorage.getItem('cafeos-user-id');
    const users = (usersData?.users || []) as User[];
    
    if (storedUserId && users.length > 0) {
      const foundUser = users.find(u => u.id === storedUserId);
      if (foundUser && !foundUser.isBanned) {
        setUser(foundUser);
      } else {
        localStorage.removeItem('cafeos-user-id');
      }
    }
    if (usersData !== undefined) {
      setIsLoading(false);
    }
  }, [usersData]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const users = (usersData?.users || []) as User[];
    const foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      return { success: false, error: 'User not found' };
    }

    if (foundUser.isBanned) {
      return { success: false, error: 'This account has been banned' };
    }

    const isValid = await verifyPassword(password, foundUser.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    setUser(foundUser);
    localStorage.setItem('cafeos-user-id', foundUser.id);
    return { success: true };
  };

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    const users = (usersData?.users || []) as User[];
    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    const passwordHash = await hashPassword(password);
    const userId = id();
    
    await db.transact([
      tx.users[userId].update({
        email: email.toLowerCase(),
        name,
        role: 'guest',
        passwordHash,
        isBanned: false,
        theme: 'light',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ]);

    // Wait for the new user to appear in the query
    setTimeout(() => {
      const newUsers = (usersData?.users || []) as User[];
      const newUser = newUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('cafeos-user-id', newUser.id);
      }
    }, 500);

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cafeos-user-id');
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    await db.transact([
      tx.users[user.id].update({
        ...updates,
        updatedAt: Date.now(),
      }),
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
