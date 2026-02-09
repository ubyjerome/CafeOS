import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { applyPrimaryColor, getInitialTheme, setDarkMode } from '@/lib/theme';

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Purchases from "./pages/Purchases";
import CheckIns from "./pages/CheckIns";
import CheckInDetail from "./pages/CheckInDetail";
import Validate from "./pages/Validate";
import Guests from "./pages/Guests";
import GuestDetail from "./pages/GuestDetail";
import Staff from "./pages/Staff";
import StaffDetail from "./pages/StaffDetail";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ManageServices from "./pages/ManageServices";
import Transactions from "./pages/Transactions";
import TransactionDetail from "./pages/TransactionDetail";
import NotFound from "./pages/NotFound";
import { About } from './pages/About';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    applyPrimaryColor();
    setDarkMode(getInitialTheme() === 'dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/transactions/:id" element={<TransactionDetail />} />
                <Route path="/checkins" element={<CheckIns />} />
                <Route path="/checkins/:id" element={<CheckInDetail />} />
                <Route path="/validate" element={<Validate />} />
                <Route path="/guests" element={<Guests />} />
                <Route path="/guests/:id" element={<GuestDetail />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/staff/:id" element={<StaffDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/manage-services" element={<ManageServices />} />
                <Route path="/about" element={<About />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
