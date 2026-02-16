import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, ShoppingCart, FileText, Users, BarChart3, BarChart4, 
  AlertTriangle, Building2, FolderOpen, LayoutGrid, Tag, Percent, 
  QrCode, ChefHat, UserCog, Receipt, UtensilsCrossed, History, RotateCcw, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/hooks/useAuthContext";
import { DashboardHeader, DashboardMenuGrid } from "@/components/dashboard";
import { PageWrapper } from "@/components/layout";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";

const SCROLL_POSITION_KEY = 'dashboard_scroll_position';
const COMPANY_CACHE_KEY = 'dashboard_company_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userId, role, isAdmin, isStaff, isWaiter, loading: authLoading, signOut } = useAuthContext();
  
  const [companyName, setCompanyName] = useState<string>("");
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [staffModules, setStaffModules] = useState<string[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [showLowStockPanel, setShowLowStockPanel] = useState(false);

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({ top: parseInt(savedPosition, 10), behavior: 'instant' });
        }, 50);
      });
    }
  }, [location.key]);

  // Memoized menu items
  const allMenuItems = useMemo(() => [
    { icon: ShoppingCart, label: "Modern Billing", path: "/modern-billing", id: "modern-billing", color: "from-blue-500 to-indigo-500", description: "Visual product grid with categories" },
    { icon: Package, label: "Inventory", path: "/inventory", id: "inventory", color: "from-green-500 to-emerald-500", description: "Manage your product catalog" },
    { icon: AlertTriangle, label: "Low Stocks", path: "/low-stocks", id: "low-stocks", color: "from-yellow-500 to-orange-500", description: "Monitor products with low inventory" },
    { icon: FileText, label: "Invoices", path: "/invoices", id: "invoices", color: "from-orange-500 to-amber-500", description: "View billing history" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", id: "analytics", color: "from-red-500 to-pink-500", description: "View sales and profit reports" },
    { icon: BarChart4, label: "Advanced Reports", path: "/advanced-reports", id: "advanced-reports", color: "from-red-600 to-orange-600", description: "Detailed monthly, category-wise reports" },
    { icon: Users, label: "Customers", path: "/customers", id: "customers", color: "from-indigo-500 to-purple-500", description: "Manage customer information" },
    { icon: Package, label: "Purchases", path: "/purchases", id: "purchases", color: "from-emerald-500 to-teal-500", description: "Track purchase orders and stock inflow" },
    { icon: Users, label: "Suppliers", path: "/suppliers", id: "suppliers", color: "from-violet-500 to-indigo-500", description: "Manage vendor contacts and products" },
    { icon: Receipt, label: "Expenses", path: "/expenses", id: "expenses", color: "from-red-500 to-rose-500", description: "Track business expenses and payments" },
    { icon: Building2, label: "Profile", path: "/profile", id: "profile", color: "from-blue-500 to-cyan-500", description: "Manage company profile and details" },
    { icon: FolderOpen, label: "Categories", path: "/categories", id: "categories", color: "from-teal-500 to-cyan-500", description: "Add and manage product categories" },
    { icon: LayoutGrid, label: "Counters", path: "/counters", id: "counters", color: "from-violet-500 to-purple-500", description: "Configure multiple billing counters" },
    { icon: Tag, label: "Coupons", path: "/coupons", id: "coupons", color: "from-pink-500 to-rose-500", description: "Create discount coupons" },
    { icon: Percent, label: "Limited Discounts", path: "/limited-discounts", id: "discounts", color: "from-amber-500 to-yellow-500", description: "Set time-based product discounts" },
    { icon: QrCode, label: "Barcodes", path: "/barcodes", id: "barcodes", color: "from-cyan-500 to-blue-500", description: "Generate barcodes and QR codes" },
    { icon: FileText, label: "Templates", path: "/templates", id: "templates", color: "from-indigo-500 to-blue-500", description: "Customize invoice templates" },
    { icon: History, label: "Audits", path: "/audits", id: "audits", color: "from-slate-500 to-gray-600", description: "View all system activities and logs" },
    { icon: RotateCcw, label: "Returns", path: "/returns", id: "returns", color: "from-rose-500 to-red-500", description: "Manage product returns and refunds" },
    { icon: ArrowUpDown, label: "Stock Ledger", path: "/inventory-movements", id: "inventory-movements", color: "from-emerald-500 to-green-600", description: "Track all stock inflows and outflows" },
    { icon: UtensilsCrossed, label: "Tables", path: "/restaurant-tables", id: "restaurant-tables", color: "from-amber-500 to-orange-500", description: "Manage restaurant table layouts" },
    { icon: ChefHat, label: "Kitchen Display", path: "/kitchen", id: "kitchen", color: "from-orange-500 to-red-500", description: "View and manage kitchen orders" },
    { icon: UserCog, label: "Waiter Interface", path: "/waiter", id: "waiter", color: "from-teal-500 to-green-500", description: "Mobile-friendly order taking" },
  ], []);

  // Filter menu items based on role
  const menuItems = useMemo(() => {
    if (authLoading || !role) return null;
    
    if (isAdmin) {
      return allMenuItems.filter(item => {
        if (['kitchen', 'waiter', 'restaurant-tables'].includes(item.id)) {
          return billingSettings?.isRestaurant;
        }
        return true;
      });
    }
    
    if (isStaff) {
      return allMenuItems.filter(item => staffModules.includes(item.id));
    }
    
    if (isWaiter) {
      return allMenuItems.filter(item => item.id === 'waiter');
    }
    
    return [];
  }, [authLoading, role, isAdmin, isStaff, isWaiter, billingSettings, staffModules, allMenuItems]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (userId) {
      fetchCompanyProfile();
      fetchLowStockProducts();
      if (isStaff) {
        fetchStaffModules();
      }
    }
  }, [authLoading, user, userId, isStaff]);

  const fetchLowStockProducts = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold')
        .eq('is_deleted', false);

      if (error) throw error;
      
      const lowStock = (data || []).filter(p => 
        p.stock_quantity <= (p.low_stock_threshold || 10)
      );
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
    }
  };

  const fetchStaffModules = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('allowed_modules')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setStaffModules(data.allowed_modules || []);
      }
    } catch (error) {
      console.error("Error fetching staff modules:", error);
    }
  };

  const fetchCompanyProfile = async () => {
    if (!userId) return;
    
    // Check cache first
    const cached = sessionStorage.getItem(COMPANY_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setCompanyName(data.company_name || '');
        setBillingSettings(data.billing_settings);
        return;
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('company_name, billing_settings')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setCompanyName(data.company_name);
        setBillingSettings(data.billing_settings);
        // Cache the result
        sessionStorage.setItem(COMPANY_CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  const handleNavigate = useCallback((path: string) => {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
    navigate(path);
  }, [navigate]);

  const handleGenerateBill = useCallback((order: any) => {
    sessionStorage.setItem('liveOrderToBill', JSON.stringify(order));
    navigate('/modern-billing');
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await signOut();
    toast.success("Logged out successfully");
  }, [signOut]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect waiter directly
  if (isWaiter) {
    navigate('/waiter');
    return null;
  }

  return (
    <PageWrapper>
      <DashboardHeader
        isStaff={isStaff}
        isAdmin={isAdmin}
        lowStockProducts={lowStockProducts}
        showLowStockPanel={showLowStockPanel}
        setShowLowStockPanel={setShowLowStockPanel}
        billingSettings={billingSettings}
        staffModules={staffModules}
        onLogout={handleLogout}
        onGenerateBill={handleGenerateBill}
      />

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
        {/* Welcome section */}
        <div className="mb-5 sm:mb-6">
          <div className="rounded-xl border border-border/50 bg-gradient-to-r from-primary/[0.04] via-transparent to-accent/[0.03] p-4 sm:p-5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Welcome back{companyName ? `, ${companyName}` : ''}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isStaff 
                ? `You have access to ${staffModules.length} module${staffModules.length !== 1 ? 's' : ''}`
                : 'Select a module to get started'
              }
            </p>
          </div>
        </div>

        <DashboardMenuGrid
          menuItems={menuItems}
          onNavigate={handleNavigate}
        />
      </main>
    </PageWrapper>
  );
};

export default Dashboard;
