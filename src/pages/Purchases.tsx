import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Package, Truck, CheckCircle2, Clock, Search, X, Eye, Lock, GripVertical, Percent, Users, CreditCard, Wallet, History } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/LoadingSpinner";
import LoadingButton from "@/components/LoadingButton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  barcode: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

interface PurchasePayment {
  id: string;
  purchase_id: string;
  amount: number;
  payment_mode: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

interface Purchase {
  id: string;
  purchase_number: string;
  supplier_name: string | null;
  supplier_phone: string | null;
  status: string;
  items_data: PurchaseItem[];
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  notes: string | null;
  expected_date: string | null;
  received_date: string | null;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  mapped_products: string[];
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedPurchase, setDraggedPurchase] = useState<Purchase | null>(null);
  
  // Payment log state
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [newPaymentMode, setNewPaymentMode] = useState<string>("cash");
  const [newPaymentNotes, setNewPaymentNotes] = useState<string>("");
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  
  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [selectedItems, setSelectedItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedPurchase) {
      fetchPayments(selectedPurchase.id);
    }
  }, [selectedPurchase]);

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
        items_data: p.items_data as unknown as PurchaseItem[],
        paid_amount: Number(p.paid_amount) || 0,
        payment_status: p.payment_status || 'pending'
      })) as Purchase[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (purchaseId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('purchase_payments')
        .select('*')
        .eq('purchase_id', purchaseId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments((data || []) as PurchasePayment[]);
    } catch (error) {
      console.error(error);
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

  const fetchSuppliers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, phone, mapped_products')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;
      setSuppliers((data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        mapped_products: (s.mapped_products as string[]) || []
      })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedPurchase || !newPaymentAmount || parseFloat(newPaymentAmount) <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    const amount = parseFloat(newPaymentAmount);
    const remainingAmount = selectedPurchase.total_amount - selectedPurchase.paid_amount;

    if (amount > remainingAmount) {
      toast.error(`Payment cannot exceed remaining amount: ${formatIndianCurrency(remainingAmount)}`);
      return;
    }

    setIsAddingPayment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('purchase_payments')
        .insert({
          purchase_id: selectedPurchase.id,
          amount,
          payment_mode: newPaymentMode,
          notes: newPaymentNotes || null,
          created_by: user.id
        });

      if (paymentError) throw paymentError;

      // Update purchase paid_amount and payment_status
      const newPaidAmount = selectedPurchase.paid_amount + amount;
      // Use tolerance for floating point comparison
      const isFullyPaid = Math.abs(newPaidAmount - selectedPurchase.total_amount) < 0.01 || newPaidAmount >= selectedPurchase.total_amount;
      const newPaymentStatus = isFullyPaid
        ? 'paid' 
        : newPaidAmount > 0 
          ? 'partial' 
          : 'pending';

      const { error: updateError } = await supabase
        .from('purchases')
        .update({ 
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus
        })
        .eq('id', selectedPurchase.id);

      if (updateError) throw updateError;

      toast.success("Payment recorded successfully!");
      setNewPaymentAmount("");
      setNewPaymentNotes("");
      setNewPaymentMode("cash");
      
      // Refresh data
      fetchPayments(selectedPurchase.id);
      fetchPurchases();
      
      // Update selected purchase locally
      setSelectedPurchase({
        ...selectedPurchase,
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus
      });

    } catch (error) {
      console.error(error);
      toast.error("Failed to record payment");
    } finally {
      setIsAddingPayment(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Fully Paid</Badge>;
      case 'partial':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Partially Paid</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const generatePurchaseNumber = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${dateStr}-${random}`;
  };

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setSelectedSupplierId(supplierId);
      setSupplierName(supplier.name);
      setSupplierPhone(supplier.phone);
    } else {
      setSelectedSupplierId("");
    }
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
        discount: 0,
        discountType: 'percentage',
        discountValue: 0
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

  const handleUpdateItemDiscount = (id: string, value: number, type: 'percentage' | 'fixed') => {
    setSelectedItems(selectedItems.map(item =>
      item.id === id ? { 
        ...item, 
        discountType: type,
        discountValue: type === 'percentage' ? Math.max(0, Math.min(100, value)) : Math.max(0, value),
        discount: type === 'percentage' ? Math.max(0, Math.min(100, value)) : 0
      } : item
    ));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const itemTotal = item.unit_price * item.quantity;
      let itemDiscountAmount = 0;
      if (item.discountType === 'fixed' && item.discountValue) {
        itemDiscountAmount = item.discountValue;
      } else if (item.discountType === 'percentage' && item.discountValue) {
        itemDiscountAmount = itemTotal * item.discountValue / 100;
      } else if (item.discount) {
        itemDiscountAmount = itemTotal * item.discount / 100;
      }
      return sum + (itemTotal - itemDiscountAmount);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    let globalDiscountAmount = 0;
    if (discountType === 'fixed') {
      globalDiscountAmount = discountValue;
    } else {
      globalDiscountAmount = subtotal * discountValue / 100;
    }
    return subtotal - globalDiscountAmount;
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
            
          // Record inventory movement for inflow
          await supabase
            .from('inventory_movements')
            .insert({
              product_id: item.id,
              product_name: item.name,
              movement_type: 'inflow',
              quantity: item.quantity,
              reference_type: 'purchase',
              reference_id: purchase.id,
              reference_number: purchase.purchase_number,
              unit_price: item.unit_price,
              total_value: item.unit_price * item.quantity,
              party_name: purchase.supplier_name,
              party_phone: purchase.supplier_phone,
              created_by: user.id
            });
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
    // Prevent dragging received orders
    if (purchase.status === 'received') {
      e.preventDefault();
      return;
    }
    setDraggedPurchase(purchase);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    // Prevent changing to received via drag (must use button)
    // Prevent changing FROM received status
    if (draggedPurchase && draggedPurchase.status !== status && draggedPurchase.status !== 'received' && status !== 'received') {
      handleStatusChange(draggedPurchase.id, status);
    }
    setDraggedPurchase(null);
  };

  const resetForm = () => {
    setSupplierName("");
    setSupplierPhone("");
    setSelectedSupplierId("");
    setNotes("");
    setExpectedDate("");
    setSelectedItems([]);
    setProductSearch("");
    setDiscountPercent(0);
    setDiscountType('percentage');
    setDiscountValue(0);
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

  // Filter products based on selected supplier mapping or all products
  const getFilteredProducts = () => {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    let productsToShow = products;
    
    // If supplier is selected and has mapped products, show only mapped ones
    if (selectedSupplier && selectedSupplier.mapped_products && selectedSupplier.mapped_products.length > 0) {
      productsToShow = products.filter(p => selectedSupplier.mapped_products.includes(p.id));
    }
    
    // Apply search filter
    return productsToShow.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
    );
  };

  const filteredProducts = getFilteredProducts();

  const getPurchasesByStatus = (status: string) => {
    return filteredPurchases.filter(p => p.status === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading purchases..." />
      </div>
    );
  }

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
                    {/* Supplier Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Select Supplier (Optional)
                      </Label>
                      <Select value={selectedSupplierId || "manual"} onValueChange={(val) => handleSupplierSelect(val === "manual" ? "" : val)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose from saved suppliers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">-- Manual Entry --</SelectItem>
                          {suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name} ({supplier.phone})
                              {supplier.mapped_products.length > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  • {supplier.mapped_products.length} products
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Supplier Name</Label>
                        <Input
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="Supplier name"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={supplierPhone}
                          onChange={(e) => setSupplierPhone(e.target.value)}
                          placeholder="Phone number"
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Expected Delivery Date</Label>
                      <Input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Product Search */}
                    <div className="space-y-2">
                      <Label className="text-xs">Add Products</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products..."
                          className="pl-10 h-9"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        {filteredProducts.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground text-center">No products found</p>
                        ) : (
                          filteredProducts.slice(0, 10).map(product => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                              onClick={() => handleAddProduct(product)}
                            >
                              <div>
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.barcode}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{formatIndianCurrency(product.buying_price || product.price)}</p>
                                <Plus className="h-4 w-4 text-primary ml-auto" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right - Selected Items & Summary */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Selected Items ({selectedItems.length})</Label>
                      <div className="max-h-60 overflow-y-auto border rounded-lg">
                        {selectedItems.length === 0 ? (
                          <p className="p-4 text-sm text-muted-foreground text-center">No items added</p>
                        ) : (
                          <div className="divide-y">
                            {selectedItems.map(item => (
                              <div key={item.id} className="p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatIndianCurrency(item.unit_price)} each</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    >
                                      -
                                    </Button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    >
                                      +
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => handleUpdateQuantity(item.id, 0)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {/* Item Discount */}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-muted-foreground">Discount:</span>
                                  <RadioGroup 
                                    value={item.discountType || 'percentage'} 
                                    onValueChange={(v) => handleUpdateItemDiscount(item.id, item.discountValue || 0, v as 'percentage' | 'fixed')}
                                    className="flex gap-2"
                                  >
                                    <div className="flex items-center space-x-1">
                                      <RadioGroupItem value="percentage" id={`${item.id}-pct`} className="h-3 w-3" />
                                      <Label htmlFor={`${item.id}-pct`} className="text-xs">%</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <RadioGroupItem value="fixed" id={`${item.id}-fixed`} className="h-3 w-3" />
                                      <Label htmlFor={`${item.id}-fixed`} className="text-xs">₹</Label>
                                    </div>
                                  </RadioGroup>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.discountValue || ''}
                                    onChange={(e) => handleUpdateItemDiscount(item.id, parseFloat(e.target.value) || 0, item.discountType || 'percentage')}
                                    className="h-7 w-20 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Global Discount */}
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Global Discount
                      </Label>
                      <div className="flex items-center gap-2">
                        <RadioGroup 
                          value={discountType} 
                          onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}
                          className="flex gap-3"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="percentage" id="global-pct" />
                            <Label htmlFor="global-pct" className="text-xs">Percentage (%)</Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="fixed" id="global-fixed" />
                            <Label htmlFor="global-fixed" className="text-xs">Fixed (₹)</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        className="h-9"
                        placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes..."
                        rows={2}
                      />
                    </div>

                    {/* Summary */}
                    <div className="p-3 bg-primary/5 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatIndianCurrency(calculateSubtotal())}</span>
                      </div>
                      {discountValue > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Discount:</span>
                          <span>
                            -{discountType === 'percentage' 
                              ? formatIndianCurrency(calculateSubtotal() * discountValue / 100)
                              : formatIndianCurrency(discountValue)
                            }
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span className="text-primary">{formatIndianCurrency(calculateTotal())}</span>
                      </div>
                    </div>

                    <LoadingButton 
                      isLoading={isCreating}
                      onClick={handleCreatePurchase} 
                      className="w-full" 
                      disabled={selectedItems.length === 0}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Create Purchase Order
                    </LoadingButton>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 py-4 overflow-hidden">
        {/* Kanban Board - Fixed height with column-level scrolling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 140px)' }}>
          {STATUS_COLUMNS.map(column => {
            const statusBgColor = 
              column.id === 'pending' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
              column.id === 'ordered' ? 'bg-blue-50 dark:bg-blue-950/20' :
              column.id === 'received' ? 'bg-green-50 dark:bg-green-950/20' :
              column.id === 'cancelled' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30';
            
            const isLockedColumn = column.id === 'received';
            
            return (
            <div
              key={column.id}
              className={`rounded-lg p-3 ${statusBgColor} border border-opacity-50 flex flex-col ${
                column.id === 'pending' ? 'border-yellow-200 dark:border-yellow-800' :
                column.id === 'ordered' ? 'border-blue-200 dark:border-blue-800' :
                column.id === 'received' ? 'border-green-200 dark:border-green-800' :
                column.id === 'cancelled' ? 'border-red-200 dark:border-red-800' : ''
              }`}
              onDragOver={!isLockedColumn ? handleDragOver : undefined}
              onDrop={!isLockedColumn ? (e) => handleDrop(e, column.id) : undefined}
            >
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${column.color}`} />
                <h3 className="font-semibold text-sm">{column.label}</h3>
                {isLockedColumn && <Lock className="h-3 w-3 text-muted-foreground" />}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {getPurchasesByStatus(column.id).length}
                </Badge>
              </div>
              
              {/* Scrollable cards container */}
              <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                {getPurchasesByStatus(column.id).map(purchase => (
                  <Card
                    key={purchase.id}
                    draggable={purchase.status !== 'received'}
                    onDragStart={(e) => handleDragStart(e, purchase)}
                    className={`hover:shadow-md transition-shadow bg-card ${purchase.status !== 'received' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
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
                        {purchase.status !== 'received' && <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(purchase.created_at).toLocaleDateString()}
                          </span>
                          {getPaymentStatusBadge(purchase.payment_status)}
                        </div>
                        <span className="font-semibold text-sm">
                          {formatIndianCurrency(purchase.total_amount)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )})}
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Purchase Order Details
              {selectedPurchase?.status === 'received' && <Lock className="h-4 w-4 text-muted-foreground" />}
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  Payments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
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
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-4">
                {/* Payment Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold text-blue-600">{formatIndianCurrency(selectedPurchase.total_amount)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Paid Amount</p>
                      <p className="text-lg font-bold text-green-600">{formatIndianCurrency(selectedPurchase.paid_amount)}</p>
                    </CardContent>
                  </Card>
                  <Card className={`${selectedPurchase.total_amount - selectedPurchase.paid_amount > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200' : 'bg-gray-50 dark:bg-gray-950/30'}`}>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className={`text-lg font-bold ${selectedPurchase.total_amount - selectedPurchase.paid_amount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatIndianCurrency(selectedPurchase.total_amount - selectedPurchase.paid_amount)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">Payment Status:</p>
                  {getPaymentStatusBadge(selectedPurchase.payment_status)}
                </div>

                <Separator />

                {/* Add Payment Form */}
                {selectedPurchase.total_amount - selectedPurchase.paid_amount > 0 && (
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Record Payment
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          value={newPaymentAmount}
                          onChange={(e) => setNewPaymentAmount(e.target.value)}
                          placeholder={`Max: ${formatIndianCurrency(selectedPurchase.total_amount - selectedPurchase.paid_amount)}`}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Payment Mode</Label>
                        <Select value={newPaymentMode} onValueChange={setNewPaymentMode}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes (Optional)</Label>
                      <Input
                        value={newPaymentNotes}
                        onChange={(e) => setNewPaymentNotes(e.target.value)}
                        placeholder="Payment reference, cheque number, etc."
                        className="h-9"
                      />
                    </div>
                    <LoadingButton
                      isLoading={isAddingPayment}
                      onClick={handleAddPayment}
                      className="w-full"
                      disabled={!newPaymentAmount || parseFloat(newPaymentAmount) <= 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </LoadingButton>
                  </div>
                )}

                {/* Payment History */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Payment History
                  </h4>
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                              <Wallet className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{formatIndianCurrency(payment.amount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(payment.payment_date).toLocaleString()} • {payment.payment_mode.replace('_', ' ').toUpperCase()}
                              </p>
                              {payment.notes && (
                                <p className="text-xs text-muted-foreground italic">{payment.notes}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
