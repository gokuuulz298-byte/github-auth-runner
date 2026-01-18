import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileText, Users, BarChart3, BarChart4, LogOut, AlertTriangle, Building2, FolderOpen, LayoutGrid, Tag, Percent, QrCode, ChefHat, ClipboardList, UserCog, Receipt, UtensilsCrossed } from "lucide-react";
import GuidelinesDialog from "@/components/GuidelinesDialog";
import LiveOrdersPanel from "@/components/LiveOrdersPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/hooks/useAuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userId, role, isAdmin, isStaff, isWaiter, loading: authLoading, signOut } = useAuthContext();
  
  const [companyName, setCompanyName] = useState<string>("");
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [staffModules, setStaffModules] = useState<string[]>([]);

  const allMenuItems = [
    { icon: ShoppingCart, label: "Manual Billing", path: "/manual-billing", id: "manual-billing", color: "from-purple-500 to-pink-500" },
    { icon: ShoppingCart, label: "Modern Billing", path: "/modern-billing", id: "modern-billing", color: "from-blue-500 to-indigo-500" },
    { icon: Package, label: "Inventory", path: "/inventory", id: "inventory", color: "from-green-500 to-emerald-500" },
    { icon: AlertTriangle, label: "Low Stocks", path: "/low-stocks", id: "low-stocks", color: "from-yellow-500 to-orange-500" },
    { icon: FileText, label: "Invoices", path: "/invoices", id: "invoices", color: "from-orange-500 to-amber-500" },
    { icon: Users, label: "Customers", path: "/customers", id: "customers", color: "from-indigo-500 to-purple-500" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", id: "analytics", color: "from-red-500 to-pink-500" },
    { icon: BarChart4, label: "Advanced Reports", path: "/advanced-reports", id: "advanced-reports", color: "from-red-600 to-orange-600" },
    { icon: Building2, label: "Profile", path: "/profile", id: "profile", color: "from-blue-500 to-cyan-500" },
    { icon: FolderOpen, label: "Categories", path: "/categories", id: "categories", color: "from-teal-500 to-cyan-500" },
    { icon: LayoutGrid, label: "Counters", path: "/counters", id: "counters", color: "from-violet-500 to-purple-500" },
    { icon: Tag, label: "Coupons", path: "/coupons", id: "coupons", color: "from-pink-500 to-rose-500" },
    { icon: Percent, label: "Limited Discounts", path: "/limited-discounts", id: "discounts", color: "from-amber-500 to-yellow-500" },
    { icon: QrCode, label: "Barcodes", path: "/barcodes", id: "barcodes", color: "from-cyan-500 to-blue-500" },
    { icon: FileText, label: "Templates", path: "/templates", id: "templates", color: "from-indigo-500 to-blue-500" },
    { icon: Package, label: "Purchases", path: "/purchases", id: "purchases", color: "from-emerald-500 to-teal-500" },
    { icon: Users, label: "Suppliers", path: "/suppliers", id: "suppliers", color: "from-violet-500 to-indigo-500" },
    { icon: Receipt, label: "Expenses", path: "/expenses", id: "expenses", color: "from-red-500 to-rose-500" },
    { icon: UtensilsCrossed, label: "Tables", path: "/restaurant-tables", id: "restaurant-tables", color: "from-amber-500 to-orange-500" },
    { icon: ChefHat, label: "Kitchen Display", path: "/kitchen", id: "kitchen", color: "from-orange-500 to-red-500" },
    { icon: UserCog, label: "Waiter Interface", path: "/waiter", id: "waiter", color: "from-teal-500 to-green-500" },
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
      if (isStaff) {
        fetchStaffModules();
      }
    }
  }, [authLoading, user, userId, isStaff]);

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

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
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
                onClick={() => navigate(item.path)}
              >
                <CardHeader className="p-3 sm:p-6">
                  <div className={`p-2 sm:p-3 bg-gradient-to-br ${item.color} bg-opacity-10 rounded-xl w-fit mb-2 group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <CardTitle className="text-sm sm:text-base md:text-lg">{item.label}</CardTitle>
                  <CardDescription className="hidden sm:block text-xs sm:text-sm">
                    {item.label === "Manual Billing" && "Create bills by searching products"}
                    {item.label === "Modern Billing" && "Visual product grid with categories"}
                    {item.label === "Inventory" && "Manage your product catalog"}
                    {item.label === "Low Stocks" && "Monitor products with low inventory"}
                    {item.label === "Invoices" && "View billing history"}
                    {item.label === "Customers" && "Manage customer information"}
                    {item.label === "Analytics" && "View sales and profit reports"}
                    {item.label === "Advanced Reports" && "View detailed monthly, category-wise, and product-wise reports"}
                    {item.label === "Profile" && "Manage company profile and details"}
                    {item.label === "Categories" && "Add and manage product categories"}
                    {item.label === "Counters" && "Configure multiple business counters"}
                    {item.label === "Coupons" && "Create discount coupons for customers"}
                    {item.label === "Limited Discounts" && "Set time-based product discounts"}
                    {item.label === "Barcodes" && "Generate barcodes and QR codes"}
                    {item.label === "Templates" && "Customize your invoice templates"}
                    {item.label === "Tables" && "Manage restaurant tables"}
                    {item.label === "Kitchen Display" && "View and manage kitchen orders"}
                    {item.label === "Waiter Interface" && "Take orders as waiter"}
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
                    {item.label === "Advanced Reports" && "Take deep insights through advanced reporting modules and export features"}
                    {item.label === "Profile" && "Set up your business details for invoices"}
                    {item.label === "Categories" && "Create custom categories for your products"}
                    {item.label === "Counters" && "Manage multiple billing counters"}
                    {item.label === "Coupons" && "Create fixed or percentage-based discount coupons"}
                    {item.label === "Limited Discounts" && "Schedule promotional discounts on products"}
                    {item.label === "Barcodes" && "Generate printable barcodes and QR codes for products"}
                    {item.label === "Templates" && "Create and manage custom A4 invoice templates"}
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
