import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileText, Users, BarChart3, BarChart4, LogOut, AlertTriangle, Building2, FolderOpen, LayoutGrid, Tag, Percent, QrCode, ChefHat, ClipboardList, UserCog, Receipt } from "lucide-react";
import GuidelinesDialog from "@/components/GuidelinesDialog";
import InterfaceSelector from "@/components/InterfaceSelector";
import LiveOrdersPanel from "@/components/LiveOrdersPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Session, User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

interface Waiter {
  id: string;
  username: string;
  password: string;
  display_name: string;
  is_active: boolean;
}

interface StaffSession {
  id: string;
  email: string;
  display_name: string;
  allowed_modules: string[];
  show_in_bill: boolean;
  created_by: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>(() => {
    return sessionStorage.getItem('companyName') || "";
  });
  const [billingSettings, setBillingSettings] = useState<any>(() => {
    const cached = sessionStorage.getItem('billingSettings');
    return cached ? JSON.parse(cached) : null;
  });
  const [showInterfaceSelector, setShowInterfaceSelector] = useState(false);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => {
    const cached = sessionStorage.getItem('staffSession');
    return cached ? JSON.parse(cached) : null;
  });

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
    { icon: Receipt, label: "Expenses", path: "/expenses", id: "expenses", color: "from-red-500 to-rose-500" },
    { icon: ChefHat, label: "Kitchen Display", path: "/kitchen", id: "kitchen", color: "from-orange-500 to-red-500" },
    { icon: UserCog, label: "Waiter Interface", path: "/waiter", id: "waiter", color: "from-teal-500 to-green-500" },
  ];

  // Filter menu items based on staff permissions
  const menuItems = staffSession 
    ? allMenuItems.filter(item => staffSession.allowed_modules.includes(item.id))
    : allMenuItems.filter(item => !['kitchen', 'waiter'].includes(item.id)); // Admin doesn't need these in grid

  useEffect(() => {
    // Check for staff session first
    const storedStaffSession = sessionStorage.getItem('staffSession');
    if (storedStaffSession) {
      const parsed = JSON.parse(storedStaffSession);
      setStaffSession(parsed);
      // For staff, we need to fetch company data using their admin's ID
      fetchCompanyProfileForStaff(parsed.created_by);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session) {
          navigate("/auth");
        } else if (!authChecked) {
          fetchCompanyProfile(session.user.id);
          fetchWaiters(session.user.id);
          setAuthChecked(true);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      } else if (!authChecked) {
        fetchCompanyProfile(session.user.id);
        fetchWaiters(session.user.id);
        setAuthChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, authChecked]);

  const fetchCompanyProfileForStaff = async (adminUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('company_name, billing_settings')
        .eq('user_id', adminUserId)
        .maybeSingle();
      
      if (!error && data) {
        setCompanyName(data.company_name);
        sessionStorage.setItem('companyName', data.company_name);
        const settings = data.billing_settings as any;
        setBillingSettings(settings);
        sessionStorage.setItem('billingSettings', JSON.stringify(settings));
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  const fetchCompanyProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('company_name, billing_settings')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setCompanyName(data.company_name);
        sessionStorage.setItem('companyName', data.company_name);
        const settings = data.billing_settings as any;
        setBillingSettings(settings);
        sessionStorage.setItem('billingSettings', JSON.stringify(settings));
        
        // Show interface selector if security is enabled AND restaurant mode is on
        if (settings?.securityProtection && settings?.isRestaurant && !staffSession) {
          setShowInterfaceSelector(true);
        }
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  const fetchWaiters = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .eq('created_by', userId)
        .eq('is_active', true);

      if (!error && data) {
        setWaiters(data as Waiter[]);
      }
    } catch (error) {
      console.error("Error fetching waiters:", error);
    }
  };

  const handleInterfaceSelect = (type: 'billing' | 'kitchen' | 'waiter', waiterData?: { id: string; name: string }) => {
    setShowInterfaceSelector(false);
    
    if (type === 'waiter' && waiterData) {
      sessionStorage.setItem('waiterData', JSON.stringify({
        ...waiterData,
        ownerId: user?.id
      }));
      navigate('/waiter');
    } else if (type === 'kitchen') {
      navigate('/kitchen');
    }
    // For billing, just close the selector and show dashboard
  };

  const handleLogout = async () => {
    // Clear staff session if exists
    if (staffSession) {
      sessionStorage.removeItem('staffSession');
      sessionStorage.removeItem('companyName');
      sessionStorage.removeItem('billingSettings');
      setStaffSession(null);
      toast.success("Logged out successfully");
      navigate("/auth");
      return;
    }

    await supabase.auth.signOut();
    sessionStorage.removeItem('companyName');
    sessionStorage.removeItem('billingSettings');
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handleGenerateBill = (order: any) => {
    // Navigate to billing with order data
    sessionStorage.setItem('liveOrderToBill', JSON.stringify(order));
    navigate('/modern-billing');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show interface selector as fullscreen when security is enabled (only for admin, not staff)
  if (showInterfaceSelector && !staffSession) {
    return (
      <InterfaceSelector
        open={showInterfaceSelector}
        onClose={() => setShowInterfaceSelector(false)}
        onSelect={handleInterfaceSelect}
        billingPassword={billingSettings?.billingPassword}
        kitchenPassword={billingSettings?.kitchenPassword}
        securityEnabled={billingSettings?.securityProtection || false}
        waiters={waiters}
        enableWaiters={waiters.length > 0 && billingSettings?.isRestaurant}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Eduvanca Billing</h1>
            {staffSession && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <UserCog className="h-3 w-3" />
                Staff
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Live Orders Button - Only show if restaurant mode */}
            {billingSettings?.isRestaurant && !staffSession && (
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
            
            {/* Kitchen Display Button - Only show if enabled and user has access */}
            {billingSettings?.enableKitchenInterface && (!staffSession || staffSession.allowed_modules.includes('kitchen')) && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate('/kitchen')}
                title="Kitchen Display"
              >
                <ChefHat className="h-5 w-5" />
              </Button>
            )}
            
            {!staffSession && <GuidelinesDialog />}
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
            Welcome{staffSession ? `, ${staffSession.display_name}` : companyName ? `, ${companyName}` : ''}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {staffSession 
              ? `You have access to ${staffSession.allowed_modules.length} module${staffSession.allowed_modules.length !== 1 ? 's' : ''}`
              : 'Choose an option to get started'
            }
          </p>
        </div>

        {menuItems.length === 0 ? (
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