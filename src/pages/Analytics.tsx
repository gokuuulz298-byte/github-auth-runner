import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Package, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Invoice {
  id: string;
  bill_number: string;
  total_amount: number;
  tax_amount: number;
  discount_amount?: number;
  items_data: any[];
  created_at: string;
  customer_name?: string;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalTax: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyInvoices, setDailyInvoices] = useState<Invoice[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>("all");

  useEffect(() => {
    fetchCounters();
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchDailyData();
    fetchWeeklyData();

    // Set up real-time subscription for invoices
    const channel = supabase
      .channel('analytics-invoices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        () => {
          // Refresh all data when invoices change
          fetchAnalytics();
          fetchDailyData();
          fetchWeeklyData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, selectedCounter]);

  const fetchCounters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;
      setCounters(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('invoices')
        .select('total_amount, tax_amount, items_data')
        .eq('created_by', user.id);
      
      if (selectedCounter !== "all") {
        query = query.eq('counter_id', selectedCounter);
      }
      
      const { data: invoices } = await query;

      // Include deleted products for historical analytics data
      const { data: productsList } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id);

      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('created_by', user.id);

      setProducts(productsList || []);

      const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0) || 0;
      const totalTax = invoices?.reduce((sum, inv) => sum + parseFloat(inv.tax_amount.toString()), 0) || 0;
      
      let totalProfit = 0;
      invoices?.forEach(invoice => {
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = productsList?.find(p => p.id === item.id);
          if (product && product.buying_price) {
            const profit = (item.price - product.buying_price) * item.quantity;
            totalProfit += profit;
          }
        });
      });

      setStats({
        totalSales: invoices?.length || 0,
        totalRevenue,
        totalProfit,
        totalTax,
        totalProducts: productsList?.length || 0,
        totalCustomers: customers?.length || 0,
      });
    } catch (error) {
      toast.error("Error fetching analytics");
      console.error(error);
    }
  };

  const fetchDailyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (selectedCounter !== "all") {
        query = query.eq('counter_id', selectedCounter);
      }

      const { data: invoices } = await query;

      setDailyInvoices((invoices || []) as Invoice[]);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all products including deleted ones for historical calculations
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, 'MMM dd'),
          start: startOfDay(date),
          end: endOfDay(date),
          sales: 0,
          profit: 0,
          revenue: 0,
        };
      });

      for (const day of last7Days) {
        let query = supabase
          .from('invoices')
          .select('total_amount, items_data')
          .eq('created_by', user.id)
          .gte('created_at', day.start.toISOString())
          .lte('created_at', day.end.toISOString());

        if (selectedCounter !== "all") {
          query = query.eq('counter_id', selectedCounter);
        }

        const { data: invoices } = await query;

        day.sales = invoices?.length || 0;
        day.revenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0) || 0;

        let dayProfit = 0;
        invoices?.forEach(invoice => {
          const items = invoice.items_data as any[];
          items.forEach((item: any) => {
            const product = allProducts?.find(p => p.id === item.id);
            if (product && product.buying_price) {
              dayProfit += (item.price - product.buying_price) * item.quantity;
            }
          });
        });
        day.profit = dayProfit;
      }

      setWeeklyData(last7Days);
    } catch (error) {
      console.error(error);
    }
  };

  const calculateDailyProfit = () => {
    let profit = 0;
    dailyInvoices.forEach(invoice => {
      const items = invoice.items_data as any[];
      items.forEach((item: any) => {
        const product = products.find(p => p.id === item.id);
        if (product && product.buying_price) {
          profit += (item.price - product.buying_price) * item.quantity;
        }
      });
    });
    return profit;
  };

  const dailyRevenue = dailyInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
  const dailyTax = dailyInvoices.reduce((sum, inv) => sum + parseFloat(inv.tax_amount.toString()), 0);
  const dailyProfit = calculateDailyProfit();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Analytics & Reports</h1>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Counter Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter by Counter</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCounter} onValueChange={setSelectedCounter}>
              <SelectTrigger>
                <SelectValue placeholder="Select counter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counters</SelectItem>
                {counters.map((counter) => (
                  <SelectItem key={counter.id} value={counter.id}>
                    {counter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground">All-time invoices</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">₹{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total sales amount</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">₹{stats.totalProfit.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Profit from all sales</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-orange-600">₹{stats.totalTax.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Tax collected</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Last 7 Days Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue (₹)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last 7 Days Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="profit" fill="#3b82f6" name="Profit (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Analytics - {format(selectedDate, 'PPP')}
              </CardTitle>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-2 sm:px-3 py-1 sm:py-2 border rounded-md bg-background text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Bills</p>
                <p className="text-xl sm:text-2xl font-bold">{dailyInvoices.length}</p>
              </div>
              <div className="p-4 bg-green-500/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">₹{dailyRevenue.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-blue-500/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Profit</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">₹{dailyProfit.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-orange-500/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Tax</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">₹{dailyTax.toFixed(2)}</p>
              </div>
            </div>

            {/* Bill Logs */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Bills on {format(selectedDate, 'MMM dd, yyyy')}</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dailyInvoices.map((invoice) => {
                  const items = invoice.items_data as any[];
                  const invoiceProfit = items.reduce((sum, item: any) => {
                    const product = products.find(p => p.id === item.id);
                    if (product && product.buying_price) {
                      return sum + (item.price - product.buying_price) * item.quantity;
                    }
                    return sum;
                  }, 0);

                  const hasDiscount = invoice.discount_amount && parseFloat(invoice.discount_amount.toString()) > 0;
                  const hasProductDiscount = items.some(item => item.discountInfo);

                  return (
                    <div key={invoice.id} className="p-2 sm:p-3 bg-muted/30 rounded-lg flex flex-col sm:flex-row justify-between gap-2 sm:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <p className="font-medium text-sm sm:text-base truncate">{invoice.bill_number}</p>
                          {hasDiscount && (
                            <span className="text-xs bg-orange-500/20 text-orange-700 px-2 py-0.5 rounded">
                              Coupon Applied
                            </span>
                          )}
                          {hasProductDiscount && (
                            <span className="text-xs bg-green-500/20 text-green-700 px-2 py-0.5 rounded">
                              Product Discount
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {invoice.customer_name || 'Walk-in'} • {format(new Date(invoice.created_at), 'hh:mm a')}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="font-bold text-green-600 text-sm sm:text-base">₹{parseFloat(invoice.total_amount.toString()).toFixed(2)}</p>
                        <p className="text-xs sm:text-sm text-blue-600">Profit: ₹{invoiceProfit.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          Tax: ₹{parseFloat(invoice.tax_amount.toString()).toFixed(2)}
                          {hasDiscount && ` • Disc: ₹${parseFloat(invoice.discount_amount.toString()).toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {dailyInvoices.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No bills found for this date</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
