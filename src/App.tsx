import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AuthProvider } from "@/contexts/AuthContext";

// Eagerly load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Invoices = lazy(() => import("./pages/Invoices"));
// ManualBilling removed per user request
const ModernBilling = lazy(() => import("./pages/ModernBilling"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const WaiterInterface = lazy(() => import("./pages/WaiterInterface"));
const Customers = lazy(() => import("./pages/Customers"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AdvancedReports = lazy(() => import("./pages/AdvancedReports"));
const LowStocks = lazy(() => import("./pages/LowStocks"));
const Profile = lazy(() => import("./pages/Profile"));
const Categories = lazy(() => import("./pages/Categories"));
const Counters = lazy(() => import("./pages/Counters"));
const Coupons = lazy(() => import("./pages/Coupons"));
const LimitedDiscounts = lazy(() => import("./pages/LimitedDiscounts"));
const Barcodes = lazy(() => import("./pages/Barcodes"));
const Templates = lazy(() => import("./pages/Templates"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Expenses = lazy(() => import("./pages/Expenses"));
const RestaurantTables = lazy(() => import("./pages/RestaurantTables"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Audits = lazy(() => import("./pages/Audits"));
const Returns = lazy(() => import("./pages/Returns"));
const InventoryMovements = lazy(() => import("./pages/InventoryMovements"));

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Route-level fallback - prevents white screen during lazy load
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Sonner 
        position="bottom-right" 
        toastOptions={{
          className: "slide-up",
          duration: 3000,
          style: {
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '13px',
            boxShadow: '0 8px 30px -10px rgba(0,0,0,0.15)',
          },
        }}
      />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              {/* Critical paths - eagerly loaded */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Lazy loaded routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Manual Billing route removed */}
              <Route path="/modern-billing" element={<ModernBilling />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/waiter" element={<WaiterInterface />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/low-stocks" element={<LowStocks />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/advanced-reports" element={<AdvancedReports />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/counters" element={<Counters />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/limited-discounts" element={<LimitedDiscounts />} />
              <Route path="/barcodes" element={<Barcodes />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/restaurant-tables" element={<RestaurantTables />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/audits" element={<Audits />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/inventory-movements" element={<InventoryMovements />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
