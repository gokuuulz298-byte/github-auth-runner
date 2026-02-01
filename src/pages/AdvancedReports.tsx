import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Package, Users, Calendar, BarChart3, Award, Activity, ShoppingBag, Percent, Clock, CreditCard, Wallet, Layers, UtensilsCrossed, PackageCheck, ArrowUpRight, ArrowDownRight, Sparkles, Flame, Info, ChevronDown, ChevronUp, Filter, Truck, Receipt, CalendarDays, PieChartIcon, LineChartIcon, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/common";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatIndianCurrency } from "@/lib/numberFormat";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import CompanyBadge from "@/components/CompanyBadge";

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

interface PaymentModeStats {
  mode: string;
  count: number;
  revenue: number;
}

interface OrderTypeStats {
  type: string;
  count: number;
  revenue: number;
}

interface DayWiseData {
  date: Date;
  revenue: number;
  expenses: number;
  purchases: number;
  profit: number;
  netProfit: number;
  orderCount: number;
  invoices: any[];
  expenseList: any[];
}

// Zoho-style color palette
const ZOHO_COLORS = ['#1E88E5', '#43A047', '#FB8C00', '#E53935', '#8E24AA', '#00ACC1', '#5C6BC0', '#7CB342'];

// Format number to 2 decimal places
const formatDecimal = (num: number): string => {
  return num.toFixed(2);
};

const AdvancedReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [selectedCounter, setSelectedCounter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [counters, setCounters] = useState<any[]>([]);
  const [isRestaurant, setIsRestaurant] = useState(false);
  
  // Day Wise state
  const [dayWiseDate, setDayWiseDate] = useState<Date>(new Date());
  const [dayWiseData, setDayWiseData] = useState<DayWiseData | null>(null);
  const [dayWiseLoading, setDayWiseLoading] = useState(false);
  
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
    totalTax: 0,
    averageItemsPerOrder: 0,
    peakHour: '',
    peakDay: '',
    totalExpenses: 0,
    totalPurchases: 0,
    netProfit: 0,
    purchaseCount: 0,
    pendingPurchases: 0,
    receivedPurchases: 0,
  });

  // Charts Data
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerStats[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [paymentModeStats, setPaymentModeStats] = useState<PaymentModeStats[]>([]);
  const [orderTypeStats, setOrderTypeStats] = useState<OrderTypeStats[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [purchasesTrend, setPurchasesTrend] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchCounters();
    fetchBillingSettings();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchAdvancedData();

    const channel = supabase
      .channel('advanced-reports-invoices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => fetchAdvancedData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [timeRange, selectedCounter]);

  useEffect(() => {
    if (products.length > 0) {
      fetchDayWiseData();
    }
  }, [dayWiseDate, products]);

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('products').select('*').eq('created_by', user.id);
    setProducts(data || []);
  };

  const fetchDayWiseData = async () => {
    setDayWiseLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = startOfDay(dayWiseDate);
      const end = endOfDay(dayWiseDate);

      const [invoicesRes, expensesRes, purchasesRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('created_by', user.id)
          .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('expenses').select('*').eq('created_by', user.id)
          .gte('expense_date', start.toISOString()).lte('expense_date', end.toISOString()),
        supabase.from('purchases').select('*').eq('created_by', user.id)
          .gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
      ]);

      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const purchases = purchasesRes.data || [];

      const revenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount?.toString() || '0'), 0);
      const expenseTotal = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount?.toString() || '0'), 0);
      const purchaseTotal = purchases.reduce((sum, p) => sum + parseFloat(p.paid_amount?.toString() || '0'), 0);

      let profit = 0;
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        items?.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product && product.buying_price) {
            const taxRate = item.tax_rate || product.tax_rate || 0;
            const isInclusive = item.is_inclusive !== false;
            const baseSellingPrice = isInclusive && taxRate > 0 
              ? item.price / (1 + taxRate / 100)
              : item.price;
            profit += (baseSellingPrice - product.buying_price) * item.quantity;
          }
        });
      });

      const netProfit = profit - expenseTotal;

      setDayWiseData({
        date: dayWiseDate,
        revenue,
        expenses: expenseTotal,
        purchases: purchaseTotal,
        profit,
        netProfit,
        orderCount: invoices.length || 0,
        invoices,
        expenseList: expenses
      });
    } catch (error) {
      console.error(error);
    } finally {
      setDayWiseLoading(false);
    }
  };

  const fetchBillingSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('company_profiles')
        .select('billing_settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.billing_settings) {
        setIsRestaurant((data.billing_settings as any)?.isRestaurant || false);
      }
    } catch (error) {
      console.error(error);
    }
  };

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
      case "today": start = startOfDay(now); break;
      case "7d": start = startOfDay(subDays(now, 6)); break;
      case "30d": start = startOfDay(subDays(now, 29)); break;
      case "90d": start = startOfDay(subDays(now, 89)); break;
      case "month": start = startOfMonth(now); end = endOfMonth(now); break;
      case "week": start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); break;
      case "all": start = new Date(0); break;
      default: start = startOfDay(subDays(now, 6));
    }

    return { start, end };
  };

  const fetchAdvancedData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getDateRange();

      // Parallel fetch all data
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

      const [invoicesRes, productsRes, customersRes, expensesRes, purchasesRes] = await Promise.all([
        invoiceQuery,
        supabase.from('products').select('*').eq('created_by', user.id),
        supabase.from('customers').select('*').eq('created_by', user.id),
        supabase.from('expenses').select('*').eq('created_by', user.id)
          .gte('expense_date', start.toISOString()).lte('expense_date', end.toISOString()),
        supabase.from('purchases').select('*').eq('created_by', user.id)
          .gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
      ]);

      const invoices = invoicesRes.data || [];
      const products = productsRes.data || [];
      const customers = customersRes.data || [];
      const expenses = expensesRes.data || [];
      const purchases = purchasesRes.data || [];

      if (!invoices || !products || !customers) return;

      // Calculate metrics
      const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
      const totalOrders = invoices.length;
      const averageSale = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalTax = invoices.reduce((sum, inv) => sum + parseFloat(inv.tax_amount?.toString() || '0'), 0);

      const totalItems = invoices.reduce((sum, inv) => {
        const items = inv.items_data as any[];
        return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
      }, 0);
      const averageItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;

      let grossProfit = 0;
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product && product.buying_price) {
            const taxRate = item.tax_rate || product.tax_rate || 0;
            const isInclusive = item.is_inclusive !== false;
            const baseSellingPrice = isInclusive && taxRate > 0 
              ? item.price / (1 + taxRate / 100)
              : item.price;
            grossProfit += (baseSellingPrice - product.buying_price) * item.quantity;
          }
        });
      });

      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Growth rate
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

      // Payment Mode Analysis
      const paymentModeMap = new Map<string, { count: number; revenue: number }>();
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        const paymentMode = (items[0] as any)?.paymentMode || 'cash';
        const existing = paymentModeMap.get(paymentMode) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += parseFloat(invoice.total_amount.toString());
        paymentModeMap.set(paymentMode, existing);
      });

      const paymentStats: PaymentModeStats[] = Array.from(paymentModeMap.entries())
        .map(([mode, data]) => ({ mode: mode.charAt(0).toUpperCase() + mode.slice(1), count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // Order Type Analysis
      const orderTypeMap = new Map<string, { count: number; revenue: number }>();
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        const isParcel = (items[0] as any)?.isParcel || false;
        const orderType = isParcel ? 'Takeaway' : 'Dine-in';
        const existing = orderTypeMap.get(orderType) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += parseFloat(invoice.total_amount.toString());
        orderTypeMap.set(orderType, existing);
      });

      const orderStats: OrderTypeStats[] = Array.from(orderTypeMap.entries())
        .map(([type, data]) => ({ type, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // Top Products
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
              const taxRate = item.tax_rate || product.tax_rate || 0;
              const isInclusive = item.is_inclusive !== false;
              const baseSellingPrice = isInclusive && taxRate > 0 
                ? item.price / (1 + taxRate / 100)
                : item.price;
              existing.profit += (baseSellingPrice - product.buying_price) * item.quantity;
            }
            productMap.set(item.id, existing);
          }
        });
      });

      const topProds: TopProduct[] = Array.from(productMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Customer Stats
      const customerMap = new Map<string, { name: string; phone: string; totalSpent: number; orderCount: number }>();
      invoices.forEach(invoice => {
        const phone = invoice.customer_phone || 'unknown';
        const existing = customerMap.get(phone) || { 
          name: invoice.customer_name || 'Walk-in', 
          phone, 
          totalSpent: 0, 
          orderCount: 0 
        };
        existing.totalSpent += parseFloat(invoice.total_amount.toString());
        existing.orderCount += 1;
        customerMap.set(phone, existing);
      });

      const topCusts: CustomerStats[] = Array.from(customerMap.entries())
        .filter(([phone]) => phone !== 'unknown')
        .map(([phone, data]) => ({ 
          id: phone, 
          ...data, 
          avgOrderValue: data.orderCount > 0 ? data.totalSpent / data.orderCount : 0 
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Revenue Trend
      const dailyMap = new Map<string, { revenue: number; profit: number; orders: number }>();
      invoices.forEach(invoice => {
        const date = format(new Date(invoice.created_at), 'dd MMM');
        const existing = dailyMap.get(date) || { revenue: 0, profit: 0, orders: 0 };
        existing.revenue += parseFloat(invoice.total_amount.toString());
        existing.orders += 1;
        
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product?.buying_price) {
            const taxRate = item.tax_rate || product.tax_rate || 0;
            const isInclusive = item.is_inclusive !== false;
            const baseSellingPrice = isInclusive && taxRate > 0 
              ? item.price / (1 + taxRate / 100)
              : item.price;
            existing.profit += (baseSellingPrice - product.buying_price) * item.quantity;
          }
        });
        
        dailyMap.set(date, existing);
      });

      const revTrend = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }));

      // Category Revenue
      const categoryMap = new Map<string, number>();
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          const category = product?.category || 'Uncategorized';
          const existing = categoryMap.get(category) || 0;
          categoryMap.set(category, existing + (item.price * item.quantity));
        });
      });

      const catRev = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Limit to 8 for cleaner visuals

      // Hourly Sales
      const hourlyMap = new Map<number, { revenue: number; orders: number }>();
      invoices.forEach(invoice => {
        const hour = new Date(invoice.created_at).getHours();
        const existing = hourlyMap.get(hour) || { revenue: 0, orders: 0 };
        existing.revenue += parseFloat(invoice.total_amount.toString());
        existing.orders += 1;
        hourlyMap.set(hour, existing);
      });

      const hourly = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        revenue: hourlyMap.get(i)?.revenue || 0,
        orders: hourlyMap.get(i)?.orders || 0,
      }));

      // Peak analysis
      let peakHourData = { hour: '', orders: 0 };
      hourlyMap.forEach((data, hour) => {
        if (data.orders > peakHourData.orders) {
          peakHourData = { hour: `${hour.toString().padStart(2, '0')}:00`, orders: data.orders };
        }
      });

      // Daily sales by day of week
      const dayOfWeekMap = new Map<string, { revenue: number; orders: number }>();
      invoices.forEach(invoice => {
        const day = format(new Date(invoice.created_at), 'EEE');
        const existing = dayOfWeekMap.get(day) || { revenue: 0, orders: 0 };
        existing.revenue += parseFloat(invoice.total_amount.toString());
        existing.orders += 1;
        dayOfWeekMap.set(day, existing);
      });

      const dailyS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        revenue: dayOfWeekMap.get(day)?.revenue || 0,
        orders: dayOfWeekMap.get(day)?.orders || 0,
      }));

      let peakDayData = { day: '', orders: 0 };
      dayOfWeekMap.forEach((data, day) => {
        if (data.orders > peakDayData.orders) {
          peakDayData = { day, orders: data.orders };
        }
      });

      // Expenses by category
      const expCategoryMap = new Map<string, number>();
      expenses.forEach(exp => {
        const category = exp.category || 'Other';
        const existing = expCategoryMap.get(category) || 0;
        expCategoryMap.set(category, existing + parseFloat(exp.amount.toString()));
      });

      const expByCat = Array.from(expCategoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Purchases stats
      const totalExpenseAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      const totalPurchaseAmount = purchases.reduce((sum, p) => sum + parseFloat(p.total_amount?.toString() || '0'), 0);
      const pendingCount = purchases.filter(p => p.status === 'pending' || p.status === 'ordered').length;
      const receivedCount = purchases.filter(p => p.status === 'received').length;

      // Repeat customers
      const repeatCustomers = Array.from(customerMap.values()).filter(c => c.orderCount > 1).length;
      const uniqueCustomers = customerMap.size;
      const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

      // Product performance for charts
      const prodPerf = topProds.slice(0, 6).map(p => ({ name: p.name.substring(0, 15), revenue: p.revenue, profit: p.profit }));

      setMetrics({
        totalRevenue,
        averageSale,
        totalOrders,
        averageOrderValue: averageSale,
        totalProfit: grossProfit,
        profitMargin,
        totalCustomers: uniqueCustomers,
        repeatCustomerRate: repeatRate,
        topProductRevenue: topProds[0]?.revenue || 0,
        growthRate,
        totalTax,
        averageItemsPerOrder,
        peakHour: peakHourData.hour || '-',
        peakDay: peakDayData.day || '-',
        totalExpenses: totalExpenseAmount,
        totalPurchases: totalPurchaseAmount,
        netProfit: grossProfit - totalExpenseAmount,
        purchaseCount: purchases.length,
        pendingPurchases: pendingCount,
        receivedPurchases: receivedCount,
      });

      setTopProducts(topProds);
      setTopCustomers(topCusts);
      setRevenueTrend(revTrend);
      setCategoryRevenue(catRev);
      setHourlySales(hourly);
      setProductPerformance(prodPerf);
      setPaymentModeStats(paymentStats);
      setOrderTypeStats(orderStats);
      setDailySales(dailyS);
      setExpensesByCategory(expByCat);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader pageName="Advanced Reports" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Zoho-style Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Advanced Reports</h1>
          </div>
          <CompanyBadge />
          <div className="ml-auto flex items-center gap-3">
            <OnlineStatusIndicator />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Zoho-style Filters */}
        <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-200">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
              
              {counters.length > 0 && (
                <Select value={selectedCounter} onValueChange={setSelectedCounter}>
                  <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Counters</SelectItem>
                    {counters.map((counter) => (
                      <SelectItem key={counter.id} value={counter.id}>{counter.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Button onClick={fetchAdvancedData} variant="outline" size="sm" className="ml-auto">
                <Activity className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zoho-style KPI Grid - Single row of 4 main metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Revenue Card */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-100 uppercase tracking-wide font-medium">Revenue</p>
                  <p className="text-2xl font-bold mt-1">{formatIndianCurrency(metrics.totalRevenue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {metrics.growthRate >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-300" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-300" />
                    )}
                    <span className="text-xs text-blue-100">
                      {Math.abs(metrics.growthRate).toFixed(1)}% vs prev period
                    </span>
                  </div>
                </div>
                <DollarSign className="h-10 w-10 text-blue-200/50" />
              </div>
            </CardContent>
          </Card>

          {/* Gross Profit Card */}
          <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-100 uppercase tracking-wide font-medium">Gross Profit</p>
                  <p className="text-2xl font-bold mt-1">{formatIndianCurrency(metrics.totalProfit)}</p>
                  <p className="text-xs text-emerald-100 mt-1">{metrics.profitMargin.toFixed(1)}% margin</p>
                </div>
                <TrendingUp className="h-10 w-10 text-emerald-200/50" />
              </div>
            </CardContent>
          </Card>

          {/* Orders Card */}
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-violet-100 uppercase tracking-wide font-medium">Orders</p>
                  <p className="text-2xl font-bold mt-1">{metrics.totalOrders}</p>
                  <p className="text-xs text-violet-100 mt-1">Avg: {formatIndianCurrency(metrics.averageSale)}</p>
                </div>
                <ShoppingBag className="h-10 w-10 text-violet-200/50" />
              </div>
            </CardContent>
          </Card>

          {/* Net Profit Card */}
          <Card className={`bg-gradient-to-br ${metrics.netProfit >= 0 ? 'from-teal-500 to-cyan-600' : 'from-red-500 to-rose-600'} text-white border-0 shadow-lg`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide font-medium">Net Profit</p>
                  <p className="text-2xl font-bold mt-1">{formatIndianCurrency(metrics.netProfit)}</p>
                  <p className="text-xs text-white/80 mt-1">After ₹{metrics.totalExpenses.toLocaleString('en-IN')} expenses</p>
                </div>
                {metrics.netProfit >= 0 ? (
                  <TrendingUp className="h-10 w-10 text-white/30" />
                ) : (
                  <TrendingDown className="h-10 w-10 text-white/30" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Percent className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tax Collected</p>
                  <p className="text-lg font-semibold">{formatIndianCurrency(metrics.totalTax)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Receipt className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-semibold">{formatIndianCurrency(metrics.totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <Truck className="h-4 w-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Purchases (Rcvd)</p>
                  <p className="text-lg font-semibold">{metrics.receivedPurchases}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Repeat Rate</p>
                  <p className="text-lg font-semibold">{metrics.repeatCustomerRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex w-auto min-w-full gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm">Products</TabsTrigger>
              <TabsTrigger value="profit" className="text-xs sm:text-sm">Profit</TabsTrigger>
              <TabsTrigger value="customers" className="text-xs sm:text-sm">Customers</TabsTrigger>
              <TabsTrigger value="daywise" className="text-xs sm:text-sm flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Day Wise
              </TabsTrigger>
              <TabsTrigger value="gst" className="text-xs sm:text-sm">GST</TabsTrigger>
              <TabsTrigger value="margin" className="text-xs sm:text-sm">Margins</TabsTrigger>
              {isRestaurant && <TabsTrigger value="restaurant" className="text-xs sm:text-sm">Restaurant</TabsTrigger>}
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" fontSize={11} stroke="#64748b" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} stroke="#64748b" />
                      <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                      <Area type="monotone" dataKey="revenue" stroke="#1E88E5" fill="#1E88E5" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Category Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryRevenue}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        paddingAngle={2}
                        label={({ name, percent }) => percent > 0.05 ? `${name.substring(0, 8)}` : ''}
                        labelLine={false}
                      >
                        {categoryRevenue.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={ZOHO_COLORS[index % ZOHO_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Hourly Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={hourlySales.filter(h => h.orders > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hour" fontSize={10} stroke="#64748b" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} stroke="#64748b" />
                      <Tooltip formatter={(value: number, name) => name === 'revenue' ? formatIndianCurrency(value) : value} />
                      <Bar dataKey="revenue" fill="#43A047" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Weekly Pattern</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" fontSize={11} stroke="#64748b" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} stroke="#64748b" />
                      <Tooltip formatter={(value: number, name) => name === 'revenue' ? formatIndianCurrency(value) : value} />
                      <Bar dataKey="revenue" fill="#5C6BC0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {topProducts.slice(0, 8).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.quantity.toFixed(0)} units</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-green-600">{formatIndianCurrency(product.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                      <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="revenue" name="Revenue" fill="#1E88E5" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="profit" name="Profit" fill="#43A047" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profit Tab */}
          <TabsContent value="profit" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Gross Profit</p>
                  <p className="text-xl font-bold text-green-600">{formatIndianCurrency(metrics.totalProfit)}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Profit Margin</p>
                  <p className="text-xl font-bold text-blue-600">{metrics.profitMargin.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Avg Profit/Order</p>
                  <p className="text-xl font-bold text-purple-600">{formatIndianCurrency(metrics.totalOrders > 0 ? metrics.totalProfit / metrics.totalOrders : 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className={`text-xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatIndianCurrency(metrics.netProfit)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Top Profitable Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {topProducts
                    .sort((a, b) => b.profit - a.profit)
                    .slice(0, 8)
                    .map((product, index) => {
                      const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                      return (
                        <div key={product.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <p className="text-sm font-medium">{product.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">{formatIndianCurrency(product.profit)}</p>
                            <p className="text-xs text-muted-foreground">{margin.toFixed(1)}% margin</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Top Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{customer.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone} • {customer.orderCount} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatIndianCurrency(customer.totalSpent)}</p>
                        <p className="text-xs text-muted-foreground">Avg: {formatIndianCurrency(customer.avgOrderValue)}</p>
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

          {/* Day Wise Tab */}
          <TabsContent value="daywise" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Daily Insights
                  </CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(dayWiseDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={dayWiseDate}
                        onSelect={(date) => date && setDayWiseDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {dayWiseLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : dayWiseData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-lg font-bold text-green-600">{formatIndianCurrency(dayWiseData.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{dayWiseData.orderCount} orders</p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="text-lg font-bold text-red-600">{formatIndianCurrency(dayWiseData.expenses)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-cyan-500 bg-cyan-50 dark:bg-cyan-950/20">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Purchases</p>
                          <p className="text-lg font-bold text-cyan-600">{formatIndianCurrency(dayWiseData.purchases)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Gross Profit</p>
                          <p className="text-lg font-bold text-emerald-600">{formatIndianCurrency(dayWiseData.profit)}</p>
                        </CardContent>
                      </Card>
                      <Card className={`border-l-4 ${dayWiseData.netProfit >= 0 ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-l-red-500 bg-red-50 dark:bg-red-950/20'}`}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Net Profit</p>
                          <p className={`text-lg font-bold ${dayWiseData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatIndianCurrency(dayWiseData.netProfit)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Select a date to view insights</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GST Tab */}
          <TabsContent value="gst" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Tax Collected</p>
                  <p className="text-2xl font-bold text-orange-600">{formatIndianCurrency(metrics.totalTax)}</p>
                </CardContent>
              </Card>
              <Card className="border border-slate-200">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">CGST (Est.)</p>
                  <p className="text-xl font-semibold">{formatIndianCurrency(metrics.totalTax / 2)}</p>
                </CardContent>
              </Card>
              <Card className="border border-slate-200">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">SGST (Est.)</p>
                  <p className="text-xl font-semibold">{formatIndianCurrency(metrics.totalTax / 2)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Margin Tab */}
          <TabsContent value="margin" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Margin Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Overall Margin</p>
                    <p className="text-3xl font-bold text-green-600">{formatDecimal(metrics.profitMargin)}%</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Revenue:Profit Ratio</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {metrics.totalProfit > 0 ? (metrics.totalRevenue / metrics.totalProfit).toFixed(1) : '0'}:1
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={productPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} />
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#1E88E5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#43A047" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restaurant Tab */}
          {isRestaurant && (
            <TabsContent value="restaurant" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4" />
                      Order Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={orderTypeStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="count"
                          nameKey="type"
                          label={({ type, count }) => `${type}: ${count}`}
                          labelLine={false}
                        >
                          {orderTypeStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.type === 'Takeaway' ? '#FB8C00' : '#1E88E5'} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">Order Type Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orderTypeStats.map((stat) => (
                        <div key={stat.type} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            {stat.type === 'Takeaway' ? (
                              <PackageCheck className="h-6 w-6 text-orange-500" />
                            ) : (
                              <UtensilsCrossed className="h-6 w-6 text-blue-500" />
                            )}
                            <div>
                              <p className="font-medium">{stat.type}</p>
                              <p className="text-xs text-muted-foreground">{stat.count} orders</p>
                            </div>
                          </div>
                          <p className="font-semibold text-green-600">{formatIndianCurrency(stat.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default AdvancedReports;
