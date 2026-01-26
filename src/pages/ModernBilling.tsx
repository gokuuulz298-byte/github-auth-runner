import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Minus, Monitor, ClipboardList, Search, Package, Printer, Keyboard } from "lucide-react";
import { toast } from "sonner";
import ShoppingCart, { CartItem } from "@/components/ShoppingCart";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIndianNumber } from "@/lib/numberFormat";
import { Switch } from "@/components/ui/switch";
import { setCounterSession, getCounterSession } from "@/lib/counterSession";
import { saveInvoiceToIndexedDB } from "@/lib/indexedDB";
import jsPDF from "jspdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OrderStatusMonitor from "@/components/OrderStatusMonitor";
import LiveOrdersPanel from "@/components/LiveOrdersPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { printEscPosReceipt, buildReceiptData } from "@/lib/escposPrinter";
import LoadingButton from "@/components/LoadingButton";
import PrinterStatusIndicator from "@/components/PrinterStatusIndicator";
import BarcodeScanner from "@/components/BarcodeScanner";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import WeightSelectionDialog from "@/components/WeightSelectionDialog";

const ModernBilling = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [allProducts, setAllProducts] = useState<any[]>([]); // Cache all products
  const [searchTerm, setSearchTerm] = useState<string>("");
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
  const [invoiceFormat, setInvoiceFormat] = useState<"thermal" | "a4">("thermal");
  const [productQuantities, setProductQuantities] = useState<{ [key: string]: number }>({});
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<string>("cash");
  const [isParcel, setIsParcel] = useState<boolean>(false);
  const [showOrderMonitor, setShowOrderMonitor] = useState<boolean>(false);
  const [showLiveOrders, setShowLiveOrders] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(200);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(-1);
  const [keyboardNavEnabled, setKeyboardNavEnabled] = useState<boolean>(false);
  
  // Loyalty redemption state
  const [loyaltySettings, setLoyaltySettings] = useState<{
    points_per_rupee: number;
    rupees_per_point_redeem: number;
    min_points_to_redeem: number;
    is_active: boolean;
  } | null>(null);
  const [redeemLoyalty, setRedeemLoyalty] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  
  // Weight selection dialog state
  const [weightDialogOpen, setWeightDialogOpen] = useState<boolean>(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<any>(null);

  // Keyboard navigation handler - only active when toggle is enabled
  useEffect(() => {
    if (!keyboardNavEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedProductIndex((prev) => {
            const cols =
              window.innerWidth >= 1280 ? 6 : window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 4 : 3;
            const newIndex = prev - cols;
            return newIndex >= 0 ? newIndex : prev;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedProductIndex((prev) => {
            const cols =
              window.innerWidth >= 1280 ? 6 : window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 4 : 3;
            const newIndex = prev + cols;
            return newIndex < products.length ? newIndex : prev;
          });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setSelectedProductIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "ArrowRight":
          e.preventDefault();
          setSelectedProductIndex((prev) => (prev < products.length - 1 ? prev + 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedProductIndex >= 0 && selectedProductIndex < products.length) {
            const product = products[selectedProductIndex];
            const isInCart = cartItems.some((item) => item.id === product.id);
            if (isInCart) {
              const cartQty = cartItems.find((item) => item.id === product.id)?.quantity || 0;
              handleUpdateQuantity(product.id, cartQty + 1);
            } else {
              handleAddToCart(product, productQuantities[product.id] || 1);
            }
          }
          break;
        case "+":
        case "=":
          e.preventDefault();
          if (selectedProductIndex >= 0 && selectedProductIndex < products.length) {
            const product = products[selectedProductIndex];
            const isInCart = cartItems.some((item) => item.id === product.id);
            if (isInCart) {
              const cartQty = cartItems.find((item) => item.id === product.id)?.quantity || 0;
              handleUpdateQuantity(product.id, cartQty + 1);
            } else {
              const newQty = (productQuantities[product.id] || 1) + 1;
              setProductQuantities({ ...productQuantities, [product.id]: newQty });
            }
          }
          break;
        case "-":
          e.preventDefault();
          if (selectedProductIndex >= 0 && selectedProductIndex < products.length) {
            const product = products[selectedProductIndex];
            const isInCart = cartItems.some((item) => item.id === product.id);
            if (isInCart) {
              const cartQty = cartItems.find((item) => item.id === product.id)?.quantity || 0;
              handleUpdateQuantity(product.id, cartQty - 1);
            } else {
              const newQty = Math.max(1, (productQuantities[product.id] || 1) - 1);
              setProductQuantities({ ...productQuantities, [product.id]: newQty });
            }
          }
          break;
        case "Escape":
          setSelectedProductIndex(-1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardNavEnabled, products, selectedProductIndex, cartItems, productQuantities]);

  // Initialize counter session
  useEffect(() => {
    const session = getCounterSession();
    if (session) {
      setSelectedCounter(session.counterId);
    }
  }, []);

  // Fetch initial data - load all products upfront for faster category switching
  useEffect(() => {
    fetchCategories();
    fetchCompanyProfile();
    fetchCounters();
    fetchCoupons();
    fetchProductDiscounts();
    fetchActiveTemplate();
    fetchAllProducts(); // Load all products once
    fetchLoyaltySettings();
  }, []);
  
  const fetchLoyaltySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('created_by', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setLoyaltySettings({
          points_per_rupee: Number(data.points_per_rupee) || 1,
          rupees_per_point_redeem: Number(data.rupees_per_point_redeem) || 1,
          min_points_to_redeem: data.min_points_to_redeem || 100,
          is_active: data.is_active ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching loyalty settings:", error);
    }
  };

  // Filter products when category changes (instant - no database call)
  useEffect(() => {
    if (selectedCategory) {
      setProducts(allProducts.filter((p) => p.category === selectedCategory));
    } else {
      setProducts(allProducts);
    }
  }, [selectedCategory, allProducts]);

  // Search filter
  useEffect(() => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const filtered = allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) || (p.barcode && p.barcode.toLowerCase().includes(searchLower)),
      );
      if (selectedCategory) {
        setProducts(filtered.filter((p) => p.category === selectedCategory));
      } else {
        setProducts(filtered);
      }
    } else {
      if (selectedCategory) {
        setProducts(allProducts.filter((p) => p.category === selectedCategory));
      } else {
        setProducts(allProducts);
      }
    }
  }, [searchTerm, selectedCategory, allProducts]);

  const fetchCategories = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("categories").select("*").eq("created_by", user.id).order("name");

      if (error) throw error;
      setCategories(data || []);
      // Default to "All Products" (empty selectedCategory) instead of first category
      // This prevents flickering by showing all products on page load
      setSelectedCategory("");
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      setProductsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("created_by", user.id)
        .eq("is_deleted", false)
        .order("name");

      if (error) throw error;
      setAllProducts(data || []);
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchCompanyProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("company_profiles").select("*").eq("user_id", user.id).maybeSingle();

      if (error) throw error;
      setCompanyProfile(data);

      if (data?.billing_settings && typeof data.billing_settings === "object") {
        const settings = data.billing_settings as any;
        setBillingSettings({
          ...settings.ModernBilling,
          isRestaurant: settings.isRestaurant,
          enableKitchenInterface: settings.enableKitchenInterface,
          enableBilingualBill: settings.enableBilingualBill,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCounters = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("counters").select("*").eq("created_by", user.id).order("name");

      if (error) throw error;
      setCounters(data || []);
      if (data && data.length > 0) {
        const session = getCounterSession();
        if (session && data.find((c) => c.id === session.counterId)) {
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
      const { data, error } = await supabase.from("coupons").select("*").eq("is_active", true);

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProductDiscounts = async () => {
    try {
      const { data, error } = await supabase.from("product_discounts").select("*").eq("is_active", true);

      if (error) throw error;
      setProductDiscounts(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchActiveTemplate = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bill_templates")
        .select("*")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setActiveTemplate(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch customer details and loyalty points when phone changes
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!customerPhone || customerPhone.length < 10) {
        setLoyaltyPoints(0);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch customer name
        const { data: customerData } = await supabase
          .from("customers")
          .select("name")
          .eq("phone", customerPhone)
          .eq("created_by", user.id)
          .maybeSingle();

        if (customerData?.name && !customerName) {
          setCustomerName(customerData.name);
        }

        // Fetch loyalty points
        const { data: loyaltyData, error } = await supabase
          .from("loyalty_points")
          .select("points")
          .eq("customer_phone", customerPhone)
          .eq("created_by", user.id)
          .maybeSingle();

        if (error) throw error;
        setLoyaltyPoints(loyaltyData?.points || 0);
      } catch (error) {
        console.error(error);
        setLoyaltyPoints(0);
      }
    };

    fetchCustomerDetails();
  }, [customerPhone]);

  const handleAddToCart = (product: any, quantity: number = 1) => {
    // Check stock availability
    const availableStock = product.stock_quantity ?? Infinity;
    if (availableStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    
    const existingItem = cartItems.find((item) => item.id === product.id);
    const currentQtyInCart = existingItem?.quantity || 0;
    
    if (currentQtyInCart + quantity > availableStock) {
      toast.error(`Only ${availableStock} units available for ${product.name}`);
      return;
    }

    const discount = productDiscounts.find(
      (d) => d.product_id === product.id && new Date(d.start_date) <= new Date() && new Date(d.end_date) >= new Date(),
    );

    const discountPercentage = discount?.discount_type === "percentage" ? Number(discount.discount_percentage) : 0;
    const discountAmount = discount?.discount_type === "fixed" ? Number(discount.discount_amount) : 0;
    const originalPrice = Number(product.price);
    let priceAfterDiscount = originalPrice;
    let discountInfo: string | null = null;

    if (discountPercentage > 0) {
      priceAfterDiscount = originalPrice * (1 - discountPercentage / 100);
      discountInfo = `${discountPercentage}% OFF`;
    } else if (discountAmount > 0) {
      priceAfterDiscount = Math.max(0, originalPrice - discountAmount);
      discountInfo = `₹${discountAmount} OFF`;
    }

    // Calculate GST details based on is_inclusive flag
    const isInclusive = billingSettings?.mode === "inclusive";
    let gstRate = 0;
    if (product.igst > 0) {
      gstRate = Number(product.igst);
    } else {
      gstRate = Number(product.cgst || 0) + Number(product.sgst || 0);
    }

    let finalPrice = priceAfterDiscount;
    let basePrice = priceAfterDiscount;

    if (isInclusive && gstRate > 0) {
      if (billingSettings?.inclusiveBillType === "mrp") {
        basePrice = priceAfterDiscount;
        finalPrice = priceAfterDiscount;
      } else {
        basePrice = priceAfterDiscount / (1 + gstRate / 100);
        finalPrice = priceAfterDiscount;
      }
    } else if (!isInclusive && gstRate > 0) {
      basePrice = priceAfterDiscount;
      finalPrice = priceAfterDiscount * (1 + gstRate / 100);
    }

    if (existingItem) {
      setCartItems(
        cartItems.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)),
      );
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        tamil_name: product.tamil_name || "",
        price: basePrice,
        originalPrice: discountInfo ? originalPrice : undefined,
        quantity: quantity,
        tax_rate: gstRate,
        cgst: Number(product.cgst) || 0,
        sgst: Number(product.sgst) || 0,
        igst: Number(product.igst) || 0,
        price_type: product.price_type || "quantity",
        barcode: product.barcode || "",
        is_inclusive: isInclusive,
        discountInfo: discountInfo,
      };
      setCartItems([...cartItems, newItem]);
    }
    toast.success(`${product.name} added to cart`);
    setProductQuantities({ ...productQuantities, [product.id]: 1 });
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    // Find the product to check stock limit
    const product = allProducts.find(p => p.id === id);
    const maxStock = product?.stock_quantity ?? Infinity;
    
    if (newQuantity <= 0) {
      setCartItems(cartItems.filter((item) => item.id !== id));
    } else if (newQuantity > maxStock) {
      toast.error(`Only ${maxStock} units available`);
      setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity: maxStock } : item)));
    } else {
      setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)));
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast.success("Item removed from cart");
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    // Calculate taxes based on trade type
    const productIGST = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const igstRate = item.igst || 0;
      return sum + (itemTotal * igstRate) / 100;
    }, 0);

    const productSGST = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const sgstRate = item.sgst || 0;
      return sum + (itemTotal * sgstRate) / 100;
    }, 0);

    const productCGST = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const cgstRate = item.cgst || 0;
      return sum + (itemTotal * cgstRate) / 100;
    }, 0);

    const productTaxAmount = intraStateTrade ? productIGST : productSGST + productCGST;

    const subtotalWithProductTax = subtotal + productTaxAmount;
    // 🟢 If inclusive MRP mode selected, skip all tax additions
    // 🟢 If inclusive MRP mode selected, do not add tax to total,
    // but still calculate it internally for analytics.
    if (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "mrp") {
      const effectiveSGST = cartItems.reduce((sum, item) => {
        const total = item.price * item.quantity;
        const sgstRate = item.sgst || 0;
        const totalTaxRate = (item.cgst || 0) + sgstRate;
        if (totalTaxRate === 0) return sum;
        return sum + (total - total / (1 + totalTaxRate / 100)) * (sgstRate / totalTaxRate);
      }, 0);

      const effectiveCGST = cartItems.reduce((sum, item) => {
        const total = item.price * item.quantity;
        const cgstRate = item.cgst || 0;
        const totalTaxRate = cgstRate + (item.sgst || 0);
        if (totalTaxRate === 0) return sum;
        return sum + (total - total / (1 + totalTaxRate / 100)) * (cgstRate / totalTaxRate);
      }, 0);

      const effectiveTaxAmount = effectiveSGST + effectiveCGST;

      // Apply coupon discount even in MRP mode
      const coupon = coupons.find((c) => c.id === selectedCoupon);
      let couponDiscountAmount = 0;
      if (coupon) {
        if (coupon.discount_type === "percentage") {
          couponDiscountAmount = (subtotal * Number(coupon.discount_value)) / 100;
        } else {
          couponDiscountAmount = Number(coupon.discount_value);
        }
      }

      const afterCouponDiscount = subtotal - couponDiscountAmount;
      
      // Calculate loyalty discount
      let loyaltyDiscountAmount = 0;
      if (redeemLoyalty && loyaltySettings?.is_active && pointsToRedeem > 0) {
        loyaltyDiscountAmount = pointsToRedeem * loyaltySettings.rupees_per_point_redeem;
      }

      return {
        subtotal, // MRP subtotal
        productTaxAmount: effectiveTaxAmount, // Tax for analytics
        productSGST: effectiveSGST,
        productCGST: effectiveCGST,
        productIGST: 0,
        subtotalWithProductTax: subtotal, // MRP already includes GST
        couponDiscountAmount, // Now applying coupon in MRP mode
        loyaltyDiscountAmount,
        pointsRedeemed: redeemLoyalty ? pointsToRedeem : 0,
        afterCouponDiscount,
        additionalTaxAmount: 0,
        totalSGST: effectiveSGST,
        totalCGST: effectiveCGST,
        totalIGST: 0,
        taxAmount: effectiveTaxAmount,
        total: Math.max(0, afterCouponDiscount - loyaltyDiscountAmount), // MRP total minus coupon minus loyalty
        gstNote: "MRP Inclusive – Taxes included in price",
      };
    }

    const coupon = coupons.find((c) => c.id === selectedCoupon);
    let couponDiscountAmount = 0;
    if (coupon) {
      if (coupon.discount_type === "percentage") {
        couponDiscountAmount = (subtotalWithProductTax * Number(coupon.discount_value)) / 100;
      } else {
        couponDiscountAmount = Number(coupon.discount_value);
      }
    }

    const afterCouponDiscount = subtotalWithProductTax - couponDiscountAmount;

    // Calculate additional GST if provided
    const additionalGstRateNum = parseFloat(additionalGstRate) || 0;
    const additionalGstAmount = additionalGstRateNum > 0 ? (afterCouponDiscount * additionalGstRateNum) / 100 : 0;
    const additionalSGST = intraStateTrade ? 0 : additionalGstAmount / 2;
    const additionalCGST = intraStateTrade ? 0 : additionalGstAmount / 2;

    const totalSGST = productSGST + additionalSGST;
    const totalCGST = productCGST + additionalCGST;
    const totalIGST = productIGST;
    const taxAmount = productTaxAmount + additionalGstAmount;
    
    // Calculate loyalty discount
    let loyaltyDiscountAmount = 0;
    if (redeemLoyalty && loyaltySettings?.is_active && pointsToRedeem > 0) {
      loyaltyDiscountAmount = pointsToRedeem * loyaltySettings.rupees_per_point_redeem;
    }
    
    const total = afterCouponDiscount + additionalGstAmount - loyaltyDiscountAmount;

    // Check if any items have inclusive pricing to show appropriate note
    const hasInclusiveItems = cartItems.some((item) => item.is_inclusive);
    const hasExclusiveItems = cartItems.some((item) => !item.is_inclusive);

    return {
      subtotal,
      productTaxAmount,
      productSGST,
      productCGST,
      productIGST,
      subtotalWithProductTax,
      couponDiscountAmount,
      loyaltyDiscountAmount,
      pointsRedeemed: redeemLoyalty ? pointsToRedeem : 0,
      afterCouponDiscount,
      additionalTaxAmount: additionalGstAmount,
      additionalSGST,
      additionalCGST,
      totalSGST,
      totalCGST,
      totalIGST,
      taxAmount,
      total: Math.max(0, total),
      gstNote:
        hasInclusiveItems && hasExclusiveItems
          ? "Some prices include GST, others have GST added extra"
          : hasInclusiveItems
            ? "Prices include GST"
            : "GST added extra",
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

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        setIsProcessing(false);
        return;
      }

      const totals = calculateTotals();

      // Generate bill number in format: DDMMYY-XX
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, "0")}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getFullYear()).slice(-2)}`;

      // Get today's bill count
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", startOfToday.toISOString());

      const billCount = (count || 0) + 1;
      const { data: invoiceNumberData, error: invoiceNumberError } = await supabase.rpc("generate_invoice_number", {
        p_store_id: companyProfile.id,
        p_counter_id: selectedCounter,
      });

      if (invoiceNumberError) throw invoiceNumberError;

      const billNumber = invoiceNumberData as string;

      // Update stock quantities - fetch fresh data to avoid race conditions
      for (const item of cartItems) {
        const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", item.id).single();

        if (product && product.stock_quantity !== null) {
          const newStock = Number(product.stock_quantity) - item.quantity;
          await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, newStock) })
            .eq("id", item.id);
        }
      }

      // Save invoice - ensure tax_amount is never null
      const taxAmount = (totals.productTaxAmount || 0) + (totals.additionalTaxAmount || 0);
      const invoiceData = {
        bill_number: billNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items_data: JSON.parse(JSON.stringify(cartItems)),
        total_amount: totals.total,
        tax_amount: taxAmount, // Ensure this is never null
        discount_amount: totals.couponDiscountAmount || 0,
        created_by: user.id,
        counter_id: selectedCounter,
        customer_id: null,
      };

      const { error: insertError } = await supabase.from("invoices").insert([invoiceData]);

      if (insertError) throw insertError;

      // Send to kitchen if parcel and kitchen interface enabled
      if (isParcel && billingSettings?.enableKitchenInterface) {
        await supabase.from("kitchen_orders").insert([
          {
            bill_number: billNumber,
            order_type: "takeaway",
            items_data: JSON.parse(JSON.stringify(cartItems)),
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            status: "pending",
            total_amount: totals.total,
            created_by: user.id,
          },
        ]);
      }

      // Update or create loyalty points and customer
      if (customerPhone) {
        const pointsToAdd = Math.floor(totals.total / 100);

        // Create or update customer record
        const { data: existingCustomer, error: customerFetchError } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", customerPhone)
          .eq("created_by", user.id)
          .maybeSingle();

        if (!customerFetchError) {
          if (existingCustomer) {
            // Update existing customer name if provided
            if (customerName && customerName !== existingCustomer.name) {
              await supabase.from("customers").update({ name: customerName }).eq("id", existingCustomer.id);
            }
          } else {
            // Create new customer
            await supabase.from("customers").insert({
              name: customerName || "Customer",
              phone: customerPhone,
              created_by: user.id,
            });
          }
        }

        if (pointsToAdd > 0) {
          const { data: existingLoyalty, error: fetchError } = await supabase
            .from("loyalty_points")
            .select("*")
            .eq("customer_phone", customerPhone)
            .maybeSingle();

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("Error fetching loyalty points:", fetchError);
          } else {
            if (existingLoyalty) {
              const { error: updateError } = await supabase
                .from("loyalty_points")
                .update({
                  points: Number(existingLoyalty.points) + pointsToAdd,
                  total_spent: Number(existingLoyalty.total_spent) + totals.total,
                  customer_name: customerName || existingLoyalty.customer_name,
                })
                .eq("id", existingLoyalty.id);

              if (updateError) {
                console.error("Error updating loyalty points:", updateError);
              }
            } else {
              const { error: insertError } = await supabase.from("loyalty_points").insert({
                customer_phone: customerPhone,
                customer_name: customerName,
                points: pointsToAdd,
                total_spent: totals.total,
                created_by: user.id,
              });

              if (insertError) {
                console.error("Error inserting loyalty points:", insertError);
              }
            }
          }
        }
      }

      // ESC/POS printing - auto print thermal receipt
      if (invoiceFormat === "thermal") {
        try {
          const receiptData = buildReceiptData({
            billNumber,
            companyProfile,
            customerName,
            customerPhone,
            cartItems,
            totals: {
              subtotal: totals.subtotal,
              taxAmount: totals.taxAmount,
              couponDiscountAmount: totals.couponDiscountAmount,
              total: totals.total,
            },
            paymentMode,
            isParcel,
            loyaltyPoints,
            enableBilingual: billingSettings?.enableBilingualBill,
            billingMode: billingSettings?.mode || "inclusive",
            inclusiveBillType: billingSettings?.inclusiveBillType || "split",
          });

          const printResult = await printEscPosReceipt(receiptData);

          if (printResult.success) {
            if (printResult.printed) {
              toast.success("Receipt printed successfully!");
            } else {
              // Local print service not available - show commands for manual printing
              console.log("ESC/POS commands generated:", printResult.commands);
              toast.info("Receipt ready. Connect thermal printer service to auto-print.");
            }
          } else {
            console.error("Print error:", printResult.error);
            toast.warning("Could not generate ESC/POS receipt. Invoice saved.");
          }
        } catch (printError) {
          console.error("ESC/POS print error:", printError);
          toast.warning("ESC/POS print failed. Invoice saved to history.");
        }
      }

      toast.success("Sale completed! Invoice saved.");

      // Reset form
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedCoupon("");
      setAdditionalGstRate("");
      setProductQuantities({});
      setIsProcessing(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to complete sale");
      setIsProcessing(false);
    }
  };

  const generateThermalInvoice = (
    billNumber: string,
    subtotal: number,
    productTaxAmount: number,
    productIGST: number,
    couponDiscount: number,
    additionalGstAmount: number,
    taxAmount: number,
    total: number,
    requiredHeight: number,
    inclusiveBillType: "split" | "mrp",
  ) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, Math.max(requiredHeight, 110)],
    });

    const pageWidth = 80;
    const centerX = pageWidth / 2;
    const leftMargin = 4;
    const rightMargin = 76;

    let currentY = 8;

    // TAKEAWAY header if parcel
    if (isParcel && billingSettings?.isRestaurant) {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("*** TAKEAWAY ***", centerX, currentY, { align: "center" });
      currentY += 5;
      doc.setFontSize(7);
      doc.setFont(undefined, "normal");
      doc.text(`Bill No: ${billNumber}`, centerX, currentY, { align: "center" });
      currentY += 4;
    }

    if (companyProfile) {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(companyProfile.company_name, centerX, currentY, { align: "center" });

      doc.setFontSize(7);
      doc.setFont(undefined, "normal");
      currentY += 4;
      if (companyProfile.address) {
        doc.text(companyProfile.address, centerX, currentY, { align: "center" });
        currentY += 3.5;
      }
      if (companyProfile.city || companyProfile.state || companyProfile.pincode) {
        const location = [companyProfile.city, companyProfile.state, companyProfile.pincode].filter(Boolean).join(", ");
        doc.text(location, centerX, currentY, { align: "center" });
        currentY += 3.5;
      }
      if (companyProfile.phone) {
        doc.text(`Ph: ${companyProfile.phone}`, centerX, currentY, { align: "center" });
        currentY += 3.5;
      }
      if (companyProfile.gstin) {
        doc.text(`GSTIN: ${companyProfile.gstin}`, centerX, currentY, { align: "center" });
        currentY += 3.5;
      }
    }

    currentY += 1;
    doc.setLineWidth(0.2);
    doc.line(leftMargin, currentY, rightMargin, currentY);

    currentY += 4;
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("TAX INVOICE", centerX, currentY, { align: "center" });

    currentY += 5;
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");

    // Bill number, date, time, mode in parallel layout
    doc.text(`Bill: ${billNumber}`, leftMargin, currentY);
    doc.text(`Time: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, centerX, currentY, {
      align: "center",
    });
    doc.text(`Mode: ${paymentMode.toUpperCase()}`, rightMargin, currentY, { align: "right" });
    currentY += 3.5;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin, currentY);

    currentY += 4;
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 3.5;

    // Customer info
    if (customerName) {
      doc.text(`Customer: ${customerName.substring(0, 20)}`, leftMargin, currentY);
      currentY += 3.5;
    }
    if (customerPhone) {
      doc.text(`Phone: ${customerPhone}`, leftMargin, currentY);
      if (loyaltyPoints > 0) {
        doc.text(`Points: ${loyaltyPoints}`, rightMargin, currentY, { align: "right" });
      }
      currentY += 3.5;
    }
    doc.line(leftMargin, currentY, rightMargin, currentY);

    currentY += 4;
    doc.setFont(undefined, "bold");
    doc.setFontSize(6);

    // Fixed column positions to prevent text collision
    const colItem = leftMargin;
    const colQty = 36;
    const colRate = 48;
    const colTax = 60;
    const colAmt = rightMargin;

    const showTaxCol = billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split";

    doc.text("Item", colItem, currentY);
    doc.text("Qty", colQty, currentY);
    doc.text("Rate", colRate, currentY);
    if (showTaxCol) {
      doc.text("Tax", colTax, currentY);
    }
    doc.text("Amt", colAmt, currentY, { align: "right" });

    currentY += 3;
    doc.setLineWidth(0.1);
    doc.line(leftMargin, currentY, rightMargin, currentY);

    currentY += 3;
    doc.setFont(undefined, "normal");
    doc.setFontSize(6);

    cartItems.forEach((item) => {
      // Handle long product names - wrap to next line if needed
      const maxNameLen = showTaxCol ? 14 : 18;
      let itemName = item.name;
      const qtyLabel = item.price_type === "weight" ? `${item.quantity.toFixed(2)}` : item.quantity.toString();
      const amount = item.price * item.quantity;

      if (itemName.length > maxNameLen) {
        // Print first line
        doc.text(itemName.substring(0, maxNameLen), colItem, currentY);
        doc.text(qtyLabel, colQty, currentY);
        doc.text(formatIndianNumber(item.price), colRate, currentY);
        if (showTaxCol) {
          doc.text(`${(item.tax_rate || 0).toFixed(0)}%`, colTax, currentY);
        }
        doc.text(formatIndianNumber(amount), colAmt, currentY, { align: "right" });
        currentY += 3;
        // Print remaining name on second line
        doc.text(itemName.substring(maxNameLen), colItem, currentY);
        currentY += 3;
      } else {
        doc.text(itemName, colItem, currentY);
        doc.text(qtyLabel, colQty, currentY);
        doc.text(formatIndianNumber(item.price), colRate, currentY);
        if (showTaxCol) {
          doc.text(`${(item.tax_rate || 0).toFixed(0)}%`, colTax, currentY);
        }
        doc.text(formatIndianNumber(amount), colAmt, currentY, { align: "right" });
        currentY += 3;
      }

      currentY += 0.5;
    });

    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 3.5;

    doc.setFontSize(7);
    doc.text("Subtotal:", leftMargin, currentY);
    doc.text(formatIndianNumber(subtotal), rightMargin, currentY, { align: "right" });
    currentY += 3.5;

    // Show taxes based on trade type
    if (showTaxCol) {
      if (intraStateTrade) {
        if (productIGST > 0) {
          doc.text("IGST:", leftMargin, currentY);
          doc.text(formatIndianNumber(productIGST), rightMargin, currentY, { align: "right" });
          currentY += 3.5;
        }
      } else {
        const productSGST = cartItems.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity;
          return sum + (itemTotal * (item.sgst || 0)) / 100;
        }, 0);
        const productCGST = cartItems.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity;
          return sum + (itemTotal * (item.cgst || 0)) / 100;
        }, 0);

        if (productSGST > 0) {
          doc.text("SGST:", leftMargin, currentY);
          doc.text(formatIndianNumber(productSGST), rightMargin, currentY, { align: "right" });
          currentY += 3.5;
        }
        if (productCGST > 0) {
          doc.text("CGST:", leftMargin, currentY);
          doc.text(formatIndianNumber(productCGST), rightMargin, currentY, { align: "right" });
          currentY += 3.5;
        }
      }
    }

    if (couponDiscount > 0) {
      const coupon = coupons.find((c) => c.id === selectedCoupon);
      doc.text(`Discount (${coupon?.code}):`, leftMargin, currentY);
      doc.text(`-${formatIndianNumber(couponDiscount)}`, rightMargin, currentY, { align: "right" });
      currentY += 3.5;
    }

    if (additionalGstAmount > 0) {
      doc.text("Add. GST:", leftMargin, currentY);
      doc.text(formatIndianNumber(additionalGstAmount), rightMargin, currentY, { align: "right" });
      currentY += 3.5;
    }

    doc.setLineWidth(0.3);
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 4;
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.text("TOTAL:", leftMargin, currentY);
    doc.text("Rs." + formatIndianNumber(total, 2), rightMargin, currentY, { align: "right" });

    currentY += 5;
    doc.line(leftMargin, currentY, rightMargin, currentY);

    currentY += 3;
    doc.setFont(undefined, "normal");
    doc.setFontSize(6);
    const gstNote = inclusiveBillType === "mrp" ? "MRP Inclusive – Taxes included" : "Base + GST shown";
    doc.text(gstNote, centerX, currentY, { align: "center" });

    // Bilingual support - Tamil translations (using transliteration since jsPDF doesn't support Tamil Unicode)
    if (billingSettings?.enableBilingualBill) {
      currentY += 2.5;
      doc.setFontSize(5);
      doc.setTextColor(100, 100, 100); // Gray color for Tamil
      const tamilGstNote =
        inclusiveBillType === "mrp" ? "(MRP Ulladakkam - Vari Serkkappattadhu)" : "(Adippadai + GST Kaattappattadhu)";
      doc.text(tamilGstNote, centerX, currentY, { align: "center" });
      doc.setTextColor(0, 0, 0); // Reset to black
    }

    currentY += 3;
    doc.setFont(undefined, "italic");
    doc.setFontSize(7);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, centerX, currentY, { align: "center" });

    // Bilingual thank you note
    if (billingSettings?.enableBilingualBill) {
      currentY += 2.5;
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100); // Gray color for Tamil
      doc.text("(Ungal Vanigathirkku Nandri!)", centerX, currentY, { align: "center" });
      doc.setTextColor(0, 0, 0); // Reset to black
    }

    // Auto-print functionality
    if (billingSettings?.autoPrint) {
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(pdfUrl);
        };
      }
    } else {
      doc.save(`${billNumber}.pdf`);
    }
  };

  const generateA4Invoice = (
    billNumber: string,
    subtotal: number,
    productSGST: number,
    productCGST: number,
    productIGST: number,
    couponDiscount: number,
    additionalSGST: number,
    additionalCGST: number,
    totalSGST: number,
    totalCGST: number,
    totalIGST: number,
    taxAmount: number,
    total: number,
    inclusiveBillType: "split" | "mrp",
  ) => {
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });

    const pageWidth = 210;
    const leftMargin = 15;
    const rightMargin = 195;
    const centerX = pageWidth / 2;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 25, g: 55, b: 109 };
    };

    const primaryColor = activeTemplate?.template_data?.primaryColor
      ? hexToRgb(activeTemplate.template_data.primaryColor)
      : { r: 25, g: 55, b: 109 };

    let currentY = 0;

    // Professional header band
    const headerHeight = 45;
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Company name
    currentY = 18;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont(undefined, "bold");
    if (companyProfile) {
      doc.text(companyProfile.company_name, leftMargin, currentY);

      // Company details on right
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      let rightY = 12;
      if (companyProfile.address) {
        doc.text(companyProfile.address, rightMargin, rightY, { align: "right" });
        rightY += 5;
      }
      const location = [companyProfile.city, companyProfile.state, companyProfile.pincode].filter(Boolean).join(", ");
      if (location) {
        doc.text(location, rightMargin, rightY, { align: "right" });
        rightY += 5;
      }
      if (companyProfile.phone) {
        doc.text(`Tel: ${companyProfile.phone}`, rightMargin, rightY, { align: "right" });
        rightY += 5;
      }
      if (companyProfile.email) {
        doc.text(companyProfile.email, rightMargin, rightY, { align: "right" });
        rightY += 5;
      }
      if (companyProfile.gstin) {
        doc.text(`GSTIN: ${companyProfile.gstin}`, rightMargin, rightY, { align: "right" });
      }
    }

    currentY = headerHeight + 8;

    // Takeaway badge if parcel
    if (isParcel && billingSettings?.isRestaurant) {
      doc.setFillColor(255, 147, 0);
      doc.roundedRect(leftMargin, currentY, 35, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("TAKEAWAY", leftMargin + 17.5, currentY + 5.5, { align: "center" });
      currentY += 12;
    }

    // Invoice title and number
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("TAX INVOICE", leftMargin, currentY);

    // Invoice number badge
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(rightMargin - 55, currentY - 6, 55, 10, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`#${billNumber}`, rightMargin - 27.5, currentY, { align: "center" });

    currentY += 12;

    // Horizontal divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, currentY, rightMargin, currentY);

    currentY += 10;

    // Two column info section
    const col1X = leftMargin;
    const col2X = 115;

    // Invoice Details Box
    doc.setFillColor(250, 251, 252);
    doc.roundedRect(col1X, currentY, 90, 38, 3, 3, "F");
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    doc.roundedRect(col1X, currentY, 90, 38, 3, 3);

    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("INVOICE DETAILS", col1X + 5, currentY + 8);

    doc.setFont(undefined, "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.text(`Invoice No:`, col1X + 5, currentY + 16);
    doc.text(billNumber, col1X + 35, currentY + 16);
    doc.text(`Date:`, col1X + 5, currentY + 23);
    doc.text(
      new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      col1X + 35,
      currentY + 23,
    );
    doc.text(`Time:`, col1X + 5, currentY + 30);
    doc.text(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), col1X + 35, currentY + 30);

    // Customer Details Box
    doc.setFillColor(250, 251, 252);
    doc.roundedRect(col2X, currentY, 80, 38, 3, 3, "F");
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.roundedRect(col2X, currentY, 80, 38, 3, 3);

    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("BILL TO", col2X + 5, currentY + 8);

    doc.setFont(undefined, "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.text(customerName || "Walk-in Customer", col2X + 5, currentY + 16);
    if (customerPhone) {
      doc.text(`Ph: ${customerPhone}`, col2X + 5, currentY + 23);
    }
    if (loyaltyPoints > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text(`Loyalty Points: ${loyaltyPoints}`, col2X + 5, currentY + 30);
    }

    // Payment mode badge
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.roundedRect(col1X + 50, currentY + 25, 35, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text(paymentMode.toUpperCase(), col1X + 67.5, currentY + 30.5, { align: "center" });

    currentY += 48;

    // Products table
    const showTaxCol = billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split";

    // Table header
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(leftMargin, currentY, rightMargin - leftMargin, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);

    doc.text("S.No", leftMargin + 3, currentY + 6.5);
    doc.text("Item Description", leftMargin + 18, currentY + 6.5);
    doc.text("Qty", showTaxCol ? 105 : 120, currentY + 6.5, { align: "center" });
    doc.text("Rate", showTaxCol ? 130 : 150, currentY + 6.5, { align: "center" });
    if (showTaxCol) {
      doc.text("GST %", 155, currentY + 6.5, { align: "center" });
    }
    doc.text("Amount", rightMargin - 3, currentY + 6.5, { align: "right" });

    currentY += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    cartItems.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(250, 251, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(leftMargin, currentY, rightMargin - leftMargin, 9, "F");

      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.1);
      doc.line(leftMargin, currentY + 9, rightMargin, currentY + 9);

      const itemName = item.name.length > 35 ? item.name.substring(0, 35) + "..." : item.name;
      const qtyLabel = item.price_type === "weight" ? `${item.quantity.toFixed(3)} kg` : `${item.quantity}`;
      const itemAmount = item.price * item.quantity;
      const taxRate = item.tax_rate || 0;

      doc.setTextColor(80, 80, 80);
      doc.text(`${index + 1}`, leftMargin + 6, currentY + 6, { align: "center" });
      doc.setTextColor(30, 30, 30);
      doc.text(itemName, leftMargin + 18, currentY + 6);
      doc.text(qtyLabel, showTaxCol ? 105 : 120, currentY + 6, { align: "center" });
      doc.text(`₹${item.price.toFixed(2)}`, showTaxCol ? 130 : 150, currentY + 6, { align: "center" });
      if (showTaxCol) {
        doc.text(`${taxRate.toFixed(1)}%`, 155, currentY + 6, { align: "center" });
      }
      doc.setFont(undefined, "bold");
      doc.text(`₹${itemAmount.toFixed(2)}`, rightMargin - 3, currentY + 6, { align: "right" });
      doc.setFont(undefined, "normal");

      currentY += 9;
    });

    // Table bottom border
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, currentY, rightMargin, currentY);

    currentY += 10;

    // Totals section
    const totalsX = 130;
    const totalsWidth = rightMargin - totalsX + 3;

    doc.setFillColor(250, 251, 252);
    doc.roundedRect(
      totalsX - 3,
      currentY - 3,
      totalsWidth,
      50 + (showTaxCol && (productSGST > 0 || productIGST > 0) ? 14 : 0) + (couponDiscount > 0 ? 7 : 0),
      3,
      3,
      "F",
    );

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");

    doc.text("Subtotal:", totalsX, currentY + 4);
    doc.text(`₹${formatIndianNumber(subtotal, 2)}`, rightMargin - 3, currentY + 4, { align: "right" });
    currentY += 7;

    if (showTaxCol) {
      if (intraStateTrade && productIGST > 0) {
        doc.text("IGST:", totalsX, currentY + 4);
        doc.text(`₹${formatIndianNumber(productIGST, 2)}`, rightMargin - 3, currentY + 4, { align: "right" });
        currentY += 7;
      } else if (!intraStateTrade && productSGST > 0) {
        doc.text("SGST:", totalsX, currentY + 4);
        doc.text(`₹${formatIndianNumber(productSGST, 2)}`, rightMargin - 3, currentY + 4, { align: "right" });
        currentY += 7;
        doc.text("CGST:", totalsX, currentY + 4);
        doc.text(`₹${formatIndianNumber(productCGST, 2)}`, rightMargin - 3, currentY + 4, { align: "right" });
        currentY += 7;
      }
    }

    if (couponDiscount > 0) {
      const coupon = coupons.find((c) => c.id === selectedCoupon);
      doc.setTextColor(220, 53, 69);
      doc.text(`Discount (${coupon?.code}):`, totalsX, currentY + 4);
      doc.text(`-₹${formatIndianNumber(couponDiscount, 2)}`, rightMargin - 3, currentY + 4, { align: "right" });
      doc.setTextColor(60, 60, 60);
      currentY += 7;
    }

    if (taxAmount > 0 && showTaxCol) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(totalsX, currentY + 2, rightMargin - 3, currentY + 2);
      currentY += 5;

      doc.setFont(undefined, "bold");
      doc.text("Total Tax:", totalsX, currentY + 4);
      doc.text(`₹${formatIndianNumber(taxAmount, 2)}`, rightMargin - 3, currentY + 4, { align: "right" });
      currentY += 10;
      doc.setFont(undefined, "normal");
    }

    // Grand total
    currentY += 3;
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(totalsX - 3, currentY, totalsWidth, 14, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("GRAND TOTAL", totalsX + 2, currentY + 9);
    doc.text(`₹${formatIndianNumber(total, 2)}`, rightMargin - 5, currentY + 9, { align: "right" });

    currentY += 25;

    // GST note
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    const gstNote =
      inclusiveBillType === "mrp"
        ? "Note: All prices are MRP inclusive of GST"
        : "Note: GST calculated as per applicable rates";
    doc.text(gstNote, centerX, currentY, { align: "center" });

    currentY += 8;
    doc.setFont(undefined, "italic");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, centerX, currentY, { align: "center" });

    // Footer line
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(1);
    doc.line(leftMargin, 282, rightMargin, 282);

    // Auto-print functionality
    if (billingSettings?.autoPrint) {
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(pdfUrl);
        };
      }
    } else {
      doc.save(`${billNumber}.pdf`);
    }
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
          <div className="flex items-center gap-2">
            {billingSettings?.enableKitchenInterface && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowOrderMonitor(!showOrderMonitor)}
                title="Order Status Monitor"
                className="relative"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            )}
            {billingSettings?.isRestaurant && (
              <Sheet open={showLiveOrders} onOpenChange={setShowLiveOrders}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" title="Live Orders from Waiters" className="relative">
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0">
                  <LiveOrdersPanel
                    onGenerateBill={(order) => {
                      const orderItems = order.items_data.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        sgst: item.sgst || 0,
                        cgst: item.cgst || 0,
                        igst: item.igst || 0,
                        taxRate: item.taxRate || 0,
                        basePrice: item.basePrice || item.price,
                        totalPrice: item.price * item.quantity,
                        barcode: item.barcode || "",
                        tax_rate: item.tax_rate || 0,
                      }));
                      setCartItems(orderItems);
                      setCustomerName(order.customer_name || "");
                      setIsParcel(order.order_type === "takeaway");
                      setShowLiveOrders(false);
                      toast.success("Order loaded to cart - Complete the sale to generate bill");
                    }}
                  />
                </SheetContent>
              </Sheet>
            )}
            <BarcodeScanner
              onScan={(barcode) => {
                const product = allProducts.find((p) => p.barcode === barcode);
                if (product) {
                  handleAddToCart(product, 1);
                } else {
                  toast.error(`Product not found: ${barcode}`);
                }
              }}
            />
            <PrinterStatusIndicator />
            <OnlineStatusIndicator />
            {/* Keyboard Navigation Toggle */}
            <Button
              variant={keyboardNavEnabled ? "default" : "outline"}
              size="icon"
              onClick={() => setKeyboardNavEnabled(!keyboardNavEnabled)}
              title={
                keyboardNavEnabled ? "Keyboard Navigation ON (Arrow keys, Enter, +/-)" : "Enable Keyboard Navigation"
              }
              className={keyboardNavEnabled ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <select
              value={invoiceFormat}
              onChange={(e) => setInvoiceFormat(e.target.value as "thermal" | "a4")}
              className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="thermal">Thermal Print (80mm)</option>
              <option value="a4">A4 Size</option>
            </select>
          </div>
        </div>
      </header>

      {/* Keyboard Navigation Help */}
      {keyboardNavEnabled && (
        <div className="bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800 px-4 py-2 text-xs text-green-700 dark:text-green-400 flex items-center gap-4">
          <span className="font-medium">⌨️ Keyboard Mode:</span>
          <span>↑↓←→ Navigate</span>
          <span>Enter Add to cart</span>
          <span>+/- Adjust quantity</span>
          <span>Esc Clear selection</span>
        </div>
      )}

      {/* Order Status Monitor */}
      <OrderStatusMonitor isOpen={showOrderMonitor} onClose={() => setShowOrderMonitor(false)} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar - Categories + Search - Resizable on desktop, horizontal on mobile */}
        <div
          className="border-r bg-card flex-shrink-0 overflow-y-auto md:resize-x w-full md:w-auto order-first"
          style={{
            width: window.innerWidth >= 768 ? `${sidebarWidth}px` : "100%",
            minWidth: window.innerWidth >= 768 ? "150px" : "auto",
            maxWidth: window.innerWidth >= 768 ? "350px" : "100%",
          }}
        >
          <div
            className="h-auto md:h-full relative"
            onMouseDown={(e) => {
              if (window.innerWidth < 768) return;
              // Enable resize from the right edge
              const startX = e.clientX;
              const startWidth = sidebarWidth;
              const handleMouseMove = (e: MouseEvent) => {
                const newWidth = Math.min(350, Math.max(150, startWidth + (e.clientX - startX)));
                setSidebarWidth(newWidth);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          >
            <div className="p-2 space-y-2">
              {/* Search Bar - Now filters products as you type */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchTerm) {
                      // On Enter, add first matched product to cart
                      const matched = products[0];
                      if (matched) {
                        handleAddToCart(matched, 1);
                        setSearchTerm("");
                      }
                    }
                  }}
                />
              </div>

              {/* Mobile: Horizontal scroll categories */}
              <div className="md:hidden overflow-x-auto pb-2">
                <div className="flex gap-1.5 min-w-max">
                  <Button
                    variant={selectedCategory === "" && !searchTerm ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8 px-3 whitespace-nowrap"
                    onClick={() => {
                      setSelectedCategory("");
                      setSearchTerm("");
                    }}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    All
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.name ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8 px-3 whitespace-nowrap"
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setSearchTerm("");
                      }}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Desktop: Vertical category list */}
              <div className="hidden md:block">
                {/* All Products Button */}
                <Button
                  variant={selectedCategory === "" && !searchTerm ? "default" : "outline"}
                  className="w-full justify-start text-xs h-7 px-2 mb-1"
                  onClick={() => {
                    setSelectedCategory("");
                    setSearchTerm("");
                  }}
                >
                  <Package className="h-3 w-3 mr-1.5" />
                  All ({allProducts.length})
                </Button>

                {/* Category Buttons */}
                <div className="space-y-0.5">
                  {categories.map((category) => {
                    const count = allProducts.filter((p) => p.category === category.name).length;
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.name ? "default" : "ghost"}
                        className="w-full justify-between text-xs h-7 px-2"
                        onClick={() => {
                          setSelectedCategory(category.name);
                          setSearchTerm("");
                        }}
                      >
                        <span className="truncate">{category.name}</span>
                        <span className="text-[10px] opacity-60">{count}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Resize handle - desktop only */}
            <div className="hidden md:block absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors" />
          </div>
        </div>

        {/* Main Content - Products Grid & Cart */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-2 max-h-[calc(100vh-180px)] md:max-h-[calc(100vh-130px)]">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-xs font-semibold mb-1.5 text-muted-foreground">
                {searchTerm ? `Search: "${searchTerm}"` : selectedCategory || "All Products"} ({products.length})
              </h2>

              {productsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-xs">
                  {searchTerm
                    ? "No products found"
                    : selectedCategory
                      ? "No products in this category"
                      : "Select a category or search"}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {products.map((product, index) => {
                    const discount = productDiscounts.find(
                      (d) =>
                        d.product_id === product.id &&
                        new Date(d.start_date) <= new Date() &&
                        new Date(d.end_date) >= new Date(),
                    );
                    const discountPercentage =
                      discount?.discount_type === "percentage" ? Number(discount.discount_percentage) : 0;
                    const discountAmount = discount?.discount_type === "fixed" ? Number(discount.discount_amount) : 0;
                    const originalPrice = Number(product.price);
                    let discountedPrice = originalPrice;
                    let hasDiscount = false;

                    if (discountPercentage > 0) {
                      discountedPrice = originalPrice * (1 - discountPercentage / 100);
                      hasDiscount = true;
                    } else if (discountAmount > 0) {
                      discountedPrice = Math.max(0, originalPrice - discountAmount);
                      hasDiscount = true;
                    }
                    const isInCart = cartItems.some((item) => item.id === product.id);
                    const cartQty = cartItems.find((item) => item.id === product.id)?.quantity || 0;
                    const isSelected = index === selectedProductIndex;

                    const displayQty = isInCart ? cartQty : productQuantities[product.id] || 1;
                    const stockQty = product.stock_quantity ?? Infinity;
                    const isOutOfStock = stockQty <= 0;

                    return (
                      <Card
                        key={product.id}
                        className={`hover:shadow-md transition-all overflow-hidden border-2 ${
                          isOutOfStock
                            ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-700"
                            : isInCart
                            ? "border-green-500 bg-green-50 dark:bg-green-950/30 cursor-pointer"
                            : isSelected
                              ? "border-primary ring-2 ring-primary/50 cursor-pointer"
                              : "border-transparent cursor-pointer"
                        }`}
                        onClick={() => {
                          if (isOutOfStock) {
                            toast.error(`${product.name} is out of stock`);
                            return;
                          }
                          setSelectedProductIndex(index);
                          
                          // For weight-based products, show weight selection dialog
                          if (product.price_type === 'weight') {
                            setSelectedWeightProduct(product);
                            setWeightDialogOpen(true);
                            return;
                          }
                          
                          if (isInCart) {
                            // If already in cart, increment cart quantity
                            if (cartQty < stockQty) {
                              handleUpdateQuantity(product.id, cartQty + 1);
                            } else {
                              toast.error(`Only ${stockQty} units available`);
                            }
                          } else {
                            // If not in cart, add with selected quantity
                            handleAddToCart(product, productQuantities[product.id] || 1);
                          }
                        }}
                      >
                        <div className="aspect-square bg-muted relative overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale' : ''}`} />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold ${isOutOfStock ? 'grayscale' : ''}`}>
                              {product.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                                OUT OF STOCK
                              </span>
                            </div>
                          )}
                          {hasDiscount && !isOutOfStock && (
                            <div className="absolute top-0.5 left-0.5 bg-green-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                              {discountPercentage > 0 ? `${discountPercentage}%` : `₹${discountAmount}`}
                            </div>
                          )}
                          {isInCart && (
                            <div className="absolute top-0.5 right-0.5 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                              {cartQty}
                            </div>
                          )}
                          {!isOutOfStock && stockQty < 10 && stockQty > 0 && (
                            <div className="absolute bottom-0.5 left-0.5 bg-orange-500 text-white text-[8px] font-medium px-1 py-0.5 rounded">
                              Only {stockQty} left
                            </div>
                          )}
                        </div>
                        <CardContent className="p-2 space-y-1">
                          <h3 className="font-medium text-xs line-clamp-2 min-h-[2rem]">{product.name}</h3>
                          
                          {/* Quick weight buttons for weight-based products */}
                          {product.price_type === 'weight' && !isOutOfStock && (
                            <div className="flex gap-1 flex-wrap">
                              {[0.25, 0.5, 0.75, 1].map((weight) => (
                                <Button
                                  key={weight}
                                  variant="outline"
                                  size="sm"
                                  className="h-5 px-1.5 text-[10px] font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(product, weight);
                                  }}
                                >
                                  {weight}kg
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex flex-col">
                              {hasDiscount ? (
                                <>
                                  <span className="text-xs text-muted-foreground line-through">
                                    ₹{formatIndianNumber(originalPrice)}
                                  </span>
                                  <span className="text-green-600 font-bold text-sm">
                                    ₹{formatIndianNumber(Number(discountedPrice.toFixed(2)))}
                                  </span>
                                </>
                              ) : (
                                <span className="text-primary font-bold text-sm">
                                  ₹{formatIndianNumber(originalPrice)}{product.price_type === 'weight' ? '/kg' : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                disabled={isOutOfStock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isInCart) {
                                    // Decrease cart quantity
                                    handleUpdateQuantity(product.id, cartQty - 1);
                                  } else {
                                    // Decrease selector quantity
                                    const newQty = Math.max(1, (productQuantities[product.id] || 1) - 1);
                                    setProductQuantities({ ...productQuantities, [product.id]: newQty });
                                  }
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs w-5 text-center font-medium">{displayQty}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className={`h-6 w-6 ${
                                  isOutOfStock || (isInCart && cartQty >= stockQty)
                                    ? 'opacity-50 cursor-not-allowed'
                                    : ''
                                }`}
                                disabled={isOutOfStock || (isInCart && cartQty >= stockQty)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isInCart) {
                                    // Increase cart quantity
                                    if (cartQty < stockQty) {
                                      handleUpdateQuantity(product.id, cartQty + 1);
                                    }
                                  } else {
                                    // Increase selector quantity
                                    const newQty = (productQuantities[product.id] || 1) + 1;
                                    if (newQty <= stockQty) {
                                      setProductQuantities({ ...productQuantities, [product.id]: newQty });
                                    }
                                  }
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Cart - Extended width */}
          <div className="w-full lg:w-[420px] xl:w-[480px] border-t lg:border-t-0 lg:border-l bg-card h-auto lg:h-[calc(100vh-60px)] max-h-[60vh] lg:max-h-none overflow-y-auto">
            <div className="p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="customer-name" className="text-xs sm:text-sm">
                  Customer Name
                </Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="customer-phone" className="text-xs sm:text-sm">
                  Customer Phone
                </Label>
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
                {customerPhone.length >= 10 && (
                  <p className="text-xs text-muted-foreground">
                    🎯 Loyalty Points: <span className="font-semibold text-amber-600">{loyaltyPoints}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="counter" className="text-xs sm:text-sm">
                  Counter
                </Label>
                <select
                  id="counter"
                  className="w-full rounded-md border border-input bg-background px-2 sm:px-3 py-2 h-9 sm:h-10 text-xs sm:text-sm"
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

              {/* Payment Mode */}
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="payment-mode" className="text-xs sm:text-sm">
                  Payment Mode
                </Label>
                <select
                  id="payment-mode"
                  className="w-full rounded-md border border-input bg-background px-2 sm:px-3 py-2 h-9 sm:h-10 text-xs sm:text-sm"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="mixed">Mixed Payment</option>
                </select>
              </div>

              {/* Parcel Option - only show if restaurant mode enabled */}
              {billingSettings?.isRestaurant && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-200 dark:border-orange-800">
                  <Switch checked={isParcel} onCheckedChange={setIsParcel} />
                  <Label className="text-sm cursor-pointer font-medium">Takeaway / Parcel Order</Label>
                </div>
              )}

              {/* Cart Items */}
              <div className="border-t pt-3 sm:pt-4 space-y-2">
                <h3 className="font-semibold text-sm sm:text-base">Cart Items ({cartItems.length})</h3>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{formatIndianNumber(Number(item.price.toFixed(2)))} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        step={item.price_type === "weight" ? "0.001" : "1"}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            handleUpdateQuantity(item.id, val);
                          }
                        }}
                        className="h-7 w-14 text-center text-sm px-1"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
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
                  {/* Show tax details for exclusive mode OR inclusive with split */}
                  {(billingSettings?.mode === "exclusive" ||
                    (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split")) && (
                    <>
                      {intraStateTrade && totals.productIGST > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Product Tax (IGST):</span>
                          <span>₹{formatIndianNumber(Number(totals.productIGST.toFixed(2)))}</span>
                        </div>
                      )}
                      {!intraStateTrade && (totals.productSGST > 0 || totals.productCGST > 0) && (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Product Tax (CGST + SGST):</span>
                            <span>₹{formatIndianNumber(Number(totals.productTaxAmount.toFixed(2)))}</span>
                          </div>
                          {cartItems.length > 0 && (
                            <div className="pl-4 space-y-1 text-xs">
                              {cartItems.map((item) => {
                                const itemTotal = item.price * item.quantity;
                                const cgst = (itemTotal * item.cgst) / 100;
                                const sgst = (itemTotal * item.sgst) / 100;
                                if (cgst > 0 || sgst > 0) {
                                  return (
                                    <div key={item.id} className="flex justify-between text-muted-foreground">
                                      <span>{item.name}:</span>
                                      <span>
                                        CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{formatIndianNumber(Number(totals.total.toFixed(2)))}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="coupon" className="text-xs sm:text-sm">
                  Apply Coupon
                </Label>
                <select
                  id="coupon"
                  className={`w-full rounded-md border bg-background px-2 sm:px-3 py-2 h-9 sm:h-10 text-xs sm:text-sm transition-colors ${
                    selectedCoupon ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-input"
                  }`}
                  value={selectedCoupon}
                  onChange={(e) => setSelectedCoupon(e.target.value)}
                >
                  <option value="">No Coupon</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.code} -{" "}
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}%`
                        : `₹${coupon.discount_value}`}
                    </option>
                  ))}
                </select>
                {selectedCoupon && (
                  <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md p-2 mt-1">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center justify-between">
                      <span>🎉 Coupon Applied!</span>
                      <span className="text-green-600">
                        -₹{formatIndianNumber(Number(totals.couponDiscountAmount.toFixed(2)))}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Loyalty Points Redemption - Show when customer has points and settings active */}
              {loyaltySettings?.is_active && customerPhone.length >= 10 && loyaltyPoints >= (loyaltySettings?.min_points_to_redeem || 100) && (
                <div className="space-y-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <input
                      id="redeem-loyalty"
                      type="checkbox"
                      checked={redeemLoyalty}
                      onChange={(e) => {
                        setRedeemLoyalty(e.target.checked);
                        if (e.target.checked) {
                          const maxRedeem = Math.min(loyaltyPoints, Math.floor(totals.subtotal / (loyaltySettings?.rupees_per_point_redeem || 1)));
                          setPointsToRedeem(maxRedeem);
                        } else {
                          setPointsToRedeem(0);
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="redeem-loyalty" className="text-sm font-medium text-amber-700 dark:text-amber-400 cursor-pointer">
                      🎁 Redeem Loyalty Points
                    </Label>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Available: {loyaltyPoints} pts</span>
                    <span>Min: {loyaltySettings?.min_points_to_redeem || 100} pts</span>
                  </div>
                  {redeemLoyalty && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Redeem: {pointsToRedeem} pts</span>
                        <span className="font-bold text-green-600">
                          -₹{(pointsToRedeem * (loyaltySettings?.rupees_per_point_redeem || 1)).toFixed(2)}
                        </span>
                      </div>
                      {/* Slider for partial redemption */}
                      <input
                        type="range"
                        min={loyaltySettings?.min_points_to_redeem || 100}
                        max={loyaltyPoints}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
                        className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{loyaltySettings?.min_points_to_redeem || 100}</span>
                        <span>{loyaltyPoints}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="gst" className="text-xs sm:text-sm">
                  Apply Additional GST %
                </Label>
                <Input
                  id="gst"
                  type="number"
                  value={additionalGstRate}
                  onChange={(e) => setAdditionalGstRate(e.target.value)}
                  placeholder="0"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
                {totals.additionalTaxAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Additional Tax: ₹{formatIndianNumber(Number(totals.additionalTaxAmount.toFixed(2)))}
                  </p>
                )}
              </div>

              <div className="border-t pt-3 sm:pt-4 space-y-1">
                {totals.loyaltyDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>🎁 Loyalty Points ({totals.pointsRedeemed} pts)</span>
                    <span>-₹{formatIndianNumber(Number(totals.loyaltyDiscountAmount.toFixed(2)))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base sm:text-lg">
                  <span>Grand Total:</span>
                  <span>₹{formatIndianNumber(Number(Math.max(0, totals.total).toFixed(2)))}</span>
                </div>
              </div>

              <LoadingButton
                className="w-full h-10 sm:h-11 md:h-12 text-sm sm:text-base"
                size="lg"
                onClick={handleCheckout}
                disabled={cartItems.length === 0 || isProcessing}
                lockDuration={2000}
              >
                <Printer className="w-4 h-4 mr-2" />
                Complete Sale
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
      
      {/* Weight Selection Dialog for weight-based products */}
      <WeightSelectionDialog
        open={weightDialogOpen}
        onOpenChange={setWeightDialogOpen}
        productName={selectedWeightProduct?.name || ''}
        onConfirm={(weight) => {
          if (selectedWeightProduct) {
            handleAddToCart(selectedWeightProduct, weight);
            setSelectedWeightProduct(null);
          }
        }}
      />
    </div>
  );
};

export default ModernBilling;
