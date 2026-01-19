import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileText, Users, BarChart3, BarChart4, LogOut, AlertTriangle, Building2, FolderOpen, LayoutGrid, Tag, Percent, QrCode, ChefHat, ClipboardList, UserCog, Receipt, UtensilsCrossed, Bell, X, History } from "lucide-react";
import GuidelinesDialog from "@/components/GuidelinesDialog";
import LiveOrdersPanel from "@/components/LiveOrdersPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/hooks/useAuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

const SCROLL_POSITION_KEY = 'dashboard_scroll_position';

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
  const mainRef = useRef<HTMLDivElement>(null);
  
  const [companyName, setCompanyName] = useState<string>("");
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [staffModules, setStaffModules] = useState<string[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [showLowStockPanel, setShowLowStockPanel] = useState(false);

  // Restore scroll position on mount and when returning from other pages
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition) {
      // Use requestAnimationFrame for smoother scroll restoration
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({ top: parseInt(savedPosition, 10), behavior: 'instant' });
        }, 50);
      });
    }

    // Clear stored position after restoring (one-time use per navigation)
    return () => {
      // Keep position for when returning to this page
    };
  }, [location.key]);

  // Save scroll position before navigating
  const handleNavigate = (path: string) => {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
    navigate(path);
  };

  const allMenuItems = [
    // Primary billing modules
    { icon: ShoppingCart, label: "Modern Billing", path: "/modern-billing", id: "modern-billing", color: "from-blue-500 to-indigo-500", description: "Visual product grid with categories" },
    { icon: ShoppingCart, label: "Manual Billing", path: "/manual-billing", id: "manual-billing", color: "from-purple-500 to-pink-500", description: "Create bills by searching products" },
    // Inventory & Stock
    { icon: Package, label: "Inventory", path: "/inventory", id: "inventory", color: "from-green-500 to-emerald-500", description: "Manage your product catalog" },
    { icon: AlertTriangle, label: "Low Stocks", path: "/low-stocks", id: "low-stocks", color: "from-yellow-500 to-orange-500", description: "Monitor products with low inventory" },
    // Sales & Reports
    { icon: FileText, label: "Invoices", path: "/invoices", id: "invoices", color: "from-orange-500 to-amber-500", description: "View billing history" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", id: "analytics", color: "from-red-500 to-pink-500", description: "View sales and profit reports" },
    { icon: BarChart4, label: "Advanced Reports", path: "/advanced-reports", id: "advanced-reports", color: "from-red-600 to-orange-600", description: "Detailed monthly, category-wise reports" },
    // Customer Management
    { icon: Users, label: "Customers", path: "/customers", id: "customers", color: "from-indigo-500 to-purple-500", description: "Manage customer information" },
    // Purchase & Supplier Management
    { icon: Package, label: "Purchases", path: "/purchases", id: "purchases", color: "from-emerald-500 to-teal-500", description: "Track purchase orders and stock inflow" },
    { icon: Users, label: "Suppliers", path: "/suppliers", id: "suppliers", color: "from-violet-500 to-indigo-500", description: "Manage vendor contacts and products" },
    { icon: Receipt, label: "Expenses", path: "/expenses", id: "expenses", color: "from-red-500 to-rose-500", description: "Track business expenses and payments" },
    // Settings & Configuration
    { icon: Building2, label: "Profile", path: "/profile", id: "profile", color: "from-blue-500 to-cyan-500", description: "Manage company profile and details" },
    { icon: FolderOpen, label: "Categories", path: "/categories", id: "categories", color: "from-teal-500 to-cyan-500", description: "Add and manage product categories" },
    { icon: LayoutGrid, label: "Counters", path: "/counters", id: "counters", color: "from-violet-500 to-purple-500", description: "Configure multiple billing counters" },
    { icon: Tag, label: "Coupons", path: "/coupons", id: "coupons", color: "from-pink-500 to-rose-500", description: "Create discount coupons" },
    { icon: Percent, label: "Limited Discounts", path: "/limited-discounts", id: "discounts", color: "from-amber-500 to-yellow-500", description: "Set time-based product discounts" },
    { icon: QrCode, label: "Barcodes", path: "/barcodes", id: "barcodes", color: "from-cyan-500 to-blue-500", description: "Generate barcodes and QR codes" },
    { icon: FileText, label: "Templates", path: "/templates", id: "templates", color: "from-indigo-500 to-blue-500", description: "Customize invoice templates" },
    // Audits
    { icon: History, label: "Audits", path: "/audits", id: "audits", color: "from-slate-500 to-gray-600", description: "View all system activities and logs" },
    // Restaurant specific
    { icon: UtensilsCrossed, label: "Tables", path: "/restaurant-tables", id: "restaurant-tables", color: "from-amber-500 to-orange-500", description: "Manage restaurant table layouts" },
    { icon: ChefHat, label: "Kitchen Display", path: "/kitchen", id: "kitchen", color: "from-orange-500 to-red-500", description: "View and manage kitchen orders" },
    { icon: UserCog, label: "Waiter Interface", path: "/waiter", id: "waiter", color: "from-teal-500 to-green-500", description: "Mobile-friendly order taking" },
  ];

  // Filter menu items based on role and permissions
  const getFilteredMenuItems = () => {
    // Wait for role to be loaded
    if (authLoading || !role) {
      return null; // Return null while loading
    }
    
    if (isAdmin) {
      // Admin sees all except waiter interface in grid (they can access via button)
      // Only show restaurant items if restaurant mode is enabled
      return allMenuItems.filter(item => {
        if (['kitchen', 'waiter', 'restaurant-tables'].includes(item.id)) {
          return billingSettings?.isRestaurant;
        }
        return true;
      });
    }
    
    if (isStaff) {
      // Staff sees only allowed modules
      return allMenuItems.filter(item => staffModules.includes(item.id));
    }
    
    if (isWaiter) {
      // Waiter only sees waiter interface
      return allMenuItems.filter(item => item.id === 'waiter');
    }
    
    return [];
  };

  const menuItems = getFilteredMenuItems();

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
      
      // Filter products where stock is below or equal to threshold
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
    
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('company_name, billing_settings')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setCompanyName(data.company_name);
        const settings = data.billing_settings as any;
        setBillingSettings(settings);
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  const handleGenerateBill = (order: any) => {
    sessionStorage.setItem('liveOrderToBill', JSON.stringify(order));
    navigate('/modern-billing');
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect waiter directly to waiter interface
  if (isWaiter) {
    navigate('/waiter');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Eduvanca Billing</h1>
            {isStaff && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <UserCog className="h-3 w-3" />
                Staff
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Low Stock Alert Button */}
            {isAdmin && lowStockProducts.length > 0 && (
              <Sheet open={showLowStockPanel} onOpenChange={setShowLowStockPanel}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative" title="Low Stock Alerts">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {lowStockProducts.length > 99 ? '99+' : lowStockProducts.length}
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[350px] sm:w-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
                    </div>
                  </div>
                  <ScrollArea className="h-[calc(100vh-120px)]">
                    <div className="space-y-2 pr-4">
                      {lowStockProducts.map((product) => (
                        <Card key={product.id} className="border-l-4 border-l-destructive">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Threshold: {product.low_stock_threshold || 10}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold text-lg ${product.stock_quantity <= 0 ? 'text-destructive' : 'text-warning'}`}>
                                  {product.stock_quantity}
                                </p>
                                <p className="text-[10px] text-muted-foreground">in stock</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-4">
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setShowLowStockPanel(false);
                        navigate('/low-stocks');
                      }}
                    >
                      View All Low Stock Items
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Live Orders Button - Only show if restaurant mode */}
            {billingSettings?.isRestaurant && isAdmin && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" title="Live Orders">
                    <ClipboardList className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] p-0">
                  <LiveOrdersPanel onGenerateBill={handleGenerateBill} />
                </SheetContent>
              </Sheet>
            )}
            
            {/* Kitchen Display Button - Only show if enabled */}
            {billingSettings?.enableKitchenInterface && (isAdmin || staffModules.includes('kitchen')) && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate('/kitchen')}
                title="Kitchen Display"
              >
                <ChefHat className="h-5 w-5" />
              </Button>
            )}
            
            {isAdmin && <GuidelinesDialog />}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main ref={mainRef} className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <div className="mb-4 sm:mb-8 px-2">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome{companyName ? `, ${companyName}` : ''}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isStaff 
              ? `You have access to ${staffModules.length} module${staffModules.length !== 1 ? 's' : ''}`
              : 'Choose an option to get started'
            }
          </p>
        </div>

        {menuItems === null ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-12">
            <UserCog className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-muted-foreground">No modules assigned</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Contact your administrator to get access to modules.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {menuItems.map((item) => (
              <Card 
                key={item.path}
                className="card-hover cursor-pointer group transition-all"
                onClick={() => handleNavigate(item.path)}
              >
                <CardHeader className="p-3 sm:p-6">
                  <div className={`p-2 sm:p-3 bg-gradient-to-br ${item.color} bg-opacity-10 rounded-xl w-fit mb-2 group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <CardTitle className="text-sm sm:text-base md:text-lg">{item.label}</CardTitle>
                  <CardDescription className="hidden sm:block text-xs sm:text-sm">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 hidden md:block">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {item.label === "Manual Billing" && "Search and add products to create bills quickly"}
                    {item.label === "Modern Billing" && "Browse products by category with images"}
                    {item.label === "Inventory" && "Add, edit, and track your product inventory"}
                    {item.label === "Low Stocks" && "Get alerts for products running out of stock"}
                    {item.label === "Invoices" && "Access past invoices and sales records"}
                    {item.label === "Customers" && "View and add customer details for billing"}
                    {item.label === "Analytics" && "Track daily and monthly revenue and profits"}
                    {item.label === "Advanced Reports" && "Take deep insights through advanced reporting modules"}
                    {item.label === "Profile" && "Set up your business details for invoices"}
                    {item.label === "Categories" && "Create custom categories for your products"}
                    {item.label === "Counters" && "Manage multiple billing counters"}
                    {item.label === "Coupons" && "Create fixed or percentage-based discount coupons"}
                    {item.label === "Limited Discounts" && "Schedule promotional discounts on products"}
                    {item.label === "Barcodes" && "Generate printable barcodes and QR codes"}
                    {item.label === "Templates" && "Create and manage custom invoice templates"}
                    {item.label === "Purchases" && "Create and track purchase orders from suppliers"}
                    {item.label === "Suppliers" && "Manage vendor details and map products"}
                    {item.label === "Expenses" && "Record and categorize business expenses"}
                    {item.label === "Tables" && "Add and manage restaurant table layouts"}
                    {item.label === "Kitchen Display" && "Real-time kitchen order management"}
                    {item.label === "Waiter Interface" && "Mobile-friendly order taking interface"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
