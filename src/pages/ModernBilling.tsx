import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import ShoppingCart, { CartItem } from "@/components/ShoppingCart";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIndianNumber } from "@/lib/numberFormat";
import { setCounterSession, getCounterSession } from "@/lib/counterSession";
import { saveInvoiceToIndexedDB } from "@/lib/indexedDB";
import jsPDF from "jspdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ModernBilling = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [counters, setCounters] = useState<any[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>("");
  const [additionalGstRate, setAdditionalGstRate] = useState<string>("");
  const [coupons, setCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<string>("");
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [productDiscounts, setProductDiscounts] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [intraStateTrade, setIntraStateTrade] = useState<boolean>(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [productQuantities, setProductQuantities] = useState<{ [key: string]: number }>({});

  // Initialize counter session
  useEffect(() => {
    const session = getCounterSession();
    if (session) {
      setSelectedCounter(session.counterId);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchCompanyProfile();
    fetchCounters();
    fetchCoupons();
    fetchProductDiscounts();
    fetchActiveTemplate();
    fetchTemplates();
  }, []);

  // Fetch products when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory);
    } else {
      setProducts([]);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      if (data && data.length > 0) {
        setSelectedCategory(data[0].name);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async (category: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', user.id)
        .eq('category', category)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCompanyProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setCompanyProfile(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCounters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;
      setCounters(data || []);
      if (data && data.length > 0) {
        const session = getCounterSession();
        if (session && data.find(c => c.id === session.counterId)) {
          setSelectedCounter(session.counterId);
        } else {
          setSelectedCounter(data[0].id);
          setCounterSession(data[0].id, data[0].name);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProductDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_discounts')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setProductDiscounts(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchActiveTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bill_templates')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setActiveTemplate(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bill_templates')
        .select('*')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplate(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToCart = (product: any, quantity: number = 1) => {
    const discount = productDiscounts.find(
      d => d.product_id === product.id && 
      new Date(d.start_date) <= new Date() && 
      new Date(d.end_date) >= new Date()
    );

    const discountPercentage = discount ? Number(discount.discount_percentage) : 0;
    const priceAfterDiscount = Number(product.price) * (1 - discountPercentage / 100);

    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: priceAfterDiscount,
        quantity: quantity,
        tax_rate: 0,
        cgst: Number(product.cgst) || 0,
        sgst: Number(product.sgst) || 0,
        price_type: product.price_type || 'quantity',
        barcode: product.barcode || ''
      };
      setCartItems([...cartItems, newItem]);
    }
    toast.success(`${product.name} added to cart`);
    setProductQuantities({ ...productQuantities, [product.id]: 1 });
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
    toast.success("Item removed from cart");
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const productTaxAmount = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const cgst = (itemTotal * item.cgst) / 100;
      const sgst = (itemTotal * item.sgst) / 100;
      return sum + cgst + sgst;
    }, 0);

    const subtotalWithProductTax = subtotal + productTaxAmount;

    const coupon = coupons.find(c => c.id === selectedCoupon);
    let couponDiscountAmount = 0;
    if (coupon) {
      if (coupon.discount_type === 'percentage') {
        couponDiscountAmount = (subtotalWithProductTax * Number(coupon.discount_value)) / 100;
      } else {
        couponDiscountAmount = Number(coupon.discount_value);
      }
    }

    const afterCouponDiscount = subtotalWithProductTax - couponDiscountAmount;

    const additionalTaxAmount = additionalGstRate 
      ? (afterCouponDiscount * Number(additionalGstRate)) / 100 
      : 0;

    const total = afterCouponDiscount + additionalTaxAmount;

    return {
      subtotal,
      productTaxAmount,
      subtotalWithProductTax,
      couponDiscountAmount,
      afterCouponDiscount,
      additionalTaxAmount,
      total
    };
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!selectedCounter) {
      toast.error("Please select a counter");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      const totals = calculateTotals();
      const billNumber = `INV-${Date.now()}`;

      // Update stock quantities
      for (const item of cartItems) {
        const product = products.find(p => p.id === item.id);
        if (product && product.stock_quantity !== null) {
          const newStock = Number(product.stock_quantity) - item.quantity;
          await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.id);
        }
      }

      // Save invoice
      const invoiceData = {
        bill_number: billNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items_data: JSON.parse(JSON.stringify(cartItems)),
        total_amount: totals.total,
        tax_amount: totals.productTaxAmount + totals.additionalTaxAmount,
        discount_amount: totals.couponDiscountAmount,
        created_by: user.id,
        counter_id: selectedCounter,
        customer_id: null
      };

      const { error } = await supabase
        .from('invoices')
        .insert([invoiceData]);

      if (error) throw error;

      // Update or create loyalty points
      if (customerPhone) {
        const pointsToAdd = Math.floor(totals.total / 100);
        
        const { data: existingLoyalty, error: fetchError } = await supabase
          .from('loyalty_points')
          .select('*')
          .eq('customer_phone', customerPhone)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (existingLoyalty) {
          await supabase
            .from('loyalty_points')
            .update({
              points: Number(existingLoyalty.points) + pointsToAdd,
              total_spent: Number(existingLoyalty.total_spent) + totals.total,
              customer_name: customerName || existingLoyalty.customer_name
            })
            .eq('id', existingLoyalty.id);
        } else {
          await supabase
            .from('loyalty_points')
            .insert({
              customer_phone: customerPhone,
              customer_name: customerName,
              points: pointsToAdd,
              total_spent: totals.total,
              created_by: user.id
            });
        }
      }

      // Generate and download PDF
      await generatePDF(billNumber, totals);

      toast.success("Sale completed successfully!");
      
      // Reset form
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedCoupon("");
      setAdditionalGstRate("");
      setProductQuantities({});
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to complete sale");
    }
  };

  const generatePDF = async (billNumber: string, totals: any) => {
    const template = templates.find(t => t.id === selectedTemplate) || templates[0];
    if (!template) return;

    const doc = new jsPDF();
    const templateData = template.template_data;

    // Background
    if (templateData.background) {
      doc.setFillColor(templateData.background);
      doc.rect(0, 0, 210, 297, 'F');
    }

    // Header
    doc.setFontSize(24);
    doc.setTextColor(templateData.headerText || '#000000');
    doc.text(companyProfile?.company_name || 'Company Name', 105, 20, { align: 'center' });

    // Company details
    doc.setFontSize(10);
    doc.setTextColor(templateData.textColor || '#000000');
    if (companyProfile?.address) doc.text(companyProfile.address, 105, 30, { align: 'center' });
    if (companyProfile?.phone) doc.text(`Phone: ${companyProfile.phone}`, 105, 35, { align: 'center' });
    if (companyProfile?.email) doc.text(`Email: ${companyProfile.email}`, 105, 40, { align: 'center' });
    if (companyProfile?.gstin) doc.text(`GSTIN: ${companyProfile.gstin}`, 105, 45, { align: 'center' });

    // Invoice details
    doc.setFontSize(12);
    doc.text(`Invoice: ${billNumber}`, 20, 60);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 65);
    if (customerName) doc.text(`Customer: ${customerName}`, 20, 70);
    if (customerPhone) doc.text(`Phone: ${customerPhone}`, 20, 75);

    // Items table
    let yPos = 90;
    doc.setFontSize(10);
    doc.text('Item', 20, yPos);
    doc.text('Qty', 120, yPos);
    doc.text('Price', 145, yPos);
    doc.text('Total', 170, yPos);
    
    yPos += 7;
    cartItems.forEach(item => {
      doc.text(item.name, 20, yPos);
      doc.text(item.quantity.toString(), 120, yPos);
      doc.text(`₹${formatIndianNumber(Number(item.price.toFixed(2)))}`, 145, yPos);
      doc.text(`₹${formatIndianNumber(Number((item.price * item.quantity).toFixed(2)))}`, 170, yPos);
      yPos += 7;
    });

    // Totals
    yPos += 10;
    doc.text(`Subtotal: ₹${formatIndianNumber(Number(totals.subtotal.toFixed(2)))}`, 145, yPos);
    yPos += 7;
    doc.text(`Product Tax: ₹${formatIndianNumber(Number(totals.productTaxAmount.toFixed(2)))}`, 145, yPos);
    yPos += 7;
    if (totals.couponDiscountAmount > 0) {
      doc.text(`Discount: -₹${formatIndianNumber(Number(totals.couponDiscountAmount.toFixed(2)))}`, 145, yPos);
      yPos += 7;
    }
    if (totals.additionalTaxAmount > 0) {
      doc.text(`Additional Tax: ₹${formatIndianNumber(Number(totals.additionalTaxAmount.toFixed(2)))}`, 145, yPos);
      yPos += 7;
    }
    doc.setFontSize(12);
    doc.text(`Total: ₹${formatIndianNumber(Number(totals.total.toFixed(2)))}`, 145, yPos);

    // Footer
    if (companyProfile?.thank_you_note) {
      doc.setFontSize(10);
      doc.text(companyProfile.thank_you_note, 105, 280, { align: 'center' });
    }

    doc.save(`${billNumber}.pdf`);
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">Modern Billing</h1>
          </div>
          <div className="w-48">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select Template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Categories */}
        <div className="w-16 sm:w-20 md:w-48 border-r bg-card flex-shrink-0 overflow-y-auto">
          <div className="p-1 sm:p-2 md:p-4 space-y-1 sm:space-y-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.name ? "default" : "outline"}
                className="w-full justify-center md:justify-start text-[10px] sm:text-xs md:text-sm h-auto py-2 sm:py-2 md:py-3 px-1 sm:px-2 md:px-4"
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="truncate">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content - Products Grid & Cart */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-4">{selectedCategory}</h2>
              
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No products in this category
                </p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  {products.map((product) => {
                    const discount = productDiscounts.find(
                      d => d.product_id === product.id && 
                      new Date(d.start_date) <= new Date() && 
                      new Date(d.end_date) >= new Date()
                    );
                    const discountPercentage = discount ? Number(discount.discount_percentage) : 0;
                    const originalPrice = Number(product.price);
                    const discountedPrice = originalPrice * (1 - discountPercentage / 100);

                    return (
                      <Card
                        key={product.id}
                        className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
                      >
                        <div className="aspect-square bg-muted relative overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                              No Image
                            </div>
                          )}
                          {discountPercentage > 0 && (
                            <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                              {discountPercentage}% OFF
                            </div>
                          )}
                        </div>
                        <CardContent className="p-2 sm:p-3 space-y-1 sm:space-y-2 flex flex-col flex-1">
                          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 min-h-[2.5rem] sm:min-h-[2rem]">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {discountPercentage > 0 ? (
                              <>
                                <p className="text-primary font-bold text-sm sm:text-base">
                                  ₹{formatIndianNumber(Number(discountedPrice.toFixed(2)))}
                                </p>
                                <p className="text-xs text-muted-foreground line-through">
                                  ₹{formatIndianNumber(Number(originalPrice.toFixed(2)))}
                                </p>
                              </>
                            ) : (
                              <p className="text-primary font-bold text-sm sm:text-base">
                                ₹{formatIndianNumber(Number(originalPrice.toFixed(2)))}
                              </p>
                            )}
                          </div>
                          {product.stock_quantity !== null && (
                            <p className="text-xs text-muted-foreground">
                              Stock: {product.stock_quantity}
                            </p>
                          )}
                          <div className="flex items-center gap-1 sm:gap-2 mt-auto pt-2">
                            <Input
                              type="number"
                              min="1"
                              value={productQuantities[product.id] || 1}
                              onChange={(e) => setProductQuantities({
                                ...productQuantities,
                                [product.id]: parseInt(e.target.value) || 1
                              })}
                              className="h-7 sm:h-8 text-xs flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(product, productQuantities[product.id] || 1)}
                              className="flex-shrink-0 h-7 sm:h-9 text-xs px-2 sm:px-4"
                            >
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Cart */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l bg-card overflow-y-auto">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-phone">Customer Phone</Label>
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                />
                {loyaltyPoints > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Available Points: {loyaltyPoints}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="counter">Counter</Label>
                <select
                  id="counter"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedCounter}
                  onChange={(e) => setSelectedCounter(e.target.value)}
                >
                  {counters.map((counter) => (
                    <option key={counter.id} value={counter.id}>
                      {counter.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items */}
              <div className="border-t pt-4 space-y-2 max-h-48 overflow-y-auto">
                <h3 className="font-semibold">Cart Items ({cartItems.length})</h3>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{formatIndianNumber(Number(item.price.toFixed(2)))} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-8 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{formatIndianNumber(Number(totals.subtotal.toFixed(2)))}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Product Tax (CGST + SGST):</span>
                    <span>₹{formatIndianNumber(Number(totals.productTaxAmount.toFixed(2)))}</span>
                  </div>
                  {cartItems.length > 0 && (
                    <div className="pl-4 space-y-1 text-xs">
                      {cartItems.map(item => {
                        const itemTotal = item.price * item.quantity;
                        const cgst = (itemTotal * item.cgst) / 100;
                        const sgst = (itemTotal * item.sgst) / 100;
                        if (cgst > 0 || sgst > 0) {
                          return (
                            <div key={item.id} className="flex justify-between text-muted-foreground">
                              <span>{item.name}:</span>
                              <span>CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{formatIndianNumber(Number(totals.subtotalWithProductTax.toFixed(2)))}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon">Apply Coupon</Label>
                <select
                  id="coupon"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedCoupon}
                  onChange={(e) => setSelectedCoupon(e.target.value)}
                >
                  <option value="">No Coupon</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.code} - {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                    </option>
                  ))}
                </select>
                {totals.couponDiscountAmount > 0 && (
                  <p className="text-xs text-green-600">
                    Discount: -₹{formatIndianNumber(Number(totals.couponDiscountAmount.toFixed(2)))}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst">Apply Additional GST %</Label>
                <Input
                  id="gst"
                  type="number"
                  value={additionalGstRate}
                  onChange={(e) => setAdditionalGstRate(e.target.value)}
                  placeholder="0"
                />
                {totals.additionalTaxAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Additional Tax: ₹{formatIndianNumber(Number(totals.additionalTaxAmount.toFixed(2)))}
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total:</span>
                  <span>₹{formatIndianNumber(Number(totals.total.toFixed(2)))}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
              >
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernBilling;
