import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, TrendingUp, TrendingDown, Package, Filter, Calendar, ArrowUpCircle, ArrowDownCircle, RotateCcw, Warehouse, DollarSign, AlertTriangle, BarChart3 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/common";
import { formatIndianCurrency } from "@/lib/numberFormat";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";

interface InventoryMovement {
  id: string;
  product_id: string | null;
  product_name: string;
  movement_type: 'inflow' | 'outflow' | 'adjustment';
  quantity: number;
  reference_type: 'purchase' | 'sale' | 'return' | 'adjustment';
  reference_id: string | null;
  reference_number: string | null;
  unit_price: number;
  total_value: number;
  notes: string | null;
  party_name: string | null;
  party_phone: string | null;
  created_at: string;
}

interface ProductStock {
  id: string;
  name: string;
  barcode: string;
  category: string | null;
  stock_quantity: number;
  buying_price: number | null;
  price: number;
  low_stock_threshold: number;
  unit: string;
}

const InventoryMovements = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuthContext();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [referenceTypeFilter, setReferenceTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [activeTab, setActiveTab] = useState<string>("ledger");
  const [stockSearchTerm, setStockSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && userId) {
      fetchMovements();
      fetchProducts();
    }
  }, [authLoading, userId, dateRange]);

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

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('created_by', userId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements((data || []) as InventoryMovement[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, barcode, category, stock_quantity, buying_price, price, low_stock_threshold, unit')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setProducts((data || []) as ProductStock[]);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredMovements = movements.filter(m => {
    const matchesSearch = !searchTerm || 
      m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.party_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = movementTypeFilter === "all" || m.movement_type === movementTypeFilter;
    const matchesRef = referenceTypeFilter === "all" || m.reference_type === referenceTypeFilter;
    return matchesSearch && matchesType && matchesRef;
  });

  const filteredProducts = products.filter(p => 
    !stockSearchTerm || 
    p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(stockSearchTerm.toLowerCase())
  );

  const stats = {
    totalInflow: movements.filter(m => m.movement_type === 'inflow').reduce((sum, m) => sum + m.quantity, 0),
    totalOutflow: movements.filter(m => m.movement_type === 'outflow').reduce((sum, m) => sum + m.quantity, 0),
    inflowValue: movements.filter(m => m.movement_type === 'inflow').reduce((sum, m) => sum + m.total_value, 0),
    outflowValue: movements.filter(m => m.movement_type === 'outflow').reduce((sum, m) => sum + m.total_value, 0),
  };

  // Stock summary calculations
  const stockStats = {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + Number(p.stock_quantity || 0), 0),
    lowStockCount: products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 10)).length,
    outOfStockCount: products.filter(p => p.stock_quantity <= 0).length,
    totalStockValue: products.reduce((sum, p) => sum + (Number(p.stock_quantity || 0) * Number(p.buying_price || p.price || 0)), 0),
    totalRetailValue: products.reduce((sum, p) => sum + (Number(p.stock_quantity || 0) * Number(p.price || 0)), 0),
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'inflow': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">+Inflow</Badge>;
      case 'outflow': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">-Outflow</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Adjustment</Badge>;
    }
  };

  const getReferenceBadge = (type: string) => {
    switch (type) {
      case 'purchase': return <Badge variant="outline" className="text-cyan-600 border-cyan-300">Purchase</Badge>;
      case 'sale': return <Badge variant="outline" className="text-purple-600 border-purple-300">Sale</Badge>;
      case 'return': return <Badge variant="outline" className="text-orange-600 border-orange-300">Return</Badge>;
      default: return <Badge variant="outline">Adjustment</Badge>;
    }
  };

  const getStockStatusBadge = (product: ProductStock) => {
    if (product.stock_quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (product.stock_quantity <= (product.low_stock_threshold || 10)) {
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Low Stock</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
  };

  if (loading || authLoading) {
    return <PageLoader pageName="Stock Ledger" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Stock Ledger</h1>
          <div className="ml-auto">
            <OnlineStatusIndicator />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-3 gap-1">
              <TabsTrigger value="ledger" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Movement Ledger
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Stock Summary
              </TabsTrigger>
              <TabsTrigger value="valuation" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valuation Report
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Movement Ledger Tab */}
          <TabsContent value="ledger" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Inflow</p>
                      <p className="text-xl font-bold text-green-600">+{stats.totalInflow.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Outflow</p>
                      <p className="text-xl font-bold text-red-600">-{stats.totalOutflow.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <ArrowUpCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Inflow Value</p>
                      <p className="text-lg font-bold text-green-600">{formatIndianCurrency(stats.inflowValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <ArrowDownCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outflow Value</p>
                      <p className="text-lg font-bold text-red-600">{formatIndianCurrency(stats.outflowValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products, references..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[140px]">
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
                  
                  <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="inflow">Inflow</SelectItem>
                      <SelectItem value="outflow">Outflow</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={referenceTypeFilter} onValueChange={setReferenceTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="purchase">Purchases</SelectItem>
                      <SelectItem value="sale">Sales</SelectItem>
                      <SelectItem value="return">Returns</SelectItem>
                      <SelectItem value="adjustment">Adjustments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Movements Table */}
            <Card>
              <ScrollArea className="h-[calc(100vh-500px)]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Party</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.length > 0 ? (
                      filteredMovements.map((movement, idx) => (
                        <TableRow key={movement.id} className="stagger-item" style={{ animationDelay: `${idx * 20}ms` }}>
                          <TableCell className="text-sm">
                            {format(new Date(movement.created_at), "dd MMM, HH:mm")}
                          </TableCell>
                          <TableCell className="font-medium">{movement.product_name}</TableCell>
                          <TableCell>{getMovementBadge(movement.movement_type)}</TableCell>
                          <TableCell>{getReferenceBadge(movement.reference_type)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={movement.movement_type === 'inflow' ? 'text-green-600' : movement.movement_type === 'outflow' ? 'text-red-600' : ''}>
                              {movement.movement_type === 'inflow' ? '+' : movement.movement_type === 'outflow' ? '-' : ''}
                              {movement.quantity.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatIndianCurrency(movement.total_value)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.party_name || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground">No inventory movements found</p>
                          <p className="text-sm text-muted-foreground/70">Movements are recorded automatically when purchases are received or sales are made</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Stock Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            {/* Stock Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Total Products</p>
                      <p className="text-2xl font-bold">{stockStats.totalProducts}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Total Stock Units</p>
                      <p className="text-2xl font-bold">{stockStats.totalStock.toFixed(2)}</p>
                    </div>
                    <Warehouse className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-100">Low Stock Items</p>
                      <p className="text-2xl font-bold">{stockStats.lowStockCount}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-100">Out of Stock</p>
                      <p className="text-2xl font-bold">{stockStats.outOfStockCount}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name, barcode, or category..."
                    value={stockSearchTerm}
                    onChange={(e) => setStockSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stock Table */}
            <Card>
              <ScrollArea className="h-[calc(100vh-450px)]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Stock Qty</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product, idx) => (
                        <TableRow key={product.id} className="stagger-item" style={{ animationDelay: `${idx * 15}ms` }}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.category || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {Number(product.stock_quantity).toFixed(2)} {product.unit}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {product.low_stock_threshold || 10}
                          </TableCell>
                          <TableCell>{getStockStatusBadge(product)}</TableCell>
                          <TableCell className="text-right">
                            {formatIndianCurrency(product.buying_price || product.price)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatIndianCurrency(Number(product.stock_quantity) * Number(product.buying_price || product.price))}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground">No products found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Valuation Report Tab */}
          <TabsContent value="valuation" className="space-y-4">
            {/* Valuation Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-purple-100">Total Stock Cost Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatIndianCurrency(stockStats.totalStockValue)}</p>
                  <p className="text-xs text-purple-200 mt-1">Based on buying price × quantity</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-100">Total Retail Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatIndianCurrency(stockStats.totalRetailValue)}</p>
                  <p className="text-xs text-emerald-200 mt-1">Based on selling price × quantity</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-100">Potential Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatIndianCurrency(stockStats.totalRetailValue - stockStats.totalStockValue)}</p>
                  <p className="text-xs text-amber-200 mt-1">
                    {stockStats.totalStockValue > 0 
                      ? `${(((stockStats.totalRetailValue - stockStats.totalStockValue) / stockStats.totalStockValue) * 100).toFixed(1)}% margin`
                      : '0% margin'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Valuation by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Valuation by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(
                    products.reduce((map, p) => {
                      const cat = p.category || 'Uncategorized';
                      const existing = map.get(cat) || { cost: 0, retail: 0, count: 0 };
                      existing.cost += Number(p.stock_quantity) * Number(p.buying_price || p.price);
                      existing.retail += Number(p.stock_quantity) * Number(p.price);
                      existing.count += 1;
                      map.set(cat, existing);
                      return map;
                    }, new Map<string, { cost: number; retail: number; count: number }>())
                  )
                    .sort((a, b) => b[1].retail - a[1].retail)
                    .map(([category, data], index) => (
                      <div key={category} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6] }}
                          />
                          <div>
                            <p className="font-semibold">{category}</p>
                            <p className="text-xs text-muted-foreground">{data.count} products</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatIndianCurrency(data.retail)}</p>
                          <p className="text-xs text-muted-foreground">
                            Cost: {formatIndianCurrency(data.cost)}
                          </p>
                        </div>
                      </div>
                    ))}
                  {products.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No products to analyze</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Value Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Products by Stock Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...products]
                    .map(p => ({
                      ...p,
                      stockValue: Number(p.stock_quantity) * Number(p.buying_price || p.price),
                      retailValue: Number(p.stock_quantity) * Number(p.price),
                    }))
                    .sort((a, b) => b.stockValue - a.stockValue)
                    .slice(0, 10)
                    .map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground w-6">#{index + 1}</span>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Number(product.stock_quantity).toFixed(2)} units @ {formatIndianCurrency(product.buying_price || product.price)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatIndianCurrency(product.stockValue)}</p>
                          <p className="text-xs text-green-600">Retail: {formatIndianCurrency(product.retailValue)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default InventoryMovements;