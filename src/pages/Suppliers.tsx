import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Package, Phone, Mail, MapPin, X, Eye, FileText, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoadingSpinner from "@/components/LoadingSpinner";
import LoadingButton from "@/components/LoadingButton";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  notes: string | null;
  mapped_products: string[];
  created_at: string;
}

interface PurchaseHistory {
  id: string;
  purchase_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const Suppliers = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuthContext();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  
  // Detail view state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [supplierPendingAmounts, setSupplierPendingAmounts] = useState<{[key: string]: number}>({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    notes: "",
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Keyboard navigation
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchSuppliers();
      fetchProducts();
      fetchAllPendingAmounts();
    }
  }, [authLoading, userId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSelectedSupplier(null);
        setDialogOpen(false);
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .select('*')
        .eq('created_by', userId)
        .order('name');

      if (error) throw error;
      setSuppliers((data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        gst_number: s.gst_number,
        notes: s.notes,
        mapped_products: (s.mapped_products as string[]) || [],
        created_at: s.created_at
      })));
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
        .select('id, name, barcode, buying_price')
        .eq('created_by', userId)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllPendingAmounts = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('supplier_name, total_amount, paid_amount')
        .eq('created_by', userId)
        .in('status', ['ordered', 'received']);

      if (error) throw error;
      
      const pendingBySupplier: {[key: string]: number} = {};
      (data || []).forEach(p => {
        const name = p.supplier_name || '';
        const pending = (p.total_amount || 0) - (Number(p.paid_amount) || 0);
        pendingBySupplier[name] = (pendingBySupplier[name] || 0) + pending;
      });
      setSupplierPendingAmounts(pendingBySupplier);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPurchaseHistory = async (supplierName: string) => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, purchase_number, total_amount, paid_amount, status, created_at')
        .eq('created_by', userId)
        .eq('supplier_name', supplierName)
        .in('status', ['ordered', 'received'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseHistory(data || []);
      
      const pending = (data || [])
        .reduce((sum, p) => sum + ((p.total_amount || 0) - (Number(p.paid_amount) || 0)), 0);
      setPendingAmount(pending);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSupplierClick = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    await fetchPurchaseHistory(supplier.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Name and Phone are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const supplierData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        gst_number: formData.gst_number.trim() || null,
        notes: formData.notes.trim() || null,
        mapped_products: selectedProducts.length > 0 ? selectedProducts : [],
        created_by: userId,
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id);

        if (error) throw error;
        toast.success("Supplier updated successfully!");
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert([supplierData])
          .select();

        if (error) throw error;
        console.log('Supplier created:', data);
        toast.success("Supplier added successfully!");
      }

      setDialogOpen(false);
      resetForm();
      await fetchSuppliers();
    } catch (error: any) {
      console.error('Supplier save error:', error);
      toast.error(error.message || "Failed to save supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email || "",
      address: supplier.address || "",
      gst_number: supplier.gst_number || "",
      notes: supplier.notes || "",
    });
    setSelectedProducts(supplier.mapped_products || []);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      const { error } = await supabase
        .from('suppliers' as any)
        .delete()
        .eq('id', supplierToDelete);

      if (error) throw error;
      toast.success("Supplier deleted successfully!");
      fetchSuppliers();
      setSelectedSupplier(null);
    } catch (error) {
      toast.error("Error deleting supplier");
    } finally {
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      gst_number: "",
      notes: "",
    });
    setSelectedProducts([]);
    setEditingSupplier(null);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery)
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode.includes(productSearch)
  );

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-green-500';
      case 'ordered': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading suppliers..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-x-hidden">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Supplier Management</h1>
          <span className="text-xs text-muted-foreground ml-auto">Ctrl+F: Search | Ctrl+N: New | Esc: Close</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Supplier List */}
          <div className="flex-1 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Search suppliers... (Ctrl+F)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingSupplier ? "Update supplier details and product mappings." : "Add a new supplier and map products to them."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Supplier Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="gst">GST Number</Label>
                        <Input
                          id="gst"
                          value={formData.gst_number}
                          onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                    
                    {/* Product Mapping */}
                    <div>
                      <Label>Map Products to Supplier</Label>
                      <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <ScrollArea className="h-40 mt-2 border rounded-md p-2">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(product => {
                            const isSelected = selectedProducts.includes(product.id);
                            return (
                              <label
                                key={product.id}
                                htmlFor={`product-${product.id}`}
                                className={`flex items-center gap-2 py-1.5 px-2 hover:bg-muted rounded cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                              >
                                <Checkbox
                                  id={`product-${product.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleProduct(product.id)}
                                />
                                <span className="text-sm flex-1 pointer-events-none">
                                  {product.name}
                                  {product.is_raw_material && (
                                    <span className="ml-1.5 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Raw</span>
                                  )}
                                </span>
                                <Badge variant="outline" className="text-xs pointer-events-none">
                                  {formatIndianCurrency(product.buying_price || 0)}
                                </Badge>
                              </label>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No products found
                          </p>
                        )}
                      </ScrollArea>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedProducts.length} products selected
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <LoadingButton type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                        {editingSupplier ? "Update" : "Add"} Supplier
                      </LoadingButton>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Supplier Cards */}
            <div className="grid gap-3">
              {filteredSuppliers.length === 0 ? (
                <Card className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No suppliers found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Supplier
                  </Button>
                </Card>
              ) : (
                filteredSuppliers.map(supplier => {
                  // Calculate pending amount for this supplier from purchaseHistory state
                  // But since we don't have it in filtered view, we track it via a separate fetch
                  const hasPendingOrders = purchaseHistory.some(p => 
                    p.status !== 'cancelled' && selectedSupplier?.id === supplier.id
                  );
                  
                  return (
                    <Card
                      key={supplier.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedSupplier?.id === supplier.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleSupplierClick(supplier)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSupplierClick(supplier);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{supplier.name}</h3>
                              {/* Pending indicator will show when supplier is selected and has pending */}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {supplier.phone}
                              </span>
                              {supplier.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {supplier.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {supplierPendingAmounts[supplier.name] > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                ₹{supplierPendingAmounts[supplier.name].toFixed(0)} pending
                              </Badge>
                            )}
                            <Badge variant="secondary">
                              {supplier.mapped_products?.length || 0} products
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => handleEdit(supplier, e)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSupplierToDelete(supplier.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Supplier Detail */}
          <div className="lg:w-[450px] max-h-[calc(100vh-140px)] overflow-y-auto">
            {selectedSupplier ? (
              <Card className="sticky top-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedSupplier.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedSupplier(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selectedSupplier.phone}
                    </div>
                    {selectedSupplier.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedSupplier.email}
                      </div>
                    )}
                    {selectedSupplier.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedSupplier.address}
                      </div>
                    )}
                    {selectedSupplier.gst_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        GST: {selectedSupplier.gst_number}
                      </div>
                    )}
                  </div>

                  {/* Pending Amount */}
                  <Card className={pendingAmount > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200' : 'bg-green-50 dark:bg-green-950/20 border-green-200'}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pending Amount</span>
                        <span className={`font-bold ${pendingAmount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {formatIndianCurrency(pendingAmount)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mapped Products */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Mapped Products ({selectedSupplier.mapped_products?.length || 0})</h4>
                    <ScrollArea className="h-24 border rounded-md">
                      <div className="p-2 space-y-1">
                        {selectedSupplier.mapped_products?.map(productId => {
                          const product = products.find(p => p.id === productId);
                          return product ? (
                            <div key={productId} className="flex justify-between text-sm py-1 px-2 bg-muted/50 rounded">
                              <span>{product.name}</span>
                              <span className="text-muted-foreground">{formatIndianCurrency(product.buying_price || 0)}</span>
                            </div>
                          ) : null;
                        })}
                        {(!selectedSupplier.mapped_products || selectedSupplier.mapped_products.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-2">No products mapped</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Purchase History */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Purchase History</h4>
                    <ScrollArea className="h-40 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">PO#</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseHistory.map(purchase => (
                            <TableRow key={purchase.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="text-xs font-medium">{purchase.purchase_number}</TableCell>
                              <TableCell className="text-xs">{formatIndianCurrency(purchase.total_amount)}</TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${getStatusColor(purchase.status)}`}>
                                  {purchase.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {purchaseHistory.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                                No purchase history
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        sessionStorage.setItem('selectedSupplier', JSON.stringify(selectedSupplier));
                        navigate('/purchases');
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New PO
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => handleEdit(selectedSupplier, e)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-20 p-8 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Select a supplier to view details</p>
              </Card>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the supplier record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Suppliers;
