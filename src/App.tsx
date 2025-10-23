import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Invoices from "./pages/Invoices";
import NotFound from "./pages/NotFound";
import ManualBilling from "./pages/ManualBilling";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import LowStocks from "./pages/LowStocks";
import Profile from "./pages/Profile";
import Categories from "./pages/Categories";
import Counters from "./pages/Counters";
import Coupons from "./pages/Coupons";
import LimitedDiscounts from "./pages/LimitedDiscounts";
import Barcodes from "./pages/Barcodes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/manual-billing" element={<ManualBilling />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/low-stocks" element={<LowStocks />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/categories" element={<Categories />} />
            <Route path="/counters" element={<Counters />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/limited-discounts" element={<LimitedDiscounts />} />
            <Route path="/barcodes" element={<Barcodes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
