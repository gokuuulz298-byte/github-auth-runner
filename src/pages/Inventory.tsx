import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Barcode, Loader2, X } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveProductsToIndexedDB, getAllProducts, deleteProductFromIndexedDB } from "@/lib/indexedDB";
import BulkProductImport from "@/components/BulkProductImport";
import PaginationControls from "@/components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import { PAGE_SIZE } from "@/lib/cacheConfig";

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_quantity: number;
  tax_rate: number;
  category?: string;
  price_type?: string;
}

interface BillingSettings {
  ModernBilling?: {
    mode: "inclusive" | "exclusive";
    inclusiveBillType: "split" | "nosplit";
  };
  ManualBilling?: {
    mode: "inclusive" | "exclusive";
    inclusiveBillType: "split" | "nosplit";
  };
  isRestaurant?: boolean;
}

const Inventory = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuthContext();
  // Retail-only mode: single products view (raw materials & restaurant mode removed)
  const viewType: "products" | "raw_materials" = "products";
  const isRestaurant = false;
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    price: "",
    buying_price: "",
    stock_quantity: "",
    low_stock_threshold: "10",
    hsn_code: "",
    product_tax: "",
    cgst: "",
    sgst: "",
    tax_rate: "0",
    category: "",
    price_type: "fixed",
    unit: "piece",
    image_url: "",
    is_inclusive: true,
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  // Single RPC call for categories + billing settings (replaces 3 queries → 1)
  useEffect(() => {
    if (!authLoading && userId) {
      fetchInventoryBundle();
    }
  }, [authLoading, userId]);

  // Fetch paginated products whenever filters change
  useEffect(() => {
    if (!authLoading && userId) {
      fetchProducts();
    }
  }, [authLoading, userId, currentPage, debouncedSearch, selectedCategory]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, selectedCategory]);

  const fetchInventoryBundle = async () => {
    const CACHE_KEY = 'inventory_bundle_cache';
    const CACHE_DURATION = 5 * 60 * 1000;
    
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data: cachedData, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setCategories(cachedData.categories || []);
        if (cachedData.billing_settings) {
          const settings = cachedData.billing_settings as BillingSettings;
          setBillingSettings(settings);
        }
        setPageLoading(false);
        return;
      }
    }
    
    try {
      const { data, error } = await (supabase.rpc as any)('get_inventory_bundle', { p_user_id: userId });
      if (error) throw error;
      if (data) {
        setCategories(data.categories || []);
        if (data.billing_settings) {
          const settings = data.billing_settings as BillingSettings;
          setBillingSettings(settings);
        }
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      }
    } catch (error) {
      console.error("Error fetching inventory bundle:", error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      if (isOnline) {
        if (!userId) {
          toast.error("Please sign in to view products");
          return;
        }

        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('created_by', userId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (selectedCategory !== "All") {
          query = query.eq('category', selectedCategory);
        }
        if (debouncedSearch) {
          query = query.or(`name.ilike.%${debouncedSearch}%,barcode.ilike.%${debouncedSearch}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        
        setProducts(data || []);
        setTotalCount(count || 0);
        
        // Save to IndexedDB for offline (only first page, background)
        if (currentPage === 0 && !debouncedSearch && selectedCategory === "All") {
          saveProductsToIndexedDB(data || []);
        }
      } else {
        const localProducts = await getAllProducts();
        const filtered = localProducts.filter((p: any) => {
          const matchCat = selectedCategory === "All" || p.category === selectedCategory;
          const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.barcode.includes(debouncedSearch);
          return matchCat && matchSearch;
        });
        setProducts(filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE));
        setTotalCount(filtered.length);
      }
    } catch (error: any) {
      toast.error(`Error fetching products: ${error.message || 'Unknown error'}`);
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      toast.error("You need to be online to add/edit products");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!userId) throw new Error("Not authenticated");

      const cgst = parseFloat(formData.cgst) || 0;
      const sgst = parseFloat(formData.sgst) || 0;
      const productTax = parseFloat(formData.product_tax) || 0;
      
      // Calculate total tax: if cgst and sgst are provided, use their sum, otherwise use product_tax
      const totalTax = (cgst > 0 || sgst > 0) ? (cgst + sgst) : productTax;

      // Check for duplicate barcode
      let query = supabase
        .from('products')
        .select('id')
        .eq('barcode', formData.barcode);
      
      if (editingProduct?.id) {
        query = query.neq('id', editingProduct.id);
      }
      
      const { data: existingProduct, error: checkError } = await query.maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingProduct) {
        toast.error(`Error: Barcode "${formData.barcode}" already exists. Please use a unique barcode for each product.`);
        return;
      }

      const productData = {
        barcode: formData.barcode,
        name: formData.name,
        price: parseFloat(formData.price),
        buying_price: parseFloat(formData.buying_price) || 0,
        stock_quantity: parseFloat(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
        hsn_code: formData.hsn_code || null,
        product_tax: totalTax,
        cgst: cgst,
        sgst: sgst,
        tax_rate: totalTax,
        category: formData.category || null,
        price_type: formData.price_type,
        unit: formData.unit,
        image_url: formData.image_url || null,
        created_by: userId,
        is_inclusive: formData.is_inclusive !== false,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {
          if (error.code === '23505') {
            toast.error("Error: This barcode already exists in the database. Please use a different barcode.");
          } else {
            toast.error(`Database Error: ${error.message}`);
          }
          return;
        }
        toast.success("Product updated successfully!");
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          if (error.code === '23505') {
            toast.error("Error: This barcode already exists in the database. Please use a different barcode.");
          } else {
            toast.error(`Database Error: ${error.message}`);
          }
          return;
        }
        toast.success("Product added successfully!");
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      barcode: product.barcode,
      name: product.name,
      price: product.price.toString(),
      buying_price: (product as any).buying_price?.toString() || "0",
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: (product as any).low_stock_threshold?.toString() || "10",
      hsn_code: (product as any).hsn_code || "",
      product_tax: (product as any).product_tax?.toString() || "0",
      cgst: (product as any).cgst?.toString() || "0",
      sgst: (product as any).sgst?.toString() || "0",
      tax_rate: product.tax_rate.toString(),
      category: product.category || "",
      price_type: product.price_type || "fixed",
      unit: (product as any).unit || "piece",
      image_url: (product as any).image_url || "",
      is_inclusive: (product as any).is_inclusive ?? true,
    });
    setSelectedBarcode(product.barcode);
    setDialogOpen(true);
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!isOnline) {
      toast.error("You need to be online to delete products");
      return;
    }

    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', productToDelete);

      if (error) throw error;

      await deleteProductFromIndexedDB(productToDelete);
      toast.success("Product deleted successfully!");
      fetchProducts();
    } catch (error) {
      toast.error("Error deleting product");
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      barcode: "",
      name: "",
      price: "",
      buying_price: "",
      stock_quantity: "",
      low_stock_threshold: "10",
      hsn_code: "",
      product_tax: "",
      cgst: "",
      sgst: "",
      tax_rate: "0",
      category: "",
      price_type: "fixed",
      unit: "piece",
      image_url: "",
      is_inclusive: true,
    });
    setEditingProduct(null);
    setSelectedBarcode("");
  };

  const fetchHsnGst = async (hsnCode: string) => {
    try {
      if (!hsnCode || hsnCode.length < 4) {
        toast.error("Please enter at least 4 digits of HSN code");
        return;
      }

      const { data, error } = await supabase
        .from('hsn_codes')
        .select('*')
        .eq('hsn_code', hsnCode.substring(0, 4))
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const gstRate = parseFloat(data.gst_rate.toString());
        const cgst = gstRate / 2;
        const sgst = gstRate / 2;
        
        setFormData(prev => ({
          ...prev,
          cgst: cgst.toString(),
          sgst: sgst.toString(),
          product_tax: gstRate.toString()
        }));
        
        toast.success(`GST Rate Found: ${gstRate}% (CGST: ${cgst}%, SGST: ${sgst}%)`);
      } else {
        toast.warning("HSN code not found in database. Please enter GST manually or try Search button.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Error fetching HSN data");
    }
  };

  if (pageLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <LoadingSpinner size="lg" text="Loading inventory..." />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold">Inventory</h1>
          
          
          {!isOnline && (
            <span className="ml-auto bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm">
              Offline
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 overflow-x-hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <BulkProductImport onImportComplete={fetchProducts} />
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Item" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="barcode">Barcode / SKU</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => {
                      setFormData({ ...formData, barcode: e.target.value });
                      setSelectedBarcode(e.target.value);
                    }}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>


                {/* Image - only for products */}
                {viewType === "products" && (
                  <div>
                    <Label htmlFor="image">Product Image (Max 2MB)</Label>
                    <div className="relative">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error("Image size must be less than 2MB");
                              e.target.value = "";
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, image_url: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {formData.image_url && (
                        <div className="relative inline-block mt-2">
                          <img src={formData.image_url} alt="Preview" className="w-20 h-20 object-cover rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => setFormData({ ...formData, image_url: "" })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional: Upload image for modern billing view
                    </p>
                  </div>
                )}

                {/* Category - only for products */}
                {viewType === "products" && (
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Price Type - only for products */}
                {viewType === "products" && (
                  <div>
                    <Label htmlFor="price_type">Price Type</Label>
                    <Select
                      value={formData.price_type}
                      onValueChange={(value) => {
                        if (value === 'weight') {
                          setFormData({ ...formData, price_type: value, unit: 'kg' });
                        } else {
                          setFormData({ ...formData, price_type: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="weight">Weight Based (per kg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Price Fields - different for raw materials */}
                {viewType === "raw_materials" ? (
                  // Raw Materials - only buying price needed (no selling price)
                  <div>
                    <Label htmlFor="buying_price">Purchase Price (₹)</Label>
                    <Input
                      id="buying_price"
                      type="number"
                      step="0.01"
                      value={formData.buying_price}
                      onChange={(e) => setFormData({ ...formData, buying_price: e.target.value, price: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Cost price for internal tracking</p>
                  </div>
                ) : (
                  // Products - hide buying price in restaurant mode
                  isRestaurant ? (
                    <div>
                      <Label htmlFor="price">Selling Price (₹{formData.price_type === 'weight' ? '/kg' : ''})</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="buying_price">Buying Price (₹{formData.price_type === 'weight' ? '/kg' : ''})</Label>
                        <Input
                          id="buying_price"
                          type="number"
                          step="0.01"
                          value={formData.buying_price}
                          onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Selling Price (₹{formData.price_type === 'weight' ? '/kg' : ''})</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )
                )}

                {/* Stock and Low Stock Alert */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      step="0.001"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="low_stock">Low Stock Alert</Label>
                    <Input
                      id="low_stock"
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    disabled={viewType === "products" && formData.price_type === 'weight'}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="litre">Litre</SelectItem>
                      <SelectItem value="gram">Gram (g)</SelectItem>
                      <SelectItem value="ml">Millilitre (ml)</SelectItem>
                      <SelectItem value="meter">Meter (m)</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="packet">Packet</SelectItem>
                      <SelectItem value="dozen">Dozen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* HSN, Tax fields - only for products */}
                {viewType === "products" && (
                  <>
                    <div>
                      <Label htmlFor="hsn">HSN Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="hsn"
                          value={formData.hsn_code}
                          onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                          placeholder="e.g., 1234567"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fetchHsnGst(formData.hsn_code)}
                          className="whitespace-nowrap"
                        >
                          Fetch GST
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (formData.hsn_code) {
                              window.open(`https://cleartax.in/s/gst-hsn-lookup?query=${formData.hsn_code}`, '_blank');
                            } else {
                              toast.error("Please enter HSN code first");
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          Search
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="product_tax">Product Tax (%)</Label>
                      <Input
                        id="product_tax"
                        type="number"
                        step="0.01"
                        value={formData.product_tax}
                        onChange={(e) => {
                          const taxVal = e.target.value;
                          if (taxVal) {
                            const totalTax = parseFloat(taxVal) || 0;
                            const halfTax = (totalTax / 2).toFixed(2);
                            setFormData(prev => ({
                              ...prev,
                              product_tax: taxVal,
                              cgst: halfTax,
                              sgst: halfTax
                            }));
                          } else {
                            setFormData({ ...formData, product_tax: taxVal });
                          }
                        }}
                        placeholder="Auto-splits into CGST+SGST"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cgst">CGST (%)</Label>
                        <Input
                          id="cgst"
                          type="number"
                          step="0.01"
                          value={formData.cgst}
                          onChange={(e) => {
                            const cgstVal = e.target.value;
                            if (cgstVal && formData.sgst) {
                              const total = (parseFloat(cgstVal) || 0) + (parseFloat(formData.sgst) || 0);
                              setFormData(prev => ({ ...prev, cgst: cgstVal, product_tax: total.toString() }));
                            } else {
                              setFormData({ ...formData, cgst: cgstVal });
                            }
                          }}
                          placeholder="e.g., 9"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sgst">SGST (%)</Label>
                        <Input
                          id="sgst"
                          type="number"
                          step="0.01"
                          value={formData.sgst}
                          onChange={(e) => {
                            const sgstVal = e.target.value;
                            if (sgstVal && formData.cgst) {
                              const total = (parseFloat(formData.cgst) || 0) + (parseFloat(sgstVal) || 0);
                              setFormData(prev => ({ ...prev, sgst: sgstVal, product_tax: total.toString() }));
                            } else {
                              setFormData({ ...formData, sgst: sgstVal });
                            }
                          }}
                          placeholder="e.g., 9"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Per-product tax inclusion toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="is_inclusive">Tax Included in Price</Label>
                    <p className="text-xs text-muted-foreground">On: selling price includes GST · Off: GST added on top of price</p>
                  </div>
                  <Switch
                    id="is_inclusive"
                    checked={formData.is_inclusive}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_inclusive: checked })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProduct 
                    ? `Update ${viewType === "raw_materials" ? "Material" : "Product"}` 
                    : `Add ${viewType === "raw_materials" ? "Material" : "Product"}`
                  }
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === "All" ? "default" : "outline"}
            onClick={() => setSelectedCategory("All")}
            className="whitespace-nowrap"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.name)}
              className="whitespace-nowrap"
            >
              {category.name}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              {viewType === "raw_materials" ? "Raw Materials" : "Products"} ({totalCount})
            </CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              Tax inclusion is set per product
            </span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Name</TableHead>
                    {viewType === "products" && <TableHead>Category</TableHead>}
                    {viewType === "products" && <TableHead>Selling Price (MRP)</TableHead>}
                    {/* Hide Buying Price in restaurant mode for products */}
                    {(viewType === "raw_materials" || !isRestaurant) && (
                      <TableHead>{viewType === "raw_materials" ? "Purchase Price" : "Buying Price"}</TableHead>
                    )}
                    {/* Hide Profit column in restaurant mode */}
                    {viewType === "products" && !isRestaurant && <TableHead>Profit</TableHead>}
                    {/* Hide Margin column in restaurant mode */}
                    {viewType === "products" && !isRestaurant && <TableHead>Margin %</TableHead>}
                    <TableHead>Stock</TableHead>
                    {viewType === "raw_materials" && <TableHead>Stock Value</TableHead>}
                    {viewType === "products" && <TableHead>Tax Rate</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.barcode}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      {viewType === "products" && <TableCell>{product.category || '-'}</TableCell>}
                      {viewType === "products" && (
                        <TableCell>
                          ₹{product.price.toFixed(2)}
                          {product.price_type === 'weight' && '/kg'}
                        </TableCell>
                      )}
                      {/* Hide Buying Price in restaurant mode for products */}
                      {(viewType === "raw_materials" || !isRestaurant) && (
                        <TableCell>₹{((product as any).buying_price || 0).toFixed(2)}</TableCell>
                      )}
                      {/* Hide Profit column in restaurant mode */}
                      {viewType === "products" && !isRestaurant && (
                        <TableCell>
                          {(() => {
                            const taxRate = product.tax_rate || 0;
                            const buyingPrice = (product as any).buying_price || 0;
                            const basePrice = ((product as any).is_inclusive ?? true) && taxRate > 0 
                              ? product.price / (1 + taxRate / 100) 
                              : product.price;
                            const profit = basePrice - buyingPrice;
                            const profitColor = profit >= 0 ? 'text-green-600' : 'text-red-600';
                            return (
                              <span className={profitColor}>
                                ₹{profit.toFixed(2)}
                              </span>
                            );
                          })()}
                        </TableCell>
                      )}
                      {/* Hide Margin column in restaurant mode */}
                      {viewType === "products" && !isRestaurant && (
                        <TableCell>
                          {(() => {
                            const taxRate = product.tax_rate || 0;
                            const buyingPrice = (product as any).buying_price || 0;
                            const basePrice = ((product as any).is_inclusive ?? true) && taxRate > 0 
                              ? product.price / (1 + taxRate / 100) 
                              : product.price;
                            const profit = basePrice - buyingPrice;
                            
                            if (buyingPrice <= 0) return <span className="text-muted-foreground">-</span>;
                            
                            const margin = (profit / buyingPrice) * 100;
                            const marginColor = margin >= 20 ? 'text-green-600' : margin >= 0 ? 'text-amber-600' : 'text-red-600';
                            return (
                              <span className={marginColor}>
                                {margin.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </TableCell>
                      )}
                      <TableCell>
                        {product.stock_quantity} {(product as any).unit || 'piece'}
                      </TableCell>
                      {viewType === "raw_materials" && (
                        <TableCell className="font-medium text-blue-600">
                          ₹{((product.stock_quantity || 0) * ((product as any).buying_price || 0)).toFixed(2)}
                        </TableCell>
                      )}
                      {viewType === "products" && <TableCell>{product.tax_rate}%</TableCell>}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setProductToDelete(product.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={viewType === "raw_materials" ? 6 : (isRestaurant ? 7 : 10)} className="text-center py-8 text-muted-foreground">
                        No {viewType === "raw_materials" ? "raw materials" : "products"} found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / PAGE_SIZE)}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Inventory;
