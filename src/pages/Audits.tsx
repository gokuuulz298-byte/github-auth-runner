import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, FileText, Plus, Edit, Trash2, Package, Users, Receipt, Settings, ShoppingBag, Tag, Wallet, Truck, Calendar, Filter } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AuditEntry {
  id: string;
  module: string;
  operation: 'create' | 'update' | 'delete';
  entity_id: string;
  entity_name: string;
  details: Record<string, any>;
  user_id: string;
  timestamp: string;
}

const MODULE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  products: { icon: Package, label: 'Products', color: 'bg-blue-500' },
  customers: { icon: Users, label: 'Customers', color: 'bg-green-500' },
  invoices: { icon: Receipt, label: 'Invoices', color: 'bg-purple-500' },
  categories: { icon: Tag, label: 'Categories', color: 'bg-orange-500' },
  coupons: { icon: Tag, label: 'Coupons', color: 'bg-pink-500' },
  expenses: { icon: Wallet, label: 'Expenses', color: 'bg-red-500' },
  purchases: { icon: Truck, label: 'Purchases', color: 'bg-cyan-500' },
  discounts: { icon: Tag, label: 'Discounts', color: 'bg-amber-500' },
  counters: { icon: Settings, label: 'Counters', color: 'bg-indigo-500' },
};

const OPERATION_COLORS = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const Audits = () => {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    generateAuditTrail();
  }, [dateRange]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getDateRange();
      const auditEntries: AuditEntry[] = [];

      // Fetch invoices (sales created)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      invoices?.forEach(inv => {
        auditEntries.push({
          id: `inv-${inv.id}`,
          module: 'invoices',
          operation: 'create',
          entity_id: inv.id,
          entity_name: inv.bill_number,
          details: { total: inv.total_amount, customer: inv.customer_name, items: (inv.items_data as any[])?.length || 0 },
          user_id: user.id,
          timestamp: inv.created_at,
        });
      });

      // Fetch products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      products?.forEach(prod => {
        auditEntries.push({
          id: `prod-${prod.id}`,
          module: 'products',
          operation: 'create',
          entity_id: prod.id,
          entity_name: prod.name,
          details: { price: prod.price, barcode: prod.barcode, category: prod.category },
          user_id: user.id,
          timestamp: prod.created_at!,
        });
      });

      // Fetch product updates
      const { data: updatedProducts } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString())
        .not('updated_at', 'eq', supabase.rpc as any);

      updatedProducts?.forEach(prod => {
        if (prod.updated_at && prod.updated_at !== prod.created_at) {
          auditEntries.push({
            id: `prod-upd-${prod.id}-${prod.updated_at}`,
            module: 'products',
            operation: 'update',
            entity_id: prod.id,
            entity_name: prod.name,
            details: { price: prod.price, stock: prod.stock_quantity },
            user_id: user.id,
            timestamp: prod.updated_at,
          });
        }
      });

      // Deleted products
      const { data: deletedProducts } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_deleted', true)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString());

      deletedProducts?.forEach(prod => {
        auditEntries.push({
          id: `prod-del-${prod.id}`,
          module: 'products',
          operation: 'delete',
          entity_id: prod.id,
          entity_name: prod.name,
          details: { reason: 'Marked as deleted' },
          user_id: user.id,
          timestamp: prod.updated_at!,
        });
      });

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      customers?.forEach(cust => {
        auditEntries.push({
          id: `cust-${cust.id}`,
          module: 'customers',
          operation: 'create',
          entity_id: cust.id,
          entity_name: cust.name,
          details: { phone: cust.phone, email: cust.email },
          user_id: user.id,
          timestamp: cust.created_at!,
        });
      });

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      expenses?.forEach(exp => {
        auditEntries.push({
          id: `exp-${exp.id}`,
          module: 'expenses',
          operation: 'create',
          entity_id: exp.id,
          entity_name: exp.category,
          details: { amount: exp.amount, description: exp.description, payment_mode: exp.payment_mode },
          user_id: user.id,
          timestamp: exp.created_at!,
        });
      });

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      purchases?.forEach(pur => {
        auditEntries.push({
          id: `pur-${pur.id}`,
          module: 'purchases',
          operation: 'create',
          entity_id: pur.id,
          entity_name: pur.purchase_number,
          details: { total: pur.total_amount, supplier: pur.supplier_name, status: pur.status },
          user_id: user.id,
          timestamp: pur.created_at!,
        });
      });

      // Status updates for purchases
      const { data: receivedPurchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('created_by', user.id)
        .not('received_date', 'is', null)
        .gte('received_date', start.toISOString())
        .lte('received_date', end.toISOString());

      receivedPurchases?.forEach(pur => {
        if (pur.received_date) {
          auditEntries.push({
            id: `pur-recv-${pur.id}`,
            module: 'purchases',
            operation: 'update',
            entity_id: pur.id,
            entity_name: pur.purchase_number,
            details: { action: 'Received', total: pur.total_amount },
            user_id: user.id,
            timestamp: pur.received_date,
          });
        }
      });

      // Fetch categories
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      categories?.forEach(cat => {
        auditEntries.push({
          id: `cat-${cat.id}`,
          module: 'categories',
          operation: 'create',
          entity_id: cat.id,
          entity_name: cat.name,
          details: {},
          user_id: user.id,
          timestamp: cat.created_at!,
        });
      });

      // Fetch coupons
      const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      coupons?.forEach(coup => {
        auditEntries.push({
          id: `coup-${coup.id}`,
          module: 'coupons',
          operation: 'create',
          entity_id: coup.id,
          entity_name: coup.code,
          details: { type: coup.discount_type, value: coup.discount_value },
          user_id: user.id,
          timestamp: coup.created_at!,
        });
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Audit Details</DialogTitle>
            </DialogHeader>
            {selectedAudit && (
              <div className="space-y-4">
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
                    <p className="text-xs text-muted-foreground mb-2">Details</p>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedAudit.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize text-muted-foreground">{key.replace('_', ' ')}:</span>
                          <span className="font-medium">{typeof value === 'number' ? `₹${value}` : String(value) || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Audits;
