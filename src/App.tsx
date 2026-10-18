import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AuthProvider } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const CHUNK_RELOAD_PREFIX = "upcurv:chunk-reload:";

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading (?:css )?chunk .* failed|chunkloaderror/i.test(message);
};

const lazyWithRecovery = <T extends React.ComponentType<any>>(
  importPage: () => Promise<{ default: T }>,
) => lazy(async () => {
  try {
    const page = await importPage();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`${CHUNK_RELOAD_PREFIX}${window.location.pathname}`);
    }
    return page;
  } catch (error) {
    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const retryKey = `${CHUNK_RELOAD_PREFIX}${window.location.pathname}`;
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, "1");
        window.location.reload();
      }
    }
    throw error;
  }
});

interface RouteErrorBoundaryState {
  error: Error | null;
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page rendering failed:", error, info.componentStack);
  }

  retry = () => {
    try {
      sessionStorage.removeItem(`${CHUNK_RELOAD_PREFIX}${window.location.pathname}`);
    } catch {
      // Reload still works when browser storage is unavailable.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const chunkError = isChunkLoadError(this.state.error);
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <section className="w-full max-w-md border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-card-foreground">
            {chunkError ? "This page needs to refresh" : "This page couldn’t be opened"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {chunkError
              ? "The latest version of the page could not be loaded. Refresh to try again."
              : "Something went wrong while opening this page. Refresh to try again."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={this.retry}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button asChild variant="outline">
              <a href="/">Go to home</a>
            </Button>
          </div>
        </section>
      </main>
    );
  }
}

// Eagerly load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load all other pages for code splitting
const Dashboard = lazyWithRecovery(() => import("./pages/Dashboard"));
const Inventory = lazyWithRecovery(() => import("./pages/Inventory"));
const Invoices = lazyWithRecovery(() => import("./pages/Invoices"));
// ManualBilling removed per user request
const ModernBilling = lazyWithRecovery(() => import("./pages/ModernBilling"));
const Kitchen = lazyWithRecovery(() => import("./pages/Kitchen"));
const WaiterInterface = lazyWithRecovery(() => import("./pages/WaiterInterface"));
const Customers = lazyWithRecovery(() => import("./pages/Customers"));
const Analytics = lazyWithRecovery(() => import("./pages/Analytics"));
const AdvancedReports = lazyWithRecovery(() => import("./pages/AdvancedReports"));
const LowStocks = lazyWithRecovery(() => import("./pages/LowStocks"));
const Profile = lazyWithRecovery(() => import("./pages/Profile"));
const Categories = lazyWithRecovery(() => import("./pages/Categories"));
const Counters = lazyWithRecovery(() => import("./pages/Counters"));
const Coupons = lazyWithRecovery(() => import("./pages/Coupons"));
const LimitedDiscounts = lazyWithRecovery(() => import("./pages/LimitedDiscounts"));
const Barcodes = lazyWithRecovery(() => import("./pages/Barcodes"));
const Templates = lazyWithRecovery(() => import("./pages/Templates"));
const Purchases = lazyWithRecovery(() => import("./pages/Purchases"));
const Expenses = lazyWithRecovery(() => import("./pages/Expenses"));
const RestaurantTables = lazyWithRecovery(() => import("./pages/RestaurantTables"));
const Suppliers = lazyWithRecovery(() => import("./pages/Suppliers"));
const Audits = lazyWithRecovery(() => import("./pages/Audits"));
const Returns = lazyWithRecovery(() => import("./pages/Returns"));
const InventoryMovements = lazyWithRecovery(() => import("./pages/InventoryMovements"));

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
          <RouteErrorBoundary>
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
          </RouteErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
