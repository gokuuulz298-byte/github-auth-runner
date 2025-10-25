import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Barcode } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveProductsToIndexedDB, getAllProducts, deleteProductFromIndexedDB } from "@/lib/indexedDB";

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

const Inventory = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    price: "",
    buying_price: "",
    stock_quantity: "",
    hsn_code: "",
    product_tax: "",
    cgst: "",
    sgst: "",
    tax_rate: "",
    category: "",
    price_type: "fixed",
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery)
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, products, selectedCategory]);

  const getCategoryCount = (category: string) => {
    if (category === "All") return products.length;
    return products.filter(p => p.category === category).length;
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setProducts(data || []);
        await saveProductsToIndexedDB(data || []);
      } else {
        const localProducts = await getAllProducts();
        setProducts(localProducts);
      }
    } catch (error) {
      toast.error("Error fetching products");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      toast.error("You need to be online to add/edit products");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const cgst = parseFloat(formData.cgst) || 0;
      const sgst = parseFloat(formData.sgst) || 0;
      const productTax = parseFloat(formData.product_tax) || 0;
      
      // Calculate total tax: if cgst and sgst are provided, use their sum, otherwise use product_tax
      const totalTax = (cgst > 0 || sgst > 0) ? (cgst + sgst) : productTax;

      const productData = {
        barcode: formData.barcode,
        name: formData.name,
        price: parseFloat(formData.price),
        buying_price: parseFloat(formData.buying_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity),
        hsn_code: formData.hsn_code || null,
        product_tax: totalTax,
        cgst: cgst,
        sgst: sgst,
        tax_rate: totalTax, // Keep tax_rate in sync with product_tax for backwards compatibility
        category: formData.category || null,
        price_type: formData.price_type,
        created_by: user.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success("Product updated successfully!");
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success("Product added successfully!");
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Error saving product");
      console.error(error);
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
      hsn_code: (product as any).hsn_code || "",
      product_tax: (product as any).product_tax?.toString() || "0",
      cgst: (product as any).cgst?.toString() || "0",
      sgst: (product as any).sgst?.toString() || "0",
      tax_rate: product.tax_rate.toString(),
      category: product.category || "",
      price_type: product.price_type || "fixed",
    });
    setSelectedBarcode(product.barcode);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isOnline) {
      toast.error("You need to be online to delete products");
      return;
    }

    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await deleteProductFromIndexedDB(id);
      toast.success("Product deleted successfully!");
      fetchProducts();
    } catch (error) {
      toast.error("Error deleting product");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      barcode: "",
      name: "",
      price: "",
      buying_price: "",
      stock_quantity: "",
      hsn_code: "",
      product_tax: "",
      cgst: "",
      sgst: "",
      tax_rate: "0",
      category: "",
      price_type: "fixed",
    });
    setSelectedBarcode("");
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          {!isOnline && (
            <span className="ml-auto bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm">
              Offline Mode
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
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
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="barcode">Barcode</Label>
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

                <div>
                  <Label htmlFor="price_type">Price Type</Label>
                  <Select
                    value={formData.price_type}
                    onValueChange={(value) => setFormData({ ...formData, price_type: value })}
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
                <div>
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    required
                  />
                </div>

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
                      onClick={async () => {
                        if (!formData.hsn_code) {
                          toast.error("Please enter HSN code first");
                          return;
                        }
                        // Auto-fetch GST rates based on HSN code
                        toast.info("Fetching GST rates...");
                        // Common HSN code to GST mapping (you can expand this)
                        const hsnGstMap: Record<string, { cgst: number; sgst: number }> = {
                          '1001': { cgst: 0, sgst: 0 },    // Wheat
                          '1006': { cgst: 0, sgst: 0 },    // Rice
                          '0401': { cgst: 0, sgst: 0 },    // Milk
                          '1701': { cgst: 2.5, sgst: 2.5 }, // Sugar
                          '2106': { cgst: 9, sgst: 9 },    // Food preparations
                          '3304': { cgst: 9, sgst: 9 },    // Beauty products
                          '8517': { cgst: 9, sgst: 9 },    // Mobile phones
                          '6403': { cgst: 2.5, sgst: 2.5 }, // Footwear
                          '6203': { cgst: 2.5, sgst: 2.5 }, // Garments
                          '8471': { cgst: 9, sgst: 9 },    // Computers
                          '8528': { cgst: 14, sgst: 14 },  // TVs
                          '8704': { cgst: 14, sgst: 14 },  // Vehicles
                        };
                        
                        const hsnPrefix = formData.hsn_code.substring(0, 4);
                        const gstRates = hsnGstMap[hsnPrefix];
                        
                        if (gstRates) {
                          setFormData(prev => ({
                            ...prev,
                            cgst: gstRates.cgst.toString(),
                            sgst: gstRates.sgst.toString(),
                            product_tax: (gstRates.cgst + gstRates.sgst).toString()
                          }));
                          toast.success(`GST rates fetched: CGST ${gstRates.cgst}%, SGST ${gstRates.sgst}%`);
                        } else {
                          toast.warning("HSN code not in database. Please enter GST manually or use Search button.");
                        }
                      }}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    "Fetch GST" auto-fills rates, "Search" opens lookup website
                  </p>
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
                      setFormData({ ...formData, product_tax: taxVal });
                      // Auto-split tax equally into CGST and SGST
                      if (taxVal) {
                        const totalTax = parseFloat(taxVal) || 0;
                        const halfTax = (totalTax / 2).toFixed(2);
                        setFormData(prev => ({
                          ...prev,
                          product_tax: taxVal,
                          cgst: halfTax,
                          sgst: halfTax
                        }));
                      }
                    }}
                    placeholder="Auto-splits into CGST+SGST"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter total tax % - it will auto-split equally into CGST and SGST
                  </p>
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
                        setFormData({ ...formData, cgst: cgstVal });
                        // Auto calculate product_tax if both cgst and sgst are provided
                        if (cgstVal && formData.sgst) {
                          const total = (parseFloat(cgstVal) || 0) + (parseFloat(formData.sgst) || 0);
                          setFormData(prev => ({ ...prev, cgst: cgstVal, product_tax: total.toString() }));
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
                        setFormData({ ...formData, sgst: sgstVal });
                        // Auto calculate product_tax if both cgst and sgst are provided
                        if (sgstVal && formData.cgst) {
                          const total = (parseFloat(formData.cgst) || 0) + (parseFloat(sgstVal) || 0);
                          setFormData(prev => ({ ...prev, sgst: sgstVal, product_tax: total.toString() }));
                        }
                      }}
                      placeholder="e.g., 9"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  If CGST + SGST are entered, total tax will be auto-calculated (e.g., 9% + 9% = 18%)
                </p>
                <Button type="submit" className="w-full">
                  {editingProduct ? "Update Product" : "Add Product"}
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
            All ({getCategoryCount("All")})
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.name)}
              className="whitespace-nowrap"
            >
              {category.name} ({getCategoryCount(category.name)})
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Buying Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Tax Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.barcode}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>
                        ₹{product.price.toFixed(2)}
                        {product.price_type === 'weight' && '/kg'}
                      </TableCell>
                      <TableCell>₹{((product as any).buying_price || 0).toFixed(2)}</TableCell>
                      <TableCell>{product.stock_quantity}</TableCell>
                      <TableCell>{product.tax_rate}%</TableCell>
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
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Inventory;
