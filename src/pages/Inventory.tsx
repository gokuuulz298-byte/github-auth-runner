import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Search, Barcode, Info, Loader2, X } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveProductsToIndexedDB, getAllProducts, deleteProductFromIndexedDB } from "@/lib/indexedDB";
import BulkProductImport from "@/components/BulkProductImport";

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
}

const Inventory = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [viewType, setViewType] = useState<"products" | "raw_materials">("products");

  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    tamil_name: "",
    price: "",
    buying_price: "",
    stock_quantity: "",
    low_stock_threshold: "10",
    hsn_code: "",
    product_tax: "",
    cgst: "",
    sgst: "",
    tax_rate: "",
    category: "",
    price_type: "fixed",
    unit: "piece",
    image_url: "",
    is_raw_material: false,
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && userId) {
      Promise.all([fetchProducts(), fetchCategories(), fetchBillingSettings()]).finally(() => {
        setPageLoading(false);
      });
    }
  }, [authLoading, userId]);

  const fetchBillingSettings = async () => {
    try {
      const { data } = await supabase
        .from('company_profiles')
        .select('billing_settings')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data?.billing_settings) {
        setBillingSettings(data.billing_settings as BillingSettings);
      }
    } catch (error) {
      console.error(error);
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

  useEffect(() => {
    let filtered = products;
    
    // Filter by view type (Products vs Raw Materials)
    filtered = filtered.filter(product => {
      const isRaw = (product as any).is_raw_material || false;
      return viewType === "raw_materials" ? isRaw : !isRaw;
    });
    
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
  }, [searchQuery, products, selectedCategory, viewType]);

  const getCategoryCount = (category: string) => {
    const typeFiltered = products.filter(p => {
      const isRaw = (p as any).is_raw_material || false;
      return viewType === "raw_materials" ? isRaw : !isRaw;
    });
    if (category === "All") return typeFiltered.length;
    return typeFiltered.filter(p => p.category === category).length;
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
        if (!userId) {
          toast.error("Please sign in to view products");
          return;
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('created_by', userId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setProducts(data || []);
        await saveProductsToIndexedDB(data || []);
      } else {
        const localProducts = await getAllProducts();
        setProducts(localProducts);
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
        tamil_name: formData.tamil_name || null,
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
        is_raw_material: formData.is_raw_material || viewType === "raw_materials",
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
      tamil_name: (product as any).tamil_name || "",
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
      is_raw_material: (product as any).is_raw_material || false,
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
      tamil_name: "",
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
      is_raw_material: viewType === "raw_materials",
    });
    setEditingProduct(null);
    setSelectedBarcode("");
  };

  // Transliterate product name to Tamil phonetically (NOT translate)
  const transliterateToTamil = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter product name first");
      return;
    }

    setIsTranslating(true);
    try {
      // Phonetic transliteration map for common sounds
      const transliterationRules: { [key: string]: string } = {
        // Double vowels first
        'aa': 'ஆ', 'ee': 'ஈ', 'ii': 'ஈ', 'oo': 'ஊ', 'uu': 'ஊ', 'ai': 'ஐ', 'au': 'ஔ',
        // Consonant + vowel combinations
        'ka': 'கா', 'ki': 'கி', 'ku': 'கு', 'ke': 'கே', 'ko': 'கோ',
        'ga': 'கா', 'gi': 'கி', 'gu': 'கு', 'ge': 'கே', 'go': 'கோ',
        'cha': 'சா', 'chi': 'சி', 'chu': 'சு', 'che': 'சே', 'cho': 'சோ',
        'ja': 'ஜா', 'ji': 'ஜி', 'ju': 'ஜு', 'je': 'ஜே', 'jo': 'ஜோ',
        'ta': 'டா', 'ti': 'டி', 'tu': 'டு', 'te': 'டே', 'to': 'டோ',
        'tha': 'தா', 'thi': 'தி', 'thu': 'து', 'the': 'தே', 'tho': 'தோ',
        'da': 'டா', 'di': 'டி', 'du': 'டு', 'de': 'டே', 'do': 'டோ',
        'na': 'நா', 'ni': 'நி', 'nu': 'நு', 'ne': 'நே', 'no': 'நோ',
        'pa': 'பா', 'pi': 'பி', 'pu': 'பு', 'pe': 'பே', 'po': 'போ',
        'ba': 'பா', 'bi': 'பி', 'bu': 'பு', 'be': 'பே', 'bo': 'போ',
        'ma': 'மா', 'mi': 'மி', 'mu': 'மு', 'me': 'மே', 'mo': 'மோ',
        'ya': 'யா', 'yi': 'யி', 'yu': 'யு', 'ye': 'யே', 'yo': 'யோ',
        'ra': 'ரா', 'ri': 'ரி', 'ru': 'ரு', 're': 'ரே', 'ro': 'ரோ',
        'la': 'லா', 'li': 'லி', 'lu': 'லு', 'le': 'லே', 'lo': 'லோ',
        'va': 'வா', 'vi': 'வி', 'vu': 'வு', 've': 'வே', 'vo': 'வோ',
        'sa': 'சா', 'si': 'சி', 'su': 'சு', 'se': 'சே', 'so': 'சோ',
        'sha': 'ஷா', 'shi': 'ஷி', 'shu': 'ஷு', 'she': 'ஷே', 'sho': 'ஷோ',
        'ha': 'ஹா', 'hi': 'ஹி', 'hu': 'ஹு', 'he': 'ஹே', 'ho': 'ஹோ',
        'fa': 'ஃபா', 'fi': 'ஃபி', 'fu': 'ஃபு', 'fe': 'ஃபே', 'fo': 'ஃபோ',
        // Single consonants
        'k': 'க்', 'g': 'க்', 'c': 'ச்', 'j': 'ஜ்', 't': 'ட்', 'd': 'ட்',
        'n': 'ந்', 'p': 'ப்', 'b': 'ப்', 'm': 'ம்', 'y': 'ய்', 'r': 'ர்',
        'l': 'ல்', 'v': 'வ்', 'w': 'வ்', 's': 'ஸ்', 'h': 'ஹ்', 'f': 'ஃப்',
        // Vowels
        'a': 'அ', 'i': 'இ', 'u': 'உ', 'e': 'எ', 'o': 'ஒ',
        // Common words transliterated (phonetic - how they sound)
        'milk': 'மில்க்', 'nice': 'நைஸ்', 'aavin': 'ஆவின்', 'amul': 'அமுல்',
        'biscuit': 'பிஸ்கட்', 'bread': 'பிரெட்', 'butter': 'பட்டர்',
        'chocolate': 'சாக்லேட்', 'coffee': 'காஃபி', 'tea': 'டீ',
        'rice': 'ரைஸ்', 'sugar': 'சுகர்', 'salt': 'சால்ட்',
      };
      
      // Process each word in the name
      const words = formData.name.toLowerCase().split(/\s+/);
      const transliteratedWords: string[] = [];
      
      for (const word of words) {
        // Check if word exists in map
        if (transliterationRules[word]) {
          transliteratedWords.push(transliterationRules[word]);
          continue;
        }
        
        // Character-by-character transliteration
        let result = '';
        let i = 0;
        while (i < word.length) {
          let matched = false;
          // Try 3, 2, 1 character matches
          for (let len = 3; len >= 1; len--) {
            const substr = word.substring(i, i + len);
            if (transliterationRules[substr]) {
              result += transliterationRules[substr];
              i += len;
              matched = true;
              break;
            }
          }
          if (!matched) {
            result += word[i];
            i++;
          }
        }
        transliteratedWords.push(result);
      }
      
      const tamilName = transliteratedWords.join(' ');
      setFormData({ ...formData, tamil_name: tamilName });
      toast.success("Transliterated to Tamil successfully!");
    } catch (error) {
      console.error("Transliteration error:", error);
      toast.error("Transliteration failed. Please enter manually.");
    } finally {
      setIsTranslating(false);
    }
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

  const getTaxMode = () => {
    const mode = billingSettings?.ModernBilling?.mode || billingSettings?.ManualBilling?.mode || 'inclusive';
    const billType = billingSettings?.ModernBilling?.inclusiveBillType || billingSettings?.ManualBilling?.inclusiveBillType || 'split';
    return { mode, billType };
  };

  const { mode: taxMode, billType } = getTaxMode();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold">Inventory</h1>
          
          {/* Products / Raw Materials Switcher */}
          <div className="flex border rounded-lg p-1 bg-muted/50 ml-2">
            <Button
              variant={viewType === "products" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("products")}
              className="h-7 px-3 text-xs"
            >
              Products
            </Button>
            <Button
              variant={viewType === "raw_materials" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("raw_materials")}
              className="h-7 px-3 text-xs"
            >
              Raw Materials
            </Button>
          </div>
          
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
                Add {viewType === "raw_materials" ? "Raw Material" : "Product"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Item" : `Add New ${viewType === "raw_materials" ? "Raw Material" : "Product"}`}
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
                  <Label htmlFor="tamil_name">Tamil Name (தமிழ் பெயர்)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tamil_name"
                      value={formData.tamil_name}
                      onChange={(e) => setFormData({ ...formData, tamil_name: e.target.value })}
                      placeholder="தமிழில் பெயர் உள்ளிடவும்"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={transliterateToTamil}
                      disabled={isTranslating || !formData.name.trim()}
                      className="whitespace-nowrap"
                    >
                      {isTranslating ? "Converting..." : "Auto Transliterate"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For bilingual bills - enter Tamil name or use Auto Transliterate (phonetic: milk = மில்க்)
                  </p>
                </div>

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
                    onValueChange={(value) => {
                      // If weight based, auto-set unit to kg
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
                    <Label htmlFor="low_stock">Low Stock Alert Threshold</Label>
                    <Input
                      id="low_stock"
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                      placeholder="10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Alert when stock falls below</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="unit">Unit {formData.price_type === 'weight' && <span className="text-xs text-muted-foreground">(Auto: kg for weight-based)</span>}</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    disabled={formData.price_type === 'weight'}
                  >
                    <SelectTrigger id="unit" className={formData.price_type === 'weight' ? 'bg-muted' : ''}>
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              {viewType === "raw_materials" ? "Raw Materials" : "Products"} ({filteredProducts.length})
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md cursor-help">
                    <Info className="h-3 w-3" />
                    <span>Tax Mode: {taxMode === 'inclusive' ? 'Inclusive' : 'Exclusive'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Profit & Margin Calculation</p>
                  {taxMode === 'inclusive' ? (
                    <div className="text-xs space-y-1">
                      <p><strong>Inclusive GST:</strong> MRP includes tax</p>
                      <p>• Base Price = MRP ÷ (1 + Tax%)</p>
                      <p>• Profit = Base Price − Buying Price</p>
                      <p>• Margin = (Profit ÷ Buying Price) × 100</p>
                    </div>
                  ) : (
                    <div className="text-xs space-y-1">
                      <p><strong>Exclusive GST:</strong> Tax added on top</p>
                      <p>• Profit = Selling Price − Buying Price</p>
                      <p>• Margin = (Profit ÷ Buying Price) × 100</p>
                    </div>
                  )}
                  <p className="text-[10px] mt-2 text-muted-foreground">Change this in Profile → Billing Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Selling Price (MRP)</TableHead>
                    <TableHead>Buying Price</TableHead>
                    <TableHead className="flex items-center gap-1">
                      Profit
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {taxMode === 'inclusive' 
                              ? 'Base Price (excl. tax) − Buying Price' 
                              : 'Selling Price − Buying Price'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead>Margin %</TableHead>
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
                      <TableCell>
                        {/* Profit calculation based on tax mode */}
                        {(() => {
                          const taxRate = product.tax_rate || 0;
                          const buyingPrice = (product as any).buying_price || 0;
                          // For inclusive: Base price = MRP / (1 + Tax%)
                          // For exclusive: Base price = Selling Price directly
                          const basePrice = taxMode === 'inclusive' && taxRate > 0 
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
                      <TableCell>
                        {/* Profit Margin % = (Profit / Buying Price) × 100 */}
                        {(() => {
                          const taxRate = product.tax_rate || 0;
                          const buyingPrice = (product as any).buying_price || 0;
                          const basePrice = taxMode === 'inclusive' && taxRate > 0 
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
                      <TableCell>
                        {product.stock_quantity} {(product as any).unit || 'piece'}
                      </TableCell>
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
