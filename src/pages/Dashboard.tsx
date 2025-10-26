import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileText, Users, BarChart3, LogOut, AlertTriangle, Building2, FolderOpen, LayoutGrid, Tag, Percent, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Session, User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { icon: ShoppingCart, label: "Manual Billing", path: "/manual-billing", color: "from-purple-500 to-pink-500" },
    { icon: Package, label: "Inventory", path: "/inventory", color: "from-green-500 to-emerald-500" },
    { icon: AlertTriangle, label: "Low Stocks", path: "/low-stocks", color: "from-yellow-500 to-orange-500" },
    { icon: FileText, label: "Invoices", path: "/invoices", color: "from-orange-500 to-amber-500" },
    { icon: Users, label: "Customers", path: "/customers", color: "from-indigo-500 to-purple-500" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "from-red-500 to-pink-500" },
    { icon: Building2, label: "Profile", path: "/profile", color: "from-blue-500 to-cyan-500" },
    { icon: FolderOpen, label: "Categories", path: "/categories", color: "from-teal-500 to-cyan-500" },
    { icon: LayoutGrid, label: "Counters", path: "/counters", color: "from-violet-500 to-purple-500" },
    { icon: Tag, label: "Coupons", path: "/coupons", color: "from-pink-500 to-rose-500" },
    { icon: Percent, label: "Limited Discounts", path: "/limited-discounts", color: "from-amber-500 to-yellow-500" },
    { icon: QrCode, label: "Barcodes", path: "/barcodes", color: "from-cyan-500 to-blue-500" },
  ];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8 px-2">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Choose an option to get started</p>
        </div>

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
                  {item.label === "Inventory" && "Manage your product catalog"}
                  {item.label === "Low Stocks" && "Monitor products with low inventory"}
                  {item.label === "Invoices" && "View billing history"}
                  {item.label === "Customers" && "Manage customer information"}
                  {item.label === "Analytics" && "View sales and profit reports"}
                  {item.label === "Profile" && "Manage company profile and details"}
                  {item.label === "Categories" && "Add and manage product categories"}
                  {item.label === "Counters" && "Configure multiple business counters"}
                  {item.label === "Coupons" && "Create discount coupons for customers"}
                  {item.label === "Limited Discounts" && "Set time-based product discounts"}
                  {item.label === "Barcodes" && "Generate barcodes and QR codes"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 hidden md:block">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {item.label === "Manual Billing" && "Search and add products to create bills quickly"}
                  {item.label === "Inventory" && "Add, edit, and track your product inventory"}
                  {item.label === "Low Stocks" && "Get alerts for products running out of stock"}
                  {item.label === "Invoices" && "Access past invoices and sales records"}
                  {item.label === "Customers" && "View and add customer details for billing"}
                  {item.label === "Analytics" && "Track daily and monthly revenue and profits"}
                  {item.label === "Profile" && "Set up your business details for invoices"}
                  {item.label === "Categories" && "Create custom categories for your products"}
                  {item.label === "Counters" && "Manage multiple billing counters"}
                  {item.label === "Coupons" && "Create fixed or percentage-based discount coupons"}
                  {item.label === "Limited Discounts" && "Schedule promotional discounts on products"}
                  {item.label === "Barcodes" && "Generate printable barcodes and QR codes for products"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
