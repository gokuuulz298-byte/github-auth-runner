import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Package, Truck, CheckCircle2, Clock, Search, X, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { Textarea } from "@/components/ui/textarea";

interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  barcode: string;
}

interface Purchase {
  id: string;
  purchase_number: string;
  supplier_name: string | null;
  supplier_phone: string | null;
  status: string;
  items_data: PurchaseItem[];
  total_amount: number;
  notes: string | null;
  expected_date: string | null;
  received_date: string | null;
  created_at: string;
}

const Purchases = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [selectedItems, setSelectedItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases((data || []).map(p => ({
        ...p,
        items_data: p.items_data as unknown as PurchaseItem[]
      })) as Purchase[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const generatePurchaseNumber = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${dateStr}-${random}`;
  };

  const handleAddProduct = (product: any) => {
    const existing = selectedItems.find(item => item.id === product.id);
    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, {
        id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: Number(product.buying_price) || Number(product.price),
        barcode: product.barcode
      }]);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter(item => item.id !== id));
    } else {
      setSelectedItems(selectedItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const handleCreatePurchase = async () => {
    if (selectedItems.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const purchaseData = {
        created_by: user.id,
        purchase_number: generatePurchaseNumber(),
        supplier_name: supplierName || null,
        supplier_phone: supplierPhone || null,
        status: 'pending',
        items_data: selectedItems as unknown as any,
        total_amount: calculateTotal(),
        notes: notes || null,
        expected_date: expectedDate || null
      };

      const { error } = await supabase.from('purchases').insert([purchaseData]);

      if (error) throw error;
      toast.success("Purchase order created!");
      setDialogOpen(false);
      resetForm();
      fetchPurchases();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create purchase order");
    }
  };

  const handleReceivePurchase = async (purchase: Purchase) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update purchase status
      const { error: purchaseError } = await supabase
        .from('purchases')
        .update({ 
          status: 'received', 
          received_date: new Date().toISOString() 
        })
        .eq('id', purchase.id);

      if (purchaseError) throw purchaseError;

      // Update stock for each item
      for (const item of purchase.items_data) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();

        if (product) {
          const newStock = (Number(product.stock_quantity) || 0) + item.quantity;
          await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.id);
        }
      }

      toast.success("Purchase received! Stock updated.");
      fetchPurchases();
      setDetailDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to receive purchase");
    }
  };

  const resetForm = () => {
    setSupplierName("");
    setSupplierPhone("");
    setNotes("");
    setExpectedDate("");
    setSelectedItems([]);
    setProductSearch("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Received</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.purchase_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode.includes(productSearch)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">Purchase Orders</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left - Supplier & Items */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Supplier Name</Label>
                      <Input
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="Supplier name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier Phone</Label>
                      <Input
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Expected Delivery Date</Label>
                    <Input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Search Products</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search by name or barcode..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredProducts.slice(0, 20).map(product => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-muted/50 cursor-pointer flex justify-between items-center border-b last:border-b-0"
                        onClick={() => handleAddProduct(product)}
                      >
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.barcode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatIndianCurrency(product.buying_price || product.price)}</p>
                          <p className="text-xs text-muted-foreground">Stock: {product.stock_quantity || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Right - Selected Items */}
                <div className="space-y-4">
                  <Label>Selected Items ({selectedItems.length})</Label>
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {selectedItems.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground text-sm">
                        Click products to add them
                      </p>
                    ) : (
                      selectedItems.map(item => (
                        <div key={item.id} className="p-2 border-b last:border-b-0 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatIndianCurrency(item.unit_price)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(item.id, 0)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Amount</span>
                      <span className="text-primary">{formatIndianCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <Button onClick={handleCreatePurchase} className="w-full" disabled={selectedItems.length === 0}>
                    <Package className="h-4 w-4 mr-2" />
                    Create Purchase Order
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                All Purchases ({filteredPurchases.length})
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map(purchase => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono">{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.supplier_name || '-'}</TableCell>
                      <TableCell>{purchase.items_data.length} items</TableCell>
                      <TableCell className="font-medium">{formatIndianCurrency(purchase.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>{new Date(purchase.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPurchases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Purchase Order Details
              {selectedPurchase?.status === 'received' && <Lock className="h-4 w-4 text-muted-foreground" />}
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">PO Number</p>
                  <p className="font-mono font-semibold">{selectedPurchase.purchase_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPurchase.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-semibold">{selectedPurchase.supplier_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold">{selectedPurchase.supplier_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-semibold">{new Date(selectedPurchase.created_at).toLocaleString()}</p>
                </div>
                {selectedPurchase.received_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="font-semibold">{new Date(selectedPurchase.received_date).toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.items_data.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.barcode}</p>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatIndianCurrency(item.unit_price * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-bold text-xl text-primary">{formatIndianCurrency(selectedPurchase.total_amount)}</span>
              </div>

              {selectedPurchase.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedPurchase.notes}</p>
                </div>
              )}

              {selectedPurchase.status === 'pending' && (
                <Button 
                  onClick={() => handleReceivePurchase(selectedPurchase)} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Received & Update Stock
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
