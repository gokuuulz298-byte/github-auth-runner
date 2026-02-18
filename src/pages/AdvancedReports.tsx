import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Package, Users, Calendar, BarChart3, Target, Award, Activity, ShoppingBag, Percent, Clock, CreditCard, Wallet, Smartphone, Layers, UtensilsCrossed, PackageCheck, ArrowUpRight, ArrowDownRight, Sparkles, Flame, Info, ChevronDown, ChevronUp, Filter, Truck, Receipt, CalendarDays, PieChartIcon, LineChartIcon, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageLoader } from "@/components/common";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatIndianCurrency } from "@/lib/numberFormat";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import { ReportKPICard, ReportChartCard, ReportTabsList, ReportFilterBar, ReportListItem } from "@/components/reports";
import { useAuthContext } from "@/hooks/useAuthContext";

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
  const { userId } = useAuthContext();
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
    if (userId) {
      fetchCounters();
      fetchBillingSettings();
      fetchProducts();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchAdvancedData();

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
          fetchAdvancedData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange, selectedCounter, userId]);

  useEffect(() => {
    if (products.length > 0) {
      fetchDayWiseData();
    }
  }, [dayWiseDate, products]);

  const fetchProducts = async () => {
    if (!userId) return;
    const { data } = await supabase.from('products').select('*').eq('created_by', userId);
    setProducts(data || []);
  };

  const fetchDayWiseData = async () => {
    setDayWiseLoading(true);
    try {
      if (!userId) return;

      const start = startOfDay(dayWiseDate);
      const end = endOfDay(dayWiseDate);

      // Fetch invoices for the day
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('created_by', userId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch expenses for the day
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', userId)
        .gte('expense_date', start.toISOString())
        .lte('expense_date', end.toISOString());

      // Fetch purchases for the day
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('created_by', userId)
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
      if (!userId) return;

      const { data } = await supabase
        .from('company_profiles')
        .select('billing_settings')
        .eq('user_id', userId)
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
      if (!userId) return;

      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .eq('created_by', userId)
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
      if (!userId) return;

      const { start, end } = getDateRange();

      // Fetch invoices
      let invoiceQuery = supabase
        .from('invoices')
        .select('*')
        .eq('created_by', userId)
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
        .eq('created_by', userId);

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('created_by', userId);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', userId)
        .gte('expense_date', start.toISOString())
        .lte('expense_date', end.toISOString());

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('created_by', userId)
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
        .eq('created_by', userId)
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
              // Use base price (without tax) for profit calculation
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
              // Use base price (without tax) for profit calculation
              const taxRate = item.tax_rate || product.tax_rate || 0;
              const isInclusive = item.is_inclusive !== false;
              const baseSellingPrice = isInclusive && taxRate > 0 
                ? item.price / (1 + taxRate / 100)
                : item.price;
              trendData[dayIndex].profit += (baseSellingPrice - product.buying_price) * item.quantity;
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
        .eq('created_by', userId)
        .gte('created_at', thisWeekStart.toISOString())
        .lte('created_at', new Date().toISOString());

      const { data: lastWeekInvoices } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .eq('created_by', userId)
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
      const receivedPurchases = (purchases || []).filter(p => p.status === 'received').length;
      
      // Net Profit calculation:
      // - Restaurant mode: Revenue - Expenses - Purchases (no cost price tracking)
      // - Retail mode: Gross Profit - Expenses (cost price is tracked)
      const netProfit = isRestaurant 
        ? totalRevenue - totalExpenses - totalPurchasesPaid
        : grossProfit - totalExpenses;

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
        receivedPurchases,
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
    return <PageLoader pageName="Advanced Reports" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Zoho-style Header */}
      <header className="border-b bg-card/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard")}
            className="hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Advanced Reports</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Business Intelligence Dashboard</p>
            </div>
          </div>
          <div className="ml-auto">
            <OnlineStatusIndicator />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
        {/* Zoho-style Filter Bar */}
        <ReportFilterBar
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          selectedCounter={selectedCounter}
          setSelectedCounter={setSelectedCounter}
          counters={counters}
          onRefresh={fetchAdvancedData}
          isOpen={filtersOpen}
          setIsOpen={setFiltersOpen}
        />

        {/* Primary KPI Cards - Zoho CRM Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <ReportKPICard
            title="Total Revenue"
            value={formatIndianCurrency(metrics.totalRevenue)}
            subtitle={metrics.growthRate >= 0 ? `${metrics.growthRate.toFixed(1)}% growth` : `${Math.abs(metrics.growthRate).toFixed(1)}% decline`}
            icon={DollarSign}
            variant="blue"
            trend={{ value: metrics.growthRate, isPositive: metrics.growthRate >= 0 }}
          />
          
          {!isRestaurant && (
            <ReportKPICard
              title="Gross Profit"
              value={formatIndianCurrency(metrics.totalProfit)}
              subtitle={`${metrics.profitMargin.toFixed(1)}% margin`}
              icon={TrendingUp}
              variant="green"
            />
          )}

          <ReportKPICard
            title="Total Orders"
            value={metrics.totalOrders.toString()}
            subtitle={`Avg: ${formatIndianCurrency(metrics.averageSale)}`}
            icon={ShoppingBag}
            variant="purple"
          />

          <ReportKPICard
            title="Tax Collected"
            value={formatIndianCurrency(metrics.totalTax)}
            subtitle="GST amount"
            icon={Percent}
            variant="orange"
          />
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <ReportKPICard
            title="Expenses"
            value={formatIndianCurrency(metrics.totalExpenses)}
            subtitle="Operational costs"
            icon={Receipt}
            variant="red"
          />

          <ReportKPICard
            title="Purchases"
            value={`${metrics.receivedPurchases} received`}
            subtitle={`${metrics.pendingPurchases} pending`}
            icon={Truck}
            variant="cyan"
          />

          <ReportKPICard
            title="Net Profit"
            value={formatIndianCurrency(metrics.netProfit)}
            subtitle="After all deductions"
            icon={metrics.netProfit >= 0 ? TrendingUp : TrendingDown}
            variant={metrics.netProfit >= 0 ? "emerald" : "red"}
          />

          <ReportKPICard
            title="Repeat Customers"
            value={`${metrics.repeatCustomerRate.toFixed(1)}%`}
            subtitle={`${metrics.totalCustomers} unique`}
            icon={Users}
            variant="indigo"
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-200/30 dark:border-amber-800/30">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
              <span className="text-[10px] sm:text-xs font-medium text-amber-600/80">Peak Hour</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">{metrics.peakHour || 'N/A'}</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-200/30 dark:border-teal-800/30">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
              <span className="text-[10px] sm:text-xs font-medium text-teal-600/80">Peak Day</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-teal-700 dark:text-teal-400 mt-1">{metrics.peakDay || 'N/A'}</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-200/30 dark:border-pink-800/30">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600" />
              <span className="text-[10px] sm:text-xs font-medium text-pink-600/80">Avg Items</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-pink-700 dark:text-pink-400 mt-1">{metrics.averageItemsPerOrder.toFixed(1)}</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-200/30 dark:border-violet-800/30">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-violet-600" />
              <span className="text-[10px] sm:text-xs font-medium text-violet-600/80">Expense %</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-violet-700 dark:text-violet-400 mt-1">
              {metrics.totalRevenue > 0 ? ((metrics.totalExpenses / metrics.totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <ReportTabsList
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'products', label: 'Products', icon: Package },
              { value: 'profit', label: 'Profit', icon: TrendingUp },
              { value: 'expenses', label: 'Expenses', icon: Receipt },
              { value: 'purchases', label: 'Purchases', icon: Truck },
              { value: 'customers', label: 'Customers', icon: Users },
              { value: 'payments', label: 'Payments', icon: CreditCard },
              { value: 'daywise', label: 'Day Wise', icon: CalendarDays },
              { value: 'gst', label: 'GST', icon: Percent },
              { value: 'margin', label: 'Margins', icon: TrendingUp },
              { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, hidden: !isRestaurant },
            ]}
          />

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportChartCard title="Revenue Trend" icon={TrendingUp} iconColor="text-blue-500">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      formatter={(value: number) => formatIndianCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={2} name="Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Category Distribution" icon={PieChartIcon} iconColor="text-purple-500">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryRevenue}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {categoryRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Hourly Sales Pattern" icon={Clock} iconColor="text-amber-500">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hourlySales}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number, name: string) => name === 'Revenue' ? formatIndianCurrency(value) : value} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="orders" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Sales by Day" icon={Calendar} iconColor="text-teal-500">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number, name: string) => name === 'Revenue' ? formatIndianCurrency(value) : value} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Weekly Comparison" icon={BarChart3} iconColor="text-cyan-500" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Revenue" />
                    <Bar dataKey="orders" fill="#10b981" radius={[0, 4, 4, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportChartCard title="Product Performance" icon={Package} iconColor="text-blue-500">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={productPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Top Selling Products" icon={Award} iconColor="text-amber-500">
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {topProducts.map((product, index) => (
                    <ReportListItem
                      key={product.id}
                      rank={index + 1}
                      title={product.name}
                      subtitle={`${product.quantity.toFixed(1)} units • ${product.salesCount} sales`}
                      value={formatIndianCurrency(product.revenue)}
                      valueColor="green"
                      secondaryValue={`Profit: ${formatIndianCurrency(product.profit)}`}
                      secondaryColor="text-blue-600"
                      highlight={index < 3}
                    />
                  ))}
                  {topProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No product data available</p>
                  )}
                </div>
              </ReportChartCard>
            </div>
          </TabsContent>

          {/* Profit Analysis Tab */}
          <TabsContent value="profit" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Profit Summary Cards */}
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-200/30 dark:border-green-800/30">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Profit</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1 truncate">
                    {formatIndianCurrency(metrics.totalProfit)}
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-200/30 dark:border-blue-800/30">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Profit Margin</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {metrics.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-200/30 dark:border-purple-800/30">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Profit/Order</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">
                    {formatIndianCurrency(metrics.totalOrders > 0 ? metrics.totalProfit / metrics.totalOrders : 0)}
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-200/30 dark:border-amber-800/30">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue:Profit</p>
                  <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {metrics.totalProfit > 0 ? (metrics.totalRevenue / metrics.totalProfit).toFixed(1) : 0}:1
                  </p>
                </div>
              </div>

              <ReportChartCard title="Top Profitable Products" icon={Award} iconColor="text-amber-500">
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {[...topProducts]
                    .sort((a, b) => b.profit - a.profit)
                    .slice(0, 10)
                    .map((product, index) => {
                      const profitMargin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                      return (
                        <ReportListItem
                          key={product.id}
                          rank={index + 1}
                          title={product.name}
                          subtitle={`${product.quantity.toFixed(0)} units sold`}
                          value={formatIndianCurrency(product.profit)}
                          valueColor="green"
                          secondaryValue={`${profitMargin.toFixed(1)}% margin`}
                          secondaryColor="text-blue-600"
                          highlight={index < 3}
                        />
                      );
                    })}
                  {topProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No profit data available</p>
                  )}
                </div>
              </ReportChartCard>

              <ReportChartCard title="Profit vs Revenue Trend" icon={LineChartIcon} iconColor="text-green-500">
                <ResponsiveContainer width="100%" height={310}>
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profitGradient)" strokeWidth={2} name="Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Product-wise Breakdown" icon={Package} iconColor="text-indigo-500" className="lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-2 font-semibold text-muted-foreground">Product</th>
                        <th className="text-right p-2 font-semibold text-muted-foreground">Qty</th>
                        <th className="text-right p-2 font-semibold text-muted-foreground">Revenue</th>
                        <th className="text-right p-2 font-semibold text-muted-foreground">Profit</th>
                        <th className="text-right p-2 font-semibold text-muted-foreground">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product) => {
                        const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                        const marginColor = margin >= 20 ? 'text-green-600' : margin >= 10 ? 'text-amber-600' : 'text-red-600';
                        return (
                          <tr key={product.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                            <td className="p-2 font-medium">{product.name}</td>
                            <td className="p-2 text-right text-muted-foreground">{product.quantity.toFixed(1)}</td>
                            <td className="p-2 text-right">{formatIndianCurrency(product.revenue)}</td>
                            <td className="p-2 text-right text-green-600 font-medium">{formatIndianCurrency(product.profit)}</td>
                            <td className={`p-2 text-right font-bold ${marginColor}`}>{margin.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ReportChartCard>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <ReportChartCard title="Top Customers" icon={Users} iconColor="text-indigo-500">
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {topCustomers.map((customer, index) => (
                  <ReportListItem
                    key={customer.id}
                    rank={index + 1}
                    title={customer.name || 'Unknown'}
                    subtitle={`${customer.phone} • ${customer.orderCount} orders`}
                    value={formatIndianCurrency(customer.totalSpent)}
                    valueColor="green"
                    secondaryValue={`Avg: ${formatIndianCurrency(customer.avgOrderValue)}`}
                    highlight={index < 3}
                  />
                ))}
                {topCustomers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No customer data available</p>
                )}
              </div>
            </ReportChartCard>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportChartCard title="Payment Distribution" icon={CreditCard} iconColor="text-purple-500">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={paymentModeStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ mode, count }) => `${mode}: ${count}`}
                      outerRadius={90}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="mode"
                      paddingAngle={3}
                    >
                      {paymentModeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Payment Revenue Breakdown" icon={Wallet} iconColor="text-green-500">
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {paymentModeStats.map((stat, index) => (
                    <div key={stat.mode} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <p className="font-medium text-sm">{stat.mode}</p>
                          <p className="text-xs text-muted-foreground">{stat.count} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-sm">{formatIndianCurrency(stat.revenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {metrics.totalRevenue > 0 ? ((stat.revenue / metrics.totalRevenue) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                  {paymentModeStats.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No payment data available</p>
                  )}
                </div>
              </ReportChartCard>
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
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : dayWiseData ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
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

          {/* Purchases Tab */}
          <TabsContent value="purchases" className="space-y-4">
            <div className="p-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>Counter filter does not apply to purchases (purchases are not counter-specific).</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-200/30 dark:border-blue-800/30">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Total POs</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">{metrics.purchaseCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-200/30 dark:border-green-800/30">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Received</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{metrics.receivedPurchases}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-200/30 dark:border-amber-800/30">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Pending/Ordered</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-1">{metrics.pendingPurchases}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-200/30 dark:border-purple-800/30">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">Total Paid</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-1 truncate">{formatIndianCurrency(metrics.totalPurchases)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportChartCard title="Purchases Trend" icon={Truck} iconColor="text-blue-500">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={purchasesTrend.length ? purchasesTrend : revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Area type="monotone" dataKey="purchases" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} name="Purchases" />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>
              <ReportChartCard title="Purchase vs Revenue" icon={BarChart3} iconColor="text-indigo-500">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4,4,0,0]} name="Revenue" />
                    <Bar dataKey="profit" fill="#3b82f6" radius={[4,4,0,0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="p-3 rounded-lg border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>Counter filter does not apply to expenses. Showing all expenses for the selected time range.</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportChartCard title="Expenses by Category" icon={Receipt} iconColor="text-red-500">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Expense Breakdown" icon={Wallet} iconColor="text-red-500">
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {expensesByCategory.map((exp, index) => (
                    <div key={exp.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-sm">{exp.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 text-sm">{formatIndianCurrency(exp.value)}</p>
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
              </ReportChartCard>
            </div>
          </TabsContent>

          {/* GST / Tax Reports Tab */}
          <TabsContent value="gst" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-orange-500" />
                    Tax Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Tax Collected</p>
                      <p className="text-2xl font-bold text-orange-600">{formatIndianCurrency(metrics.totalTax)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">CGST</p>
                        <p className="text-lg font-semibold">{formatIndianCurrency(metrics.totalTax / 2)}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">SGST</p>
                        <p className="text-lg font-semibold">{formatIndianCurrency(metrics.totalTax / 2)}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      <Info className="h-3 w-3 inline mr-1" />
                      Tax split shown is approximate (50/50). Actual split depends on individual product tax configurations.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {categoryRevenue.map((cat, index) => {
                      // Estimate tax assuming ~12% average GST
                      const estimatedTax = cat.value * 0.12;
                      return (
                        <div key={cat.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-orange-600">~{formatIndianCurrency(estimatedTax)}</p>
                            <p className="text-xs text-muted-foreground">
                              {cat.value > 0 ? ((estimatedTax / metrics.totalTax) * 100).toFixed(1) : 0}% of total tax
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {categoryRevenue.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No category tax data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tax Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis tickFormatter={(value) => `₹${(value * 0.12 / 1000).toFixed(0)}k`} fontSize={12} />
                    <Tooltip formatter={(value: number) => [`₹${(value * 0.12).toFixed(2)}`, 'Est. Tax']} />
                    <Area type="monotone" dataKey="revenue" name="Tax (est.)" stroke="#f97316" fill="#fed7aa" />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2 text-center">Estimated tax at ~12% of revenue</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margin Analysis Tab */}
          <TabsContent value="margin" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Profit Margin Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Overall Profit Margin</p>
                      <p className="text-3xl font-bold text-green-600">{formatDecimal(metrics.profitMargin)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gross Profit: {formatIndianCurrency(metrics.totalProfit)} / Revenue: {formatIndianCurrency(metrics.totalRevenue)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg border-l-4 border-l-green-500">
                        <p className="text-xs text-muted-foreground">High Margin</p>
                        <p className="text-lg font-semibold text-green-600">&gt;30%</p>
                        <p className="text-xs text-muted-foreground">Excellent</p>
                      </div>
                      <div className="p-3 border rounded-lg border-l-4 border-l-yellow-500">
                        <p className="text-xs text-muted-foreground">Low Margin</p>
                        <p className="text-lg font-semibold text-yellow-600">&lt;15%</p>
                        <p className="text-xs text-muted-foreground">Needs attention</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Products by Margin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {topProducts
                      .filter(p => p.revenue > 0)
                      .map((product, index) => {
                        const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                        const marginClass = margin > 30 ? 'text-green-600' : margin > 15 ? 'text-yellow-600' : 'text-red-600';
                        return (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono text-muted-foreground">#{index + 1}</span>
                              <span className="font-medium truncate max-w-[150px]">{product.name}</span>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${marginClass}`}>{formatDecimal(margin)}%</p>
                              <p className="text-xs text-muted-foreground">
                                {formatIndianCurrency(product.profit)} profit
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    {topProducts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No margin data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Profit Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} fontSize={12} />
                    <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
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
                        innerRadius={50}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                        paddingAngle={2}
                      >
                        {orderTypeStats.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.type === 'Takeaway' ? '#f97316' : '#3b82f6'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => value.toFixed(0)} />
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

