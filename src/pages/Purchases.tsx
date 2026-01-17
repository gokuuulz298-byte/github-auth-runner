import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Package, Truck, CheckCircle2, Clock, Search, X, Eye, Lock, GripVertical, Percent } from "lucide-react";
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
  discount?: number;
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

const STATUS_COLUMNS = [
  { id: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { id: 'ordered', label: 'Ordered', color: 'bg-blue-500' },
  { id: 'received', label: 'Received', color: 'bg-green-500' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

const Purchases = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedPurchase, setDraggedPurchase] = useState<Purchase | null>(null);
  
  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [selectedItems, setSelectedItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);

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
        barcode: product.barcode,
        discount: 0
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

  const handleUpdateItemDiscount = (id: string, discount: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.id === id ? { ...item, discount: Math.max(0, Math.min(100, discount)) } : item
    ));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const itemTotal = item.unit_price * item.quantity;
      const itemDiscount = item.discount ? (itemTotal * item.discount / 100) : 0;
      return sum + (itemTotal - itemDiscount);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const globalDiscount = discountPercent > 0 ? (subtotal * discountPercent / 100) : 0;
    return subtotal - globalDiscount;
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

      const { error: purchaseError } = await supabase
        .from('purchases')
        .update({ 
          status: 'received', 
          received_date: new Date().toISOString() 
        })
        .eq('id', purchase.id);

      if (purchaseError) throw purchaseError;

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

  const handleStatusChange = async (purchaseId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'received') {
        updateData.received_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', purchaseId);

      if (error) throw error;

      // If received, update stock
      if (newStatus === 'received') {
        const purchase = purchases.find(p => p.id === purchaseId);
        if (purchase) {
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
        }
      }

      toast.success(`Status updated to ${newStatus}`);
      fetchPurchases();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleDragStart = (e: React.DragEvent, purchase: Purchase) => {
    setDraggedPurchase(purchase);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedPurchase && draggedPurchase.status !== status) {
      handleStatusChange(draggedPurchase.id, status);
    }
    setDraggedPurchase(null);
  };

  const resetForm = () => {
    setSupplierName("");
    setSupplierPhone("");
    setNotes("");
    setExpectedDate("");
    setSelectedItems([]);
    setProductSearch("");
    setDiscountPercent(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'ordered':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Truck className="h-3 w-3 mr-1" />Ordered</Badge>;
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
    return matchesSearch;
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode.includes(productSearch)
  );

  const getPurchasesByStatus = (status: string) => {
    return filteredPurchases.filter(p => p.status === status);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Purchase Orders</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-10 h-9"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  New PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left - Supplier & Items */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Supplier Name</Label>
                        <Input
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="Supplier name"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={supplierPhone}
                          onChange={(e) => setSupplierPhone(e.target.value)}
                          placeholder="Phone"
                          className="h-9"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Expected Delivery</Label>
                      <Input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Search Products (by name or barcode)</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search..."
                          className="pl-10 h-9"
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg max-h-40 overflow-y-auto">
                      {filteredProducts.slice(0, 15).map(product => (
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
                            <p className="text-sm font-medium text-primary">{formatIndianCurrency(product.buying_price || product.price)}</p>
                            <p className="text-xs text-muted-foreground">Cost</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Right - Selected Items */}
                  <div className="space-y-3">
                    <Label className="text-xs">Selected Items ({selectedItems.length})</Label>
                    <div className="border rounded-lg max-h-52 overflow-y-auto">
                      {selectedItems.length === 0 ? (
                        <p className="p-4 text-center text-muted-foreground text-sm">
                          Click products to add
                        </p>
                      ) : (
                        selectedItems.map(item => (
                          <div key={item.id} className="p-2 border-b last:border-b-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{formatIndianCurrency(item.unit_price)}/unit</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                                  className="w-14 h-7 text-center text-sm"
                                  min={0}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleUpdateQuantity(item.id, 0)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Percent className="h-3 w-3 text-muted-foreground" />
                              <Input
                                type="number"
                                value={item.discount || 0}
                                onChange={(e) => handleUpdateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                className="w-16 h-6 text-xs"
                                placeholder="Disc %"
                                min={0}
                                max={100}
                              />
                              <span className="text-xs text-muted-foreground">
                                = {formatIndianCurrency((item.unit_price * item.quantity) * (1 - (item.discount || 0) / 100))}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatIndianCurrency(calculateSubtotal())}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Extra Discount %</Label>
                        <Input
                          type="number"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                          className="w-20 h-7 text-sm"
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">
                          -{formatIndianCurrency(calculateSubtotal() * discountPercent / 100)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                        <span>Total</span>
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
        </div>
      </header>

      <main className="container mx-auto px-2 py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          /* Kanban Board */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUS_COLUMNS.map(column => (
              <div
                key={column.id}
                className="bg-muted/30 rounded-lg p-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {getPurchasesByStatus(column.id).length}
                  </Badge>
                </div>
                
                <div className="space-y-2 min-h-[200px]">
                  {getPurchasesByStatus(column.id).map(purchase => (
                    <Card
                      key={purchase.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, purchase)}
                      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedPurchase(purchase);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs font-semibold text-primary truncate">
                              {purchase.purchase_number}
                            </p>
                            <p className="text-sm font-medium truncate mt-1">
                              {purchase.supplier_name || 'No supplier'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {purchase.items_data.length} items
                            </p>
                          </div>
                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            {new Date(purchase.created_at).toLocaleDateString()}
                          </span>
                          <span className="font-semibold text-sm">
                            {formatIndianCurrency(purchase.total_amount)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Purchase Order Details
              {selectedPurchase?.status === 'received' && <Lock className="h-4 w-4 text-muted-foreground" />}
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">PO Number</p>
                  <p className="font-mono font-semibold">{selectedPurchase.purchase_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5">{getStatusBadge(selectedPurchase.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-semibold">{selectedPurchase.supplier_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-semibold">{selectedPurchase.supplier_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-semibold">{new Date(selectedPurchase.created_at).toLocaleString()}</p>
                </div>
                {selectedPurchase.received_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Received</p>
                    <p className="font-semibold">{new Date(selectedPurchase.received_date).toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-right text-xs">Qty</TableHead>
                        <TableHead className="text-right text-xs">Unit Price</TableHead>
                        <TableHead className="text-right text-xs">Disc %</TableHead>
                        <TableHead className="text-right text-xs">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.items_data.map((item, idx) => {
                        const itemTotal = item.unit_price * item.quantity;
                        const discountAmount = item.discount ? (itemTotal * item.discount / 100) : 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.barcode}</p>
                            </TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatIndianCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-right text-sm">{item.discount || 0}%</TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatIndianCurrency(itemTotal - discountAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                <span className="font-bold">Total Amount</span>
                <span className="font-bold text-lg text-primary">{formatIndianCurrency(selectedPurchase.total_amount)}</span>
              </div>

              {selectedPurchase.notes && (
                <div className="p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedPurchase.notes}</p>
                </div>
              )}

              {selectedPurchase.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleStatusChange(selectedPurchase.id, 'ordered')}
                    className="flex-1"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark Ordered
                  </Button>
                  <Button 
                    onClick={() => handleReceivePurchase(selectedPurchase)} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Receive & Update Stock
                  </Button>
                </div>
              )}

              {selectedPurchase.status === 'ordered' && (
                <Button 
                  onClick={() => handleReceivePurchase(selectedPurchase)} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Receive & Update Stock
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
