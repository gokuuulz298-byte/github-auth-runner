import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Package, Users, Calendar, BarChart3, Target, Award, Activity, ShoppingBag, Percent, Clock, CreditCard, Wallet, Smartphone, Layers, UtensilsCrossed, PackageCheck, ArrowUpRight, ArrowDownRight, Sparkles, Flame, Info, ChevronDown, ChevronUp, Filter, Truck, Receipt, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatIndianCurrency } from "@/lib/numberFormat";

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

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
    // New metrics for expenses and purchases
    totalExpenses: 0,
    totalPurchases: 0,
    netProfit: 0,
    purchaseCount: 0,
    pendingPurchases: 0,
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

  useEffect(() => {
    fetchDayWiseData();
  }, [dayWiseDate]);

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

      // Fetch invoices for the day
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch expenses for the day
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user.id)
        .gte('expense_date', start.toISOString())
        .lte('expense_date', end.toISOString());

      // Fetch purchases for the day
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const revenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount?.toString() || '0'), 0) || 0;
      const expenseTotal = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount?.toString() || '0'), 0) || 0;
      // Use paid_amount for PO spend (actual cash outflow)
      const purchaseTotal = purchases?.reduce((sum, p) => sum + parseFloat(p.paid_amount?.toString() || '0'), 0) || 0;

      // Calculate gross profit using correct formula:
      // Gross Profit = (Base Selling Price - Buying Price) × Quantity
      // Base Selling Price = item.price for exclusive, or item.price / (1 + tax%) for inclusive
      let profit = 0;
      invoices?.forEach(invoice => {
        const items = invoice.items_data as any[];
        items?.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product && product.buying_price) {
            const taxRate = item.tax_rate || product.tax_rate || 0;
            const isInclusive = item.is_inclusive !== false; // default to inclusive
            // For inclusive pricing, extract base price; for exclusive, use as-is
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
        orderCount: invoices?.length || 0,
        invoices: invoices || [],
        expenseList: expenses || []
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
      case "today":
        start = startOfDay(now);
        break;
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
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "all":
        start = new Date(0);
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

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user.id)
        .gte('expense_date', start.toISOString())
        .lte('expense_date', end.toISOString());

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (!invoices || !products || !customers) return;

      // Calculate Key Metrics
      const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
      const totalOrders = invoices.length;
      const averageSale = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalTax = invoices.reduce((sum, inv) => sum + parseFloat(inv.tax_amount?.toString() || '0'), 0);

      // Average items per order
      const totalItems = invoices.reduce((sum, inv) => {
        const items = inv.items_data as any[];
        return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
      }, 0);
      const averageItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;

      // Calculate Gross Profit using correct formula:
      // Gross Profit = Sum of (Base Selling Price - Buying Price) × Quantity
      // Base Selling Price depends on billing mode stored in item
      let grossProfit = 0;
      invoices.forEach(invoice => {
        const items = invoice.items_data as any[];
        items.forEach((item: any) => {
          const product = products.find(p => p.id === item.id);
          if (product && product.buying_price) {
            const taxRate = item.tax_rate || product.tax_rate || 0;
            const isInclusive = item.is_inclusive !== false; // default to inclusive
            // For inclusive pricing, extract base price; for exclusive, price is already base
            const baseSellingPrice = isInclusive && taxRate > 0 
              ? item.price / (1 + taxRate / 100)
              : item.price;
            grossProfit += (baseSellingPrice - product.buying_price) * item.quantity;
          }
        });
      });

      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

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
        .map(([mode, data]) => ({
          mode: mode.charAt(0).toUpperCase() + mode.slice(1),
          count: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Order Type Analysis (Dine-in vs Takeaway/Parcel)
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
        .map(([type, data]) => ({
          type,
          count: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue);

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

      // Find peak hour
      const peakHourData = hourlyData.reduce((max, curr) => curr.orders > max.orders ? curr : max, hourlyData[0]);
      const peakHour = peakHourData?.hour || 'N/A';

      // Daily sales by day of week
      const dayOfWeekMap = new Map<number, { revenue: number; orders: number }>();
      for (let i = 0; i < 7; i++) {
        dayOfWeekMap.set(i, { revenue: 0, orders: 0 });
      }

      invoices.forEach(invoice => {
        const day = new Date(invoice.created_at).getDay();
        const existing = dayOfWeekMap.get(day) || { revenue: 0, orders: 0 };
        existing.revenue += parseFloat(invoice.total_amount.toString());
        existing.orders += 1;
        dayOfWeekMap.set(day, existing);
      });

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailySalesData = Array.from(dayOfWeekMap.entries())
        .map(([day, data]) => ({
          day: dayNames[day],
          revenue: data.revenue,
          orders: data.orders,
        }));

      // Find peak day
      const peakDayData = dailySalesData.reduce((max, curr) => curr.orders > max.orders ? curr : max, dailySalesData[0]);
      const peakDay = peakDayData?.day || 'N/A';

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

      // Weekly comparison
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const lastWeekStart = subWeeks(thisWeekStart, 1);
      const lastWeekEnd = subDays(thisWeekStart, 1);

      const { data: thisWeekInvoices } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .eq('created_by', user.id)
        .gte('created_at', thisWeekStart.toISOString())
        .lte('created_at', new Date().toISOString());

      const { data: lastWeekInvoices } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .eq('created_by', user.id)
        .gte('created_at', lastWeekStart.toISOString())
        .lte('created_at', lastWeekEnd.toISOString());

      const weeklyComparisonData = [
        {
          name: 'Last Week',
          revenue: lastWeekInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0) || 0,
          orders: lastWeekInvoices?.length || 0,
        },
        {
          name: 'This Week',
          revenue: thisWeekInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0) || 0,
          orders: thisWeekInvoices?.length || 0,
        }
      ];

      // Expenses Analysis
      const totalExpenses = (expenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount?.toString() || '0'), 0);
      
      const expenseCategoryMap = new Map<string, number>();
      (expenses || []).forEach(exp => {
        const existing = expenseCategoryMap.get(exp.category) || 0;
        expenseCategoryMap.set(exp.category, existing + parseFloat(exp.amount?.toString() || '0'));
      });
      
      const expensesByCategoryData = Array.from(expenseCategoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Purchases Analysis - use paid_amount (actual cash outflow) not total_amount
      const totalPurchasesPaid = (purchases || []).reduce((sum, pur) => sum + parseFloat(pur.paid_amount?.toString() || '0'), 0);
      const purchaseCount = (purchases || []).length;
      const pendingPurchases = (purchases || []).filter(p => p.status === 'pending' || p.status === 'ordered').length;
      
      // Net Profit = Gross Profit - Expenses
      // (PO costs are already reflected in buying_price margin, so we don't subtract again)
      const netProfit = grossProfit - totalExpenses;

      setMetrics({
        totalRevenue,
        averageSale,
        totalPurchases: totalPurchasesPaid,
        totalOrders,
        averageOrderValue: averageSale,
        totalProfit: grossProfit,
        profitMargin,
        totalCustomers: uniqueCustomers.size,
        repeatCustomerRate,
        topProductRevenue: topProductsList[0]?.revenue || 0,
        growthRate,
        totalTax,
        averageItemsPerOrder,
        peakHour,
        peakDay,
        totalExpenses,
        netProfit,
        purchaseCount,
        pendingPurchases,
      });

      setTopProducts(topProductsList);
      setTopCustomers(topCustomersList);
      setRevenueTrend(trendData);
      setCategoryRevenue(categoryData);
      setHourlySales(hourlyData);
      setProductPerformance(performanceData);
      setPaymentModeStats(paymentStats);
      setOrderTypeStats(orderStats);
      setDailySales(dailySalesData);
      setWeeklyComparison(weeklyComparisonData);
      setExpensesByCategory(expensesByCategoryData);
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
        <LoadingSpinner size="lg" text="Loading reports..." />
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
        {/* Collapsible Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filters</span>
                <span className="text-xs text-muted-foreground">
                  ({timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : timeRange === '90d' ? 'Last 90 Days' : timeRange === 'month' ? 'This Month' : 'All Time'})
                </span>
              </div>
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
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
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
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
          </CollapsibleContent>
        </Collapsible>

        {/* Key Metrics Grid - Enhanced with info tooltips */}
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-100">Total Revenue</CardTitle>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-blue-200" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold">Revenue Formula:</p>
                      <p className="text-xs">Sum of all invoice totals (including tax)</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-200" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
                  {metrics.growthRate >= 0 ? (
                    <><ArrowUpRight className="h-3 w-3" /> {metrics.growthRate.toFixed(1)}% growth</>
                  ) : (
                    <><ArrowDownRight className="h-3 w-3" /> {Math.abs(metrics.growthRate).toFixed(1)}% decline</>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-xs sm:text-sm font-medium text-green-100">Gross Profit</CardTitle>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-green-200" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold">Profit Formula:</p>
                      <p className="text-xs">Σ (Selling Price - Buying Price) × Quantity</p>
                      <p className="text-xs mt-1">Margin = (Profit / Revenue) × 100</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-200" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">₹{metrics.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-green-200 mt-1 flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  {metrics.profitMargin.toFixed(1)}% margin
                </p>
              </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-purple-100">Avg. Order Value</CardTitle>
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">₹{metrics.averageSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-purple-200 mt-1">{metrics.totalOrders} orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-orange-100">Repeat Customers</CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{metrics.repeatCustomerRate.toFixed(1)}%</div>
              <p className="text-xs text-orange-200 mt-1">{metrics.totalCustomers} unique</p>
            </CardContent>
          </Card>
        </div>
        </TooltipProvider>

        {/* Additional Metrics Row - With Trend Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Tax</CardTitle>
              <Layers className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl font-bold">₹{metrics.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">GST collected</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Items/Order</CardTitle>
              <Package className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl font-bold">{metrics.averageItemsPerOrder.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">items per transaction</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Peak Hour</CardTitle>
              <Flame className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl font-bold flex items-center gap-1">
                {metrics.peakHour}
                <Sparkles className="h-3 w-3 text-amber-400" />
              </div>
              <p className="text-xs text-muted-foreground">busiest time</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Peak Day</CardTitle>
              <Calendar className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl font-bold flex items-center gap-1">
                {metrics.peakDay}
                <Sparkles className="h-3 w-3 text-amber-400" />
              </div>
              <p className="text-xs text-muted-foreground">busiest day</p>
            </CardContent>
          </Card>
        </div>

        {/* Expenses & Purchases Metrics */}
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-xs sm:text-sm font-medium text-red-100">Total Expenses</CardTitle>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-red-200" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold">Expenses Formula:</p>
                      <p className="text-xs">Sum of all expense entries in selected period</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-red-200" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">₹{metrics.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-red-200 mt-1">operational costs</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500 to-teal-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-xs sm:text-sm font-medium text-cyan-100">Total Purchases</CardTitle>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-cyan-200" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold">Purchases Formula:</p>
                      <p className="text-xs">Sum of all purchase order amounts</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-200" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">₹{metrics.totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-cyan-200 mt-1">{metrics.purchaseCount} orders ({metrics.pendingPurchases} pending)</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-600 to-green-700 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-xs sm:text-sm font-medium text-emerald-100">Net Profit</CardTitle>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-emerald-200" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold">Net Profit Formula:</p>
                      <p className="text-xs">Gross Profit − Total Expenses</p>
                      <p className="text-xs mt-1">= ₹{metrics.totalProfit.toFixed(0)} − ₹{metrics.totalExpenses.toFixed(0)}</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-200" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg sm:text-2xl font-bold ${metrics.netProfit < 0 ? 'text-red-200' : ''}`}>
                  ₹{metrics.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-emerald-200 mt-1">after expenses</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-violet-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Expense Ratio</CardTitle>
                <Wallet className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl font-bold">
                  {metrics.totalRevenue > 0 ? ((metrics.totalExpenses / metrics.totalRevenue) * 100).toFixed(1) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">of revenue</p>
              </CardContent>
            </Card>
          </div>
        </TooltipProvider>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="profit">Profit</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="daywise" className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Day Wise
            </TabsTrigger>
            {isRestaurant && <TabsTrigger value="restaurant">Restaurant</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                      <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Revenue (₹)" />
                      <Area type="monotone" dataKey="profit" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Profit (₹)" />
                    </AreaChart>
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
                      <YAxis tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                      <Tooltip formatter={(value: number, name: string) => name.includes('Revenue') ? `₹${value.toFixed(2)}` : value} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" name="Revenue (₹)" />
                      <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales by Day of Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                      <Tooltip formatter={(value: number, name: string) => name.includes('Revenue') ? `₹${value.toFixed(2)}` : value} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#6366f1" name="Revenue (₹)" />
                      <Bar dataKey="orders" fill="#f59e0b" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Weekly Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (₹)" />
                      <Bar dataKey="orders" fill="#10b981" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Performance (Revenue vs Profit)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={productPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                      <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (₹)" />
                      <Bar dataKey="profit" fill="#10b981" name="Profit (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.quantity.toFixed(2)} units • {product.salesCount} sales
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-sm">₹{product.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-blue-600">Profit: ₹{product.profit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    ))}
                    {topProducts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No product data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profit Analysis Tab - NEW */}
          <TabsContent value="profit" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Profit KPI Cards */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Profit Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Profit</p>
                      <p className="text-2xl font-bold text-green-600">₹{metrics.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Profit Margin</p>
                      <p className="text-2xl font-bold text-blue-600">{metrics.profitMargin.toFixed(1)}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/30 dark:to-violet-900/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Profit/Order</p>
                      <p className="text-2xl font-bold text-purple-600">₹{metrics.totalOrders > 0 ? (metrics.totalProfit / metrics.totalOrders).toFixed(0) : 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-900/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Revenue to Profit Ratio</p>
                      <p className="text-2xl font-bold text-amber-600">{metrics.totalRevenue > 0 ? (metrics.totalRevenue / metrics.totalProfit).toFixed(1) : 0}:1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Profitable Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Top Profitable Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {topProducts
                      .sort((a, b) => b.profit - a.profit)
                      .slice(0, 10)
                      .map((product, index) => {
                        const profitMargin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                        return (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                index < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.quantity.toFixed(0)} units sold
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600 text-sm">₹{product.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-blue-600">{profitMargin.toFixed(1)}% margin</p>
                            </div>
                          </div>
                        );
                      })}
                    {topProducts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No profit data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Profit vs Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Profit vs Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                      <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Revenue (₹)" />
                      <Area type="monotone" dataKey="profit" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Profit (₹)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Product Profit Breakdown Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Product-wise Profit Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">Product</th>
                          <th className="text-right p-2 font-semibold">Qty Sold</th>
                          <th className="text-right p-2 font-semibold">Revenue</th>
                          <th className="text-right p-2 font-semibold">Profit</th>
                          <th className="text-right p-2 font-semibold">Margin %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((product) => {
                          const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                          const marginColor = margin >= 20 ? 'text-green-600' : margin >= 10 ? 'text-amber-600' : 'text-red-600';
                          return (
                            <tr key={product.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{product.name}</td>
                              <td className="p-2 text-right">{product.quantity.toFixed(2)}</td>
                              <td className="p-2 text-right">₹{product.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                              <td className="p-2 text-right text-green-600 font-medium">₹{product.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                              <td className={`p-2 text-right font-bold ${marginColor}`}>{margin.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
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

          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Mode Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentModeStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ mode, count }) => `${mode}: ${count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="mode"
                      >
                        {paymentModeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Mode Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentModeStats.map((stat, index) => (
                      <div key={stat.mode} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <p className="font-semibold">{stat.mode}</p>
                            <p className="text-sm text-muted-foreground">{stat.count} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">₹{stat.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">
                            {metrics.totalRevenue > 0 ? ((stat.revenue / metrics.totalRevenue) * 100).toFixed(1) : 0}% of total
                          </p>
                        </div>
                      </div>
                    ))}
                    {paymentModeStats.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No payment data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Day Wise Tab */}
          <TabsContent value="daywise" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Day Wise Business Insights
                  </CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(dayWiseDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={dayWiseDate}
                        onSelect={(date) => date && setDayWiseDate(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {dayWiseLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" text="Loading..." />
                  </div>
                ) : dayWiseData ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Card className={`border-l-4 ${dayWiseData.revenue > 0 ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20' : 'border-l-gray-300'}`}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-lg font-bold text-green-600">{formatIndianCurrency(dayWiseData.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{dayWiseData.orderCount} orders</p>
                        </CardContent>
                      </Card>
                      <Card className={`border-l-4 ${dayWiseData.expenses > 0 ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' : 'border-l-gray-300'}`}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="text-lg font-bold text-red-600">{formatIndianCurrency(dayWiseData.expenses)}</p>
                        </CardContent>
                      </Card>
                      <Card className={`border-l-4 ${dayWiseData.purchases > 0 ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-l-gray-300'}`}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Purchases</p>
                          <p className="text-lg font-bold text-blue-600">{formatIndianCurrency(dayWiseData.purchases)}</p>
                        </CardContent>
                      </Card>
                      <Card className={`border-l-4 ${dayWiseData.profit > 0 ? 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-l-gray-300'}`}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Gross Profit</p>
                          <p className="text-lg font-bold text-emerald-600">{formatIndianCurrency(dayWiseData.profit)}</p>
                        </CardContent>
                      </Card>
                      <Card className={`border-l-4 ${dayWiseData.netProfit >= 0 ? 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20' : 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'}`}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">Net Profit</p>
                          <p className={`text-lg font-bold ${dayWiseData.netProfit >= 0 ? 'text-purple-600' : 'text-orange-600'}`}>
                            {formatIndianCurrency(dayWiseData.netProfit)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Invoices List */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Invoices ({dayWiseData.invoices.length})
                      </h4>
                      {dayWiseData.invoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No invoices on this day</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {dayWiseData.invoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                              <div>
                                <p className="font-mono text-sm">{inv.bill_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {inv.customer_name || 'Walk-in'} • {new Date(inv.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <p className="font-bold text-green-600">{formatIndianCurrency(inv.total_amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expenses List */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Expenses ({dayWiseData.expenseList.length})
                      </h4>
                      {dayWiseData.expenseList.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No expenses on this day</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {dayWiseData.expenseList.map((exp: any) => (
                            <div key={exp.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                              <div>
                                <p className="font-semibold text-sm">{exp.category}</p>
                                <p className="text-xs text-muted-foreground">{exp.description || 'No description'}</p>
                              </div>
                              <p className="font-bold text-red-600">-{formatIndianCurrency(exp.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Select a date to view insights</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-red-500" />
                    Expenses by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {expensesByCategory.map((exp, index) => (
                      <div key={exp.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{exp.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">₹{exp.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                          <p className="text-xs text-muted-foreground">
                            {metrics.totalExpenses > 0 ? ((exp.value / metrics.totalExpenses) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    ))}
                    {expensesByCategory.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No expense data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isRestaurant && (
            <TabsContent value="restaurant" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UtensilsCrossed className="h-5 w-5" />
                      Dine-in vs Takeaway
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={orderTypeStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ type, count }) => `${type}: ${count}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="type"
                        >
                          {orderTypeStats.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.type === 'Takeaway' ? '#f97316' : '#3b82f6'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Type Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderTypeStats.map((stat) => (
                        <div key={stat.type} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            {stat.type === 'Takeaway' ? (
                              <PackageCheck className="h-8 w-8 text-orange-500" />
                            ) : (
                              <UtensilsCrossed className="h-8 w-8 text-blue-500" />
                            )}
                            <div>
                              <p className="font-semibold">{stat.type}</p>
                              <p className="text-sm text-muted-foreground">{stat.count} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">₹{stat.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                            <p className="text-xs text-muted-foreground">
                              {metrics.totalRevenue > 0 ? ((stat.revenue / metrics.totalRevenue) * 100).toFixed(1) : 0}% of total
                            </p>
                          </div>
                        </div>
                      ))}
                      {orderTypeStats.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No order type data available</p>
                      )}
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

