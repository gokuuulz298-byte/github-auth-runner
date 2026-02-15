import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, FileText, Plus, Edit, Trash2, Package, Users, Receipt, Settings, ShoppingBag, Tag, Wallet, Truck, Calendar, Filter, Building2, CreditCard, UserCog, UtensilsCrossed, FileCheck, Store } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthContext } from "@/hooks/useAuthContext";

interface AuditEntry {
  id: string;
  module: string;
  operation: 'create' | 'update' | 'delete';
  entity_id: string;
  entity_name: string;
  details: Record<string, any>;
  user_id: string;
  timestamp: string;
  full_data?: Record<string, any>;
}

const MODULE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  products: { icon: Package, label: 'Products', color: 'bg-blue-500' },
  inventory: { icon: Package, label: 'Inventory Movement', color: 'bg-emerald-500' },
  customers: { icon: Users, label: 'Customers', color: 'bg-green-500' },
  invoices: { icon: Receipt, label: 'Invoices', color: 'bg-purple-500' },
  categories: { icon: Tag, label: 'Categories', color: 'bg-orange-500' },
  coupons: { icon: Tag, label: 'Coupons', color: 'bg-pink-500' },
  expenses: { icon: Wallet, label: 'Expenses', color: 'bg-red-500' },
  purchases: { icon: Truck, label: 'Purchases', color: 'bg-cyan-500' },
  discounts: { icon: Tag, label: 'Discounts', color: 'bg-amber-500' },
  counters: { icon: Settings, label: 'Counters', color: 'bg-indigo-500' },
  suppliers: { icon: Store, label: 'Suppliers', color: 'bg-violet-500' },
  profile: { icon: Building2, label: 'Profile', color: 'bg-slate-500' },
  staff: { icon: UserCog, label: 'Staff', color: 'bg-teal-500' },
  waiters: { icon: UtensilsCrossed, label: 'Waiters', color: 'bg-lime-500' },
  templates: { icon: FileCheck, label: 'Templates', color: 'bg-fuchsia-500' },
};

const OPERATION_COLORS = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const Audits = () => {
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Cache staff/waiter names for user resolution
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (userId) {
      fetchUserNames();
      generateAuditTrail();
    }
  }, [dateRange, userId]);
  
  const fetchUserNames = async () => {
    if (!userId) return;
    const names: Record<string, string> = {};
    names[userId] = 'Admin';
    
    // Fetch staff names
    const { data: staffData } = await supabase
      .from('staff')
      .select('auth_user_id, display_name')
      .eq('created_by', userId);
    staffData?.forEach(s => { if (s.auth_user_id) names[s.auth_user_id] = s.display_name; });
    
    // Fetch waiter names
    const { data: waiterData } = await supabase
      .from('waiters')
      .select('auth_user_id, display_name')
      .eq('created_by', userId);
    waiterData?.forEach(w => { if (w.auth_user_id) names[w.auth_user_id] = w.display_name; });
    
    setUserNames(names);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "7d": return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case "30d": return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case "90d": return { start: startOfDay(subDays(now, 89)), end: endOfDay(now) };
      default: return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    }
  };

  const generateAuditTrail = async () => {
    try {
      setLoading(true);
      if (!userId) return;

      const { start, end } = getDateRange();
      const auditEntries: AuditEntry[] = [];

      // Run all queries in parallel for performance
      const [
        { data: invoices },
        { data: products },
        { data: updatedProducts },
        { data: deletedProducts },
        { data: customers },
        { data: expenses },
        { data: purchases },
        { data: receivedPurchases },
        { data: categories },
        { data: coupons },
        { data: updatedCoupons },
        { data: updatedCustomers },
        { data: updatedExpenses },
        { data: updatedCategories },
        { data: suppliers },
        { data: updatedSuppliers },
        { data: staff },
        { data: updatedStaff },
        { data: updatedPurchases },
      ] = await Promise.all([
        supabase.from('invoices').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('products').select('*').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('products').select('*').eq('created_by', userId).eq('is_deleted', true).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('customers').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('expenses').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('purchases').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('purchases').select('*').eq('created_by', userId).not('received_date', 'is', null).gte('received_date', start.toISOString()).lte('received_date', end.toISOString()),
        supabase.from('categories').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('coupons').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('coupons').select('*').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('customers').select('*').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('expenses').select('*').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('categories').select('*').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('suppliers').select('*').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('suppliers').select('*').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('staff').select('id, display_name, email, created_at, updated_at, is_active, allowed_modules').eq('created_by', userId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('staff').select('id, display_name, email, created_at, updated_at, is_active').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
        supabase.from('purchases').select('*').eq('created_by', userId).gte('updated_at', start.toISOString()).lte('updated_at', end.toISOString()),
      ]);

      // -- Process Invoices --
      invoices?.forEach(inv => {
        const items = (inv.items_data as any[]) || [];
        const billedBy = inv.created_by ? (userNames[inv.created_by] || 'Unknown') : 'Admin';
        auditEntries.push({
          id: `inv-${inv.id}`,
          module: 'invoices',
          operation: 'create',
          entity_id: inv.id,
          entity_name: inv.bill_number,
          details: { 
            total: inv.total_amount, 
            customer: inv.customer_name || 'Walk-in', 
            items_count: items.length,
            tax: inv.tax_amount,
            discount: inv.discount_amount,
            billed_by: billedBy,
          },
          user_id: inv.created_by || userId!,
          timestamp: inv.created_at,
          full_data: {
            bill_number: inv.bill_number,
            customer_name: inv.customer_name,
            customer_phone: inv.customer_phone,
            total_amount: inv.total_amount,
            tax_amount: inv.tax_amount,
            discount_amount: inv.discount_amount,
            billed_by: billedBy,
            billed_by_id: inv.created_by,
            items: items.map((item: any) => ({
              name: item.name, quantity: item.quantity, price: item.price, total: item.price * item.quantity
            }))
          }
        });
      });

      // -- Products --
      products?.forEach(prod => {
        auditEntries.push({
          id: `prod-${prod.id}`, module: 'products', operation: 'create',
          entity_id: prod.id, entity_name: prod.name,
          details: { price: prod.price, barcode: prod.barcode, category: prod.category, stock: prod.stock_quantity, buying_price: prod.buying_price },
          user_id: userId!, timestamp: prod.created_at!,
          full_data: { name: prod.name, barcode: prod.barcode, price: prod.price, buying_price: prod.buying_price, category: prod.category, stock_quantity: prod.stock_quantity, tax_rate: prod.tax_rate, hsn_code: prod.hsn_code, unit: prod.unit }
        });
      });

      updatedProducts?.forEach(prod => {
        if (prod.updated_at && prod.updated_at !== prod.created_at) {
          auditEntries.push({
            id: `prod-upd-${prod.id}-${prod.updated_at}`, module: 'products', operation: 'update',
            entity_id: prod.id, entity_name: prod.name,
            details: { price: prod.price, stock: prod.stock_quantity },
            user_id: userId!, timestamp: prod.updated_at,
          });
        }
      });

      deletedProducts?.forEach(prod => {
        auditEntries.push({
          id: `prod-del-${prod.id}`, module: 'products', operation: 'delete',
          entity_id: prod.id, entity_name: prod.name,
          details: { reason: 'Marked as deleted' },
          user_id: userId!, timestamp: prod.updated_at!,
        });
      });

      // -- Customers --
      customers?.forEach(cust => {
        auditEntries.push({
          id: `cust-${cust.id}`, module: 'customers', operation: 'create',
          entity_id: cust.id, entity_name: cust.name,
          details: { phone: cust.phone, email: cust.email },
          user_id: userId!, timestamp: cust.created_at!,
        });
      });

      updatedCustomers?.forEach(cust => {
        if (cust.updated_at && cust.updated_at !== cust.created_at) {
          auditEntries.push({
            id: `cust-upd-${cust.id}-${cust.updated_at}`, module: 'customers', operation: 'update',
            entity_id: cust.id, entity_name: cust.name,
            details: { phone: cust.phone, email: cust.email },
            user_id: userId!, timestamp: cust.updated_at,
          });
        }
      });

      // -- Expenses --
      expenses?.forEach(exp => {
        auditEntries.push({
          id: `exp-${exp.id}`, module: 'expenses', operation: 'create',
          entity_id: exp.id, entity_name: exp.category,
          details: { amount: exp.amount, description: exp.description, payment_mode: exp.payment_mode },
          user_id: userId!, timestamp: exp.created_at!,
        });
      });

      updatedExpenses?.forEach(exp => {
        if (exp.updated_at && exp.updated_at !== exp.created_at) {
          auditEntries.push({
            id: `exp-upd-${exp.id}-${exp.updated_at}`, module: 'expenses', operation: 'update',
            entity_id: exp.id, entity_name: exp.category,
            details: { amount: exp.amount, description: exp.description },
            user_id: userId!, timestamp: exp.updated_at,
          });
        }
      });

      // -- Purchases --
      purchases?.forEach(pur => {
        auditEntries.push({
          id: `pur-${pur.id}`, module: 'purchases', operation: 'create',
          entity_id: pur.id, entity_name: pur.purchase_number,
          details: { total: pur.total_amount, supplier: pur.supplier_name, status: pur.status },
          user_id: userId!, timestamp: pur.created_at!,
        });
      });

      receivedPurchases?.forEach(pur => {
        if (pur.received_date) {
          auditEntries.push({
            id: `pur-recv-${pur.id}`, module: 'purchases', operation: 'update',
            entity_id: pur.id, entity_name: pur.purchase_number,
            details: { action: 'Received', total: pur.total_amount },
            user_id: userId!, timestamp: pur.received_date,
          });
          const items = (pur.items_data as any[]) || [];
          items.forEach((item: any) => {
            auditEntries.push({
              id: `inv-movement-${pur.id}-${item.product_id || item.name}`, module: 'inventory', operation: 'update',
              entity_id: item.product_id || pur.id, entity_name: item.name || 'Unknown Product',
              details: { action: 'Stock Inflow', quantity_added: item.quantity, source: `Purchase ${pur.purchase_number}`, supplier: pur.supplier_name },
              user_id: userId!, timestamp: pur.received_date,
              full_data: { product_name: item.name, quantity_added: item.quantity, unit_price: item.price, total_value: (item.quantity || 0) * (item.price || 0), purchase_number: pur.purchase_number, supplier: pur.supplier_name }
            });
          });
        }
      });

      updatedPurchases?.forEach(pur => {
        if (pur.updated_at && pur.updated_at !== pur.created_at) {
          auditEntries.push({
            id: `pur-upd-${pur.id}-${pur.updated_at}`, module: 'purchases', operation: 'update',
            entity_id: pur.id, entity_name: pur.purchase_number,
            details: { status: pur.status, payment_status: pur.payment_status, paid: pur.paid_amount },
            user_id: userId!, timestamp: pur.updated_at,
          });
        }
      });

      // -- Inventory outflow from sales --
      invoices?.forEach(inv => {
        const items = (inv.items_data as any[]) || [];
        items.forEach((item: any) => {
          auditEntries.push({
            id: `inv-outflow-${inv.id}-${item.id || item.name}`, module: 'inventory', operation: 'update',
            entity_id: item.id || inv.id, entity_name: item.name || 'Unknown Product',
            details: { action: 'Stock Outflow', quantity_sold: item.quantity, source: `Sale ${inv.bill_number}`, customer: inv.customer_name || 'Walk-in' },
            user_id: userId!, timestamp: inv.created_at,
            full_data: { product_name: item.name, quantity_sold: item.quantity, unit_price: item.price, total_value: (item.quantity || 0) * (item.price || 0), bill_number: inv.bill_number, customer: inv.customer_name || 'Walk-in' }
          });
        });
      });

      // -- Categories --
      categories?.forEach(cat => {
        auditEntries.push({
          id: `cat-${cat.id}`, module: 'categories', operation: 'create',
          entity_id: cat.id, entity_name: cat.name, details: {},
          user_id: userId!, timestamp: cat.created_at!,
        });
      });

      updatedCategories?.forEach(cat => {
        if (cat.updated_at && cat.updated_at !== cat.created_at) {
          auditEntries.push({
            id: `cat-upd-${cat.id}-${cat.updated_at}`, module: 'categories', operation: 'update',
            entity_id: cat.id, entity_name: cat.name, details: {},
            user_id: userId!, timestamp: cat.updated_at,
          });
        }
      });

      // -- Coupons --
      coupons?.forEach(coup => {
        auditEntries.push({
          id: `coup-${coup.id}`, module: 'coupons', operation: 'create',
          entity_id: coup.id, entity_name: coup.code,
          details: { type: coup.discount_type, value: coup.discount_value },
          user_id: userId!, timestamp: coup.created_at!,
        });
      });

      updatedCoupons?.forEach(coup => {
        if (coup.updated_at && coup.updated_at !== coup.created_at) {
          auditEntries.push({
            id: `coup-upd-${coup.id}-${coup.updated_at}`, module: 'coupons', operation: 'update',
            entity_id: coup.id, entity_name: coup.code,
            details: { type: coup.discount_type, value: coup.discount_value, is_active: coup.is_active },
            user_id: userId!, timestamp: coup.updated_at,
          });
        }
      });

      // -- Suppliers --
      suppliers?.forEach(sup => {
        auditEntries.push({
          id: `sup-${sup.id}`, module: 'suppliers', operation: 'create',
          entity_id: sup.id, entity_name: sup.name,
          details: { phone: sup.phone, gst: sup.gst_number },
          user_id: userId!, timestamp: sup.created_at!,
          full_data: { name: sup.name, phone: sup.phone, email: sup.email, address: sup.address, gst_number: sup.gst_number }
        });
      });

      updatedSuppliers?.forEach(sup => {
        if (sup.updated_at && sup.updated_at !== sup.created_at) {
          auditEntries.push({
            id: `sup-upd-${sup.id}-${sup.updated_at}`, module: 'suppliers', operation: 'update',
            entity_id: sup.id, entity_name: sup.name,
            details: { phone: sup.phone, gst: sup.gst_number },
            user_id: userId!, timestamp: sup.updated_at,
          });
        }
      });

      // -- Staff --
      staff?.forEach(s => {
        auditEntries.push({
          id: `staff-${s.id}`, module: 'staff', operation: 'create',
          entity_id: s.id, entity_name: s.display_name,
          details: { email: s.email, modules: s.allowed_modules?.length || 0 },
          user_id: userId!, timestamp: s.created_at!,
        });
      });

      updatedStaff?.forEach(s => {
        if (s.updated_at && s.updated_at !== s.created_at) {
          auditEntries.push({
            id: `staff-upd-${s.id}-${s.updated_at}`, module: 'staff', operation: 'update',
            entity_id: s.id, entity_name: s.display_name,
            details: { email: s.email, is_active: s.is_active },
            user_id: userId!, timestamp: s.updated_at,
          });
        }
      });

      // Sort by timestamp descending
      auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAudits(auditEntries);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAudits = audits.filter(audit => {
    const matchesModule = selectedModule === "all" || audit.module === selectedModule;
    const matchesOperation = selectedOperation === "all" || audit.operation === selectedOperation;
    const matchesSearch = !searchTerm || 
      audit.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.module.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesModule && matchesOperation && matchesSearch;
  });

  const getModuleStats = () => {
    const stats: Record<string, { create: number; update: number; delete: number }> = {};
    audits.forEach(audit => {
      if (!stats[audit.module]) {
        stats[audit.module] = { create: 0, update: 0, delete: 0 };
      }
      stats[audit.module][audit.operation]++;
    });
    return stats;
  };

  const moduleStats = getModuleStats();

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'create': return <Plus className="h-3 w-3" />;
      case 'update': return <Edit className="h-3 w-3" />;
      case 'delete': return <Trash2 className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Audit Trail</h1>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(MODULE_CONFIG).slice(0, 6).map(([key, config]) => {
            const stats = moduleStats[key] || { create: 0, update: 0, delete: 0 };
            const Icon = config.icon;
            return (
              <Card 
                key={key} 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedModule === key ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedModule(selectedModule === key ? 'all' : key)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded ${config.color}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs font-medium truncate">{config.label}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600">+{stats.create}</span>
                    <span className="text-blue-600">~{stats.update}</span>
                    <span className="text-red-600">-{stats.delete}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search audits..."
                  className="pl-10"
                />
              </div>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[130px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {Object.entries(MODULE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="create">Created</SelectItem>
                  <SelectItem value="update">Updated</SelectItem>
                  <SelectItem value="delete">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity Log ({filteredAudits.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" text="Loading audit trail..." />
              </div>
            ) : filteredAudits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No audit entries found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filteredAudits.map((audit) => {
                  const config = MODULE_CONFIG[audit.module] || { icon: FileText, label: audit.module, color: 'bg-gray-500' };
                  const Icon = config.icon;
                  return (
                    <div
                      key={audit.id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedAudit(audit); setDetailOpen(true); }}
                    >
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{audit.entity_name}</span>
                          <Badge variant="outline" className={OPERATION_COLORS[audit.operation]}>
                            {getOperationIcon(audit.operation)}
                            <span className="ml-1 capitalize">{audit.operation}d</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {config.label} • {format(new Date(audit.timestamp), 'MMM dd, yyyy HH:mm')}
                          {audit.details?.billed_by && ` • by ${audit.details.billed_by}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Details
              </DialogTitle>
            </DialogHeader>
            {selectedAudit && (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4 pr-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Module</p>
                      <p className="font-medium capitalize">{selectedAudit.module}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Operation</p>
                      <Badge className={OPERATION_COLORS[selectedAudit.operation]}>
                        {selectedAudit.operation.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground">Entity</p>
                      <p className="font-medium">{selectedAudit.entity_name}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground">Timestamp</p>
                      <p className="font-medium">{format(new Date(selectedAudit.timestamp), 'PPpp')}</p>
                    </div>
                  </div>
                  
                  {Object.keys(selectedAudit.details).length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Summary</p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(selectedAudit.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">
                              {key.includes('amount') || key.includes('price') || key.includes('total') || key === 'tax' || key === 'discount'
                                ? `₹${parseFloat(String(value || 0)).toFixed(2)}`
                                : String(value) || '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Data Section for detailed view */}
                  {selectedAudit.full_data && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 font-semibold">Complete Record Data</p>
                      <div className="space-y-2 text-sm">
                        {Object.entries(selectedAudit.full_data).map(([key, value]) => {
                          // Handle items array specially for invoices
                          if (key === 'items' && Array.isArray(value)) {
                            return (
                              <div key={key} className="mt-3">
                                <p className="text-xs text-muted-foreground mb-2 font-medium">Items ({value.length})</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Item</TableHead>
                                      <TableHead className="text-xs text-right">Qty</TableHead>
                                      <TableHead className="text-xs text-right">Price</TableHead>
                                      <TableHead className="text-xs text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {value.map((item: any, idx: number) => (
                                      <TableRow key={idx}>
                                        <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                        <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-xs text-right">₹{item.price}</TableCell>
                                        <TableCell className="text-xs text-right">₹{item.total?.toFixed(2)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            );
                          }
                          return (
                            <div key={key} className="flex justify-between py-1 border-b border-blue-100 dark:border-blue-900 last:border-0">
                              <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                              <span className="font-medium text-right max-w-[60%] break-words">
                                {value === null || value === undefined 
                                  ? '-' 
                                  : typeof value === 'number' 
                                    ? (key.includes('amount') || key.includes('price') || key.includes('tax') || key.includes('discount')
                                        ? `₹${value.toFixed(2)}`
                                        : value)
                                    : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Audits;
