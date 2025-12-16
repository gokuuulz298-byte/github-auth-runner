import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileText, Users, BarChart3, BarChart4, LogOut, AlertTriangle, Building2, FolderOpen, LayoutGrid, Tag, Percent, QrCode, ChefHat } from "lucide-react";
import GuidelinesDialog from "@/components/GuidelinesDialog";
import InterfaceSelector from "@/components/InterfaceSelector";
import { toast } from "sonner";
import { Session, User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [showInterfaceSelector, setShowInterfaceSelector] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const menuItems = [
    { icon: ShoppingCart, label: "Manual Billing", path: "/manual-billing", color: "from-purple-500 to-pink-500", requiresAuth: true },
    { icon: ShoppingCart, label: "Modern Billing", path: "/modern-billing", color: "from-blue-500 to-indigo-500", requiresAuth: true },
    { icon: ChefHat, label: "Kitchen Display", path: "/kitchen", color: "from-orange-500 to-amber-500", requiresAuth: true, kitchenOnly: true },
    { icon: Package, label: "Inventory", path: "/inventory", color: "from-green-500 to-emerald-500" },
    { icon: AlertTriangle, label: "Low Stocks", path: "/low-stocks", color: "from-yellow-500 to-orange-500" },
    { icon: FileText, label: "Invoices", path: "/invoices", color: "from-orange-500 to-amber-500" },
    { icon: Users, label: "Customers", path: "/customers", color: "from-indigo-500 to-purple-500" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "from-red-500 to-pink-500" },
    { icon: BarChart4, label: "Advanced Reports", path: "/advanced-reports", color: "from-red-600 to-orange-600" },
    { icon: Building2, label: "Profile", path: "/profile", color: "from-blue-500 to-cyan-500" },
    { icon: FolderOpen, label: "Categories", path: "/categories", color: "from-teal-500 to-cyan-500" },
    { icon: LayoutGrid, label: "Counters", path: "/counters", color: "from-violet-500 to-purple-500" },
    { icon: Tag, label: "Coupons", path: "/coupons", color: "from-pink-500 to-rose-500" },
    { icon: Percent, label: "Limited Discounts", path: "/limited-discounts", color: "from-amber-500 to-yellow-500" },
    { icon: QrCode, label: "Barcodes", path: "/barcodes", color: "from-cyan-500 to-blue-500" },
    { icon: FileText, label: "Templates", path: "/templates", color: "from-indigo-500 to-blue-500" },
  ];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session) {
          navigate("/auth");
        } else {
          fetchCompanyProfile(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      } else {
        fetchCompanyProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCompanyProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('company_name, billing_settings')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setCompanyName(data.company_name);
        setBillingSettings(data.billing_settings as any);
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  const handleMenuClick = (path: string, item: any) => {
    const isBillingOrKitchen = item.requiresAuth;
    const isKitchenPath = path === '/kitchen';
    
    // Check if security protection is enabled and this is a protected path
    if (billingSettings?.securityProtection && isBillingOrKitchen) {
      setPendingNavigation(path);
      setShowInterfaceSelector(true);
    } else {
      // Check if kitchen is enabled for kitchen path
      if (isKitchenPath && !billingSettings?.enableKitchenInterface) {
        toast.error("Kitchen interface is not enabled");
        return;
      }
      navigate(path);
    }
  };

  const handleInterfaceSelect = (type: 'billing' | 'kitchen') => {
    setShowInterfaceSelector(false);
    if (type === 'billing') {
      navigate(pendingNavigation || '/modern-billing');
    } else {
      navigate('/kitchen');
    }
    setPendingNavigation(null);
  };

  // Filter menu items based on settings
  const filteredMenuItems = menuItems.filter(item => {
    if (item.kitchenOnly) {
      return billingSettings?.enableKitchenInterface;
    }
    return true;
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Eduvanca Billing</h1>
          </div>
          <div className="flex items-center gap-2">
            <GuidelinesDialog />
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
            Welcome back{companyName ? `, ${companyName}` : ''}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Choose an option to get started</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredMenuItems.map((item) => (
            <Card 
              key={item.path}
              className="card-hover cursor-pointer group transition-all"
              onClick={() => handleMenuClick(item.path, item)}
            >
              <CardHeader className="p-3 sm:p-6">
                <div className={`p-2 sm:p-3 bg-gradient-to-br ${item.color} bg-opacity-10 rounded-xl w-fit mb-2 group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                </div>
                <CardTitle className="text-sm sm:text-base md:text-lg">{item.label}</CardTitle>
                <CardDescription className="hidden sm:block text-xs sm:text-sm">
                  {item.label === "Manual Billing" && "Create bills by searching products"}
                  {item.label === "Modern Billing" && "Visual product grid with categories"}
                  {item.label === "Kitchen Display" && "Real-time order management for kitchen"}
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
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 hidden md:block">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {item.label === "Manual Billing" && "Search and add products to create bills quickly"}
                  {item.label === "Modern Billing" && "Browse products by category with images"}
                  {item.label === "Kitchen Display" && "View and update order status in real-time"}
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
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interface Selector Dialog */}
        <InterfaceSelector
          open={showInterfaceSelector}
          onClose={() => setShowInterfaceSelector(false)}
          onSelect={handleInterfaceSelect}
          billingPassword={billingSettings?.billingPassword}
          kitchenPassword={billingSettings?.kitchenPassword}
          securityEnabled={billingSettings?.securityProtection || false}
        />
      </main>
    </div>
  );
};

export default Dashboard;
