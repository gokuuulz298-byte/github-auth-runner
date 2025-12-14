import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Package, Users, Calendar, BarChart3, Target, Award, Activity, ShoppingBag, Percent, Clock } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
  salesCount: number;
}

interface CustomerStats {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const AdvancedReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [selectedCounter, setSelectedCounter] = useState<string>("all");
  const [counters, setCounters] = useState<any[]>([]);
  
  // Key Metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    averageSale: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalCustomers: 0,
    repeatCustomerRate: 0,
    topProductRevenue: 0,
    growthRate: 0,
  });

  // Charts Data
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerStats[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);

  useEffect(() => {
    fetchCounters();
  }, []);

  useEffect(() => {
    fetchAdvancedData();

    // Set up real-time subscription for invoices
    const channel = supabase
      .channel('advanced-reports-invoices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        () => {
          // Refresh data when invoices change
          fetchAdvancedData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange, selectedCounter]);

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

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (timeRange) {
      case "7d":
        start = startOfDay(subDays(now, 6));
        break;
      case "30d":
        start = startOfDay(subDays(now, 29));
        break;
      case "90d":
        start = startOfDay(subDays(now, 89));
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "all":
        start = new Date(0); // Beginning of time
        break;
      default:
        start = startOfDay(subDays(now, 6));
    }

    return { start, end };
  };

  const fetchAdvancedData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getDateRange();

      // Fetch invoices
      let invoiceQuery = supabase
        .from('invoices')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (selectedCounter !== "all") {
        invoiceQuery = invoiceQuery.eq('counter_id', selectedCounter);
      }

      const { data: invoices } = await invoiceQuery;

      // Fetch products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id);

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('created_by', user.id);

      if (!invoices || !products || !customers) return;

      // Calculate Key Metrics
      const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
      const totalOrders = invoices.length;
      const averageSale = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      let totalProfit = 0;
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product && product.buying_price) {
            totalProfit += (item.price - product.buying_price) * item.quantity;
          }
        });
      });

      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Calculate growth rate (compare with previous period)
      const previousStart = new Date(start);
      const previousEnd = new Date(start);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      previousStart.setTime(start.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
      previousEnd.setTime(start.getTime() - (24 * 60 * 60 * 1000));

      const { data: previousInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('created_by', user.id)
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

      const previousRevenue = previousInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0) || 0;
      const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Top Products Analysis
      const productMap = new Map<string, { quantity: number; revenue: number; profit: number; salesCount: number; name: string }>();
      
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const existing = productMap.get(item.id) || { quantity: 0, revenue: 0, profit: 0, salesCount: 0, name: product.name };
            existing.quantity += item.quantity;
            existing.revenue += item.price * item.quantity;
            existing.salesCount += 1;
            if (product.buying_price) {
              existing.profit += (item.price - product.buying_price) * item.quantity;
            }
            productMap.set(item.id, existing);
          }
        });
      });

      const topProductsList: TopProduct[] = Array.from(productMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          quantity: data.quantity,
          revenue: data.revenue,
          profit: data.profit,
          salesCount: data.salesCount,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Top Customers Analysis
      const customerMap = new Map<string, { totalSpent: number; orderCount: number; name: string; phone: string }>();
      
      invoices.forEach(invoice => {
        if (invoice.customer_id || invoice.customer_phone) {
          const customerId = invoice.customer_id || invoice.customer_phone;
          const existing = customerMap.get(customerId) || { 
            totalSpent: 0, 
            orderCount: 0, 
            name: invoice.customer_name || 'Unknown',
            phone: invoice.customer_phone || ''
          };
          existing.totalSpent += parseFloat(invoice.total_amount.toString());
          existing.orderCount += 1;
          customerMap.set(customerId, existing);
        }
      });

      const topCustomersList: CustomerStats[] = Array.from(customerMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          phone: data.phone,
          totalSpent: data.totalSpent,
          orderCount: data.orderCount,
          avgOrderValue: data.orderCount > 0 ? data.totalSpent / data.orderCount : 0,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Revenue Trend (Daily)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const trendData = Array.from({ length: days }, (_, i) => {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        return {
          date: format(date, 'MMM dd'),
          revenue: 0,
          orders: 0,
          profit: 0,
        };
      });

      invoices.forEach(invoice => {
        const invoiceDate = new Date(invoice.created_at);
        const dayIndex = Math.floor((invoiceDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < days) {
          trendData[dayIndex].revenue += parseFloat(invoice.total_amount.toString());
          trendData[dayIndex].orders += 1;
          
          const items = invoice.items_data as any[];
          items.forEach((item: any) => {
            const product = products.find(p => p.id === item.id);
            if (product && product.buying_price) {
              trendData[dayIndex].profit += (item.price - product.buying_price) * item.quantity;
            }
          });
        }
      });

      // Category Revenue
      const categoryMap = new Map<string, number>();
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product && product.category) {
            const existing = categoryMap.get(product.category) || 0;
            categoryMap.set(product.category, existing + (item.price * item.quantity));
          }
        });
      });

      const categoryData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Hourly Sales Pattern
      const hourlyMap = new Map<number, { revenue: number; orders: number }>();
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { revenue: 0, orders: 0 });
      }

      invoices.forEach(invoice => {
        const hour = new Date(invoice.created_at).getHours();
        const existing = hourlyMap.get(hour) || { revenue: 0, orders: 0 };
        existing.revenue += parseFloat(invoice.total_amount.toString());
        existing.orders += 1;
        hourlyMap.set(hour, existing);
      });

      const hourlyData = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({
          hour: `${hour}:00`,
          revenue: data.revenue,
          orders: data.orders,
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

      // Repeat Customer Rate
      const uniqueCustomers = new Set(invoices.filter(inv => inv.customer_id || inv.customer_phone).map(inv => inv.customer_id || inv.customer_phone));
      const repeatCustomers = Array.from(uniqueCustomers).filter(customerId => {
        const customerInvoices = invoices.filter(inv => (inv.customer_id || inv.customer_phone) === customerId);
        return customerInvoices.length > 1;
      }).length;
      const repeatCustomerRate = uniqueCustomers.size > 0 ? (repeatCustomers / uniqueCustomers.size) * 100 : 0;

      // Product Performance (Revenue vs Profit)
      const performanceData = topProductsList.slice(0, 8).map(product => ({
        name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
        revenue: product.revenue,
        profit: product.profit,
      }));

      setMetrics({
        totalRevenue,
        averageSale,
        totalOrders,
        averageOrderValue: averageSale,
        totalProfit,
        profitMargin,
        totalCustomers: uniqueCustomers.size,
        repeatCustomerRate,
        topProductRevenue: topProductsList[0]?.revenue || 0,
        growthRate,
      });

      setTopProducts(topProductsList);
      setTopCustomers(topCustomersList);
      setRevenueTrend(trendData);
      setCategoryRevenue(categoryData);
      setHourlySales(hourlyData);
      setProductPerformance(performanceData);
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching advanced reports");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
          <h1 className="text-xl sm:text-2xl font-bold">Advanced Reports</h1>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Filters */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Counter</label>
                <Select value={selectedCounter} onValueChange={setSelectedCounter}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="flex items-end">
                <Button onClick={fetchAdvancedData} className="w-full">
                  <Activity className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₹{metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.growthRate >= 0 ? (
                  <span className="text-green-600">↑ {metrics.growthRate.toFixed(1)}% growth</span>
                ) : (
                  <span className="text-red-600">↓ {Math.abs(metrics.growthRate).toFixed(1)}% decline</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
              <Target className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{metrics.averageSale.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.totalOrders} total orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">₹{metrics.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <Percent className="inline h-3 w-3 mr-1" />
                {metrics.profitMargin.toFixed(1)}% margin
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
              <Users className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.repeatCustomerRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.totalCustomers} unique customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue (₹)" />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit (₹)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Revenue Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryRevenue}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryRevenue.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hourly Sales Pattern</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourlySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" name="Revenue (₹)" />
                      <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (₹)" />
                      <Bar dataKey="profit" fill="#10b981" name="Profit (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Selling Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.quantity.toFixed(2)} units • {product.salesCount} sales
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{product.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        <p className="text-sm text-blue-600">Profit: ₹{product.profit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No product data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{customer.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.phone} • {customer.orderCount} orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{customer.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        <p className="text-sm text-muted-foreground">Avg: ₹{customer.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                  {topCustomers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No customer data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Business Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm font-medium mb-2">Revenue Performance</p>
                    <p className="text-2xl font-bold text-blue-600">₹{metrics.totalRevenue.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics.growthRate >= 0 ? '↑' : '↓'} {Math.abs(metrics.growthRate).toFixed(1)}% vs previous period
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-sm font-medium mb-2">Profitability</p>
                    <p className="text-2xl font-bold text-green-600">{metrics.profitMargin.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Profit margin on total revenue</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <p className="text-sm font-medium mb-2">Customer Loyalty</p>
                    <p className="text-2xl font-bold text-purple-600">{metrics.repeatCustomerRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Repeat customer rate</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Key Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Total Orders</span>
                    <span className="font-bold">{metrics.totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Average Order Value</span>
                    <span className="font-bold">₹{metrics.averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Unique Customers</span>
                    <span className="font-bold">{metrics.totalCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Top Product Revenue</span>
                    <span className="font-bold text-green-600">₹{metrics.topProductRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdvancedReports;

