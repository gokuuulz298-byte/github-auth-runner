import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, TrendingUp, TrendingDown, Package, Filter, Calendar, ArrowUpCircle, ArrowDownCircle, RotateCcw } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatIndianCurrency } from "@/lib/numberFormat";

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

const InventoryMovements = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuthContext();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [referenceTypeFilter, setReferenceTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");

  useEffect(() => {
    if (!authLoading && userId) {
      fetchMovements();
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

  const filteredMovements = movements.filter(m => {
    const matchesSearch = !searchTerm || 
      m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.party_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = movementTypeFilter === "all" || m.movement_type === movementTypeFilter;
    const matchesRef = referenceTypeFilter === "all" || m.reference_type === referenceTypeFilter;
    return matchesSearch && matchesType && matchesRef;
  });

  const stats = {
    totalInflow: movements.filter(m => m.movement_type === 'inflow').reduce((sum, m) => sum + m.quantity, 0),
    totalOutflow: movements.filter(m => m.movement_type === 'outflow').reduce((sum, m) => sum + m.quantity, 0),
    inflowValue: movements.filter(m => m.movement_type === 'inflow').reduce((sum, m) => sum + m.total_value, 0),
    outflowValue: movements.filter(m => m.movement_type === 'outflow').reduce((sum, m) => sum + m.total_value, 0),
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'inflow': return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'outflow': return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      default: return <RotateCcw className="h-4 w-4 text-blue-500" />;
    }
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <LoadingSpinner size="lg" text="Loading Inventory Movements..." />
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
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Inventory Movements</h1>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
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
          <ScrollArea className="h-[calc(100vh-400px)]">
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
      </main>
    </div>
  );
};

export default InventoryMovements;
