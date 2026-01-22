import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package, Users, Calendar, BarChart3, Target, Activity, Percent, ShoppingBag, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalTax: 0,
    totalDiscount: 0,
    totalProducts: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    revenueGrowth: 0,
    profitGrowth: 0,
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
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('invoices')
        .select('total_amount, tax_amount, items_data, discount_amount, created_at')
        .eq('created_by', user.id);
      
      if (selectedCounter !== "all") {
        query = query.eq('counter_id', selectedCounter);
      }
      
      const { data: invoices } = await query;

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
      const totalDiscount = invoices?.reduce((sum, inv: any) => sum + parseFloat((inv.discount_amount || 0).toString()), 0) || 0;
      
      // Calculate profit using correct formula based on billing mode
      let totalProfit = 0;
      invoices?.forEach(invoice => {
        const items = invoice.items_data as any[];
        let invoiceProfit = 0;
        items.forEach((item: any) => {
          const product = productsList?.find(p => p.id === item.id);
          if (product && product.buying_price) {
            const taxRate = item.tax_rate || product.tax_rate || 0;
            const isInclusive = item.is_inclusive !== false; // default to inclusive
            // For inclusive pricing, extract base price; for exclusive, use as-is
            const baseSellingPrice = isInclusive && taxRate > 0 
              ? item.price / (1 + taxRate / 100)
              : item.price;
            invoiceProfit += (baseSellingPrice - product.buying_price) * item.quantity;
          }
        });
        const invoiceDiscount = parseFloat(((invoice as any).discount_amount || 0).toString());
        totalProfit += (invoiceProfit - invoiceDiscount);
      });

      // Calculate growth (compare last 7 days vs previous 7 days)
      const now = new Date();
      const last7DaysInvoices = invoices?.filter(inv => 
        new Date(inv.created_at) >= subDays(now, 7)
      ) || [];
      const prev7DaysInvoices = invoices?.filter(inv => 
        new Date(inv.created_at) >= subDays(now, 14) && 
        new Date(inv.created_at) < subDays(now, 7)
      ) || [];

      const last7Revenue = last7DaysInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
      const prev7Revenue = prev7DaysInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
      const revenueGrowth = prev7Revenue > 0 ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100 : 0;

      const avgOrderValue = invoices && invoices.length > 0 ? totalRevenue / invoices.length : 0;

      setStats({
        totalSales: invoices?.length || 0,
        totalRevenue,
        totalProfit,
        totalTax,
        totalDiscount,
        totalProducts: productsList?.length || 0,
        totalCustomers: customers?.length || 0,
        avgOrderValue,
        revenueGrowth,
        profitGrowth: 0,
      });
      setLoading(false);
    } catch (error) {
      toast.error("Error fetching analytics");
      console.error(error);
      setLoading(false);
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

      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, 'MMM dd'),
          day: format(date, 'EEE'),
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
              const taxRate = item.tax_rate || product.tax_rate || 0;
              const isInclusive = item.is_inclusive !== false;
              const baseSellingPrice = isInclusive && taxRate > 0 
                ? item.price / (1 + taxRate / 100)
                : item.price;
              dayProfit += (baseSellingPrice - product.buying_price) * item.quantity;
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
          const taxRate = item.tax_rate || product.tax_rate || 0;
          const isInclusive = (item as any).is_inclusive !== false;
          const baseSellingPrice = isInclusive && taxRate > 0 
            ? item.price / (1 + taxRate / 100)
            : item.price;
          profit += (baseSellingPrice - product.buying_price) * item.quantity;
        }
      });
    });
    return profit;
  };

  const dailyRevenue = dailyInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
  const dailyTax = dailyInvoices.reduce((sum, inv) => sum + parseFloat(inv.tax_amount.toString()), 0);
  const dailyProfit = calculateDailyProfit();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

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
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Business Overview</h2>
                <p className="text-sm text-muted-foreground">Track your sales performance</p>
              </div>
              <Select value={selectedCounter} onValueChange={setSelectedCounter}>
                <SelectTrigger className="w-[200px]">
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
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards - Zoho Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-100">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">₹{stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="flex items-center mt-1 text-xs">
                {stats.revenueGrowth >= 0 ? (
                  <span className="flex items-center text-green-200">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    {stats.revenueGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center text-red-200">
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    {Math.abs(stats.revenueGrowth).toFixed(1)}%
                  </span>
                )}
                <span className="ml-1 text-blue-200">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-green-100">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">₹{stats.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-green-200 mt-1">
                {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}% margin
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-purple-100">Total Sales</CardTitle>
              <ShoppingBag className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{stats.totalSales.toLocaleString()}</div>
              <p className="text-xs text-purple-200 mt-1">invoices generated</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-orange-100">Avg Order Value</CardTitle>
              <Target className="h-4 w-4 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">₹{stats.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-orange-200 mt-1">per transaction</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-pink-100">Tax Collected</CardTitle>
              <Percent className="h-4 w-4 text-pink-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">₹{stats.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-pink-200 mt-1">GST amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{stats.totalProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{stats.totalCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Discounts Given
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-orange-600">₹{stats.totalDiscount.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Avg Items/Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">
                {stats.totalSales > 0 ? (stats.totalProducts / stats.totalSales).toFixed(1) : 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Revenue & Profit Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => `₹${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" name="Revenue (₹)" />
                  <Bar dataKey="profit" fill="#10b981" name="Profit (₹)" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Daily Sales Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toFixed(0)} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => value.toFixed(0)}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#8b5cf6" 
                    fill="url(#salesGradient)" 
                    name="Orders" 
                  />
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Analytics - {format(selectedDate, 'PPP')}
              </CardTitle>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                <p className="text-xs text-muted-foreground font-medium">Bills</p>
                <p className="text-2xl font-bold">{dailyInvoices.length}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-xs text-muted-foreground font-medium">Revenue</p>
                <p className="text-2xl font-bold text-green-600">₹{dailyRevenue.toFixed(0)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-muted-foreground font-medium">Profit</p>
                <p className="text-2xl font-bold text-blue-600">₹{dailyProfit.toFixed(0)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-xl border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-muted-foreground font-medium">Tax</p>
                <p className="text-2xl font-bold text-orange-600">₹{dailyTax.toFixed(0)}</p>
              </div>
            </div>

            {/* Bill Logs */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                Bills on {format(selectedDate, 'MMM dd, yyyy')}
                <Badge variant="secondary">{dailyInvoices.length}</Badge>
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dailyInvoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No bills on this date</p>
                ) : (
                  dailyInvoices.map((invoice) => {
                    const items = invoice.items_data as any[];
                    const invoiceProfit = items.reduce((sum, item: any) => {
                      const product = products.find(p => p.id === item.id);
                      if (product && product.buying_price) {
                        return sum + (item.price - product.buying_price) * item.quantity;
                      }
                      return sum;
                    }, 0);

                    const hasDiscount = invoice.discount_amount && parseFloat(invoice.discount_amount.toString()) > 0;

                    return (
                      <div key={invoice.id} className="p-3 bg-muted/30 rounded-lg flex flex-col sm:flex-row justify-between gap-2 sm:items-center hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-sm">{invoice.bill_number}</p>
                            {hasDiscount && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-900/30">
                                Discount
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {invoice.customer_name || 'Walk-in'} • {format(new Date(invoice.created_at), 'hh:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="font-bold">₹{parseFloat(invoice.total_amount.toString()).toFixed(2)}</p>
                            <p className="text-xs text-green-600">+₹{invoiceProfit.toFixed(2)} profit</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
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
