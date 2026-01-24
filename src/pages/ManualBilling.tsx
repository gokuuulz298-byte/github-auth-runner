import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import CompactShoppingCart, { CartItem } from "@/components/CompactShoppingCart";
import { getProductByBarcode, saveInvoiceToIndexedDB } from "@/lib/indexedDB";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIndianNumber } from "@/lib/numberFormat";
import { setCounterSession, getCounterSession } from "@/lib/counterSession";
import { printEscPosReceipt, buildReceiptData } from "@/lib/escposPrinter";
import LoadingButton from "@/components/LoadingButton";
import PrinterStatusIndicator from "@/components/PrinterStatusIndicator";
import BarcodeScanner from "@/components/BarcodeScanner";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";

const ManualBilling = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [weight, setWeight] = useState<string>("1");
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [counters, setCounters] = useState<any[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>("");
  const [additionalGstRate, setAdditionalGstRate] = useState<string>("");
  const [coupons, setCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<string>("");
  const [invoiceFormat, setInvoiceFormat] = useState<"thermal" | "a4">("thermal");
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [productDiscounts, setProductDiscounts] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [intraStateTrade, setIntraStateTrade] = useState<boolean>(false);
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<string>("cash");
  const [isParcel, setIsParcel] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Loyalty redemption state
  const [loyaltySettings, setLoyaltySettings] = useState<{
    points_per_rupee: number;
    rupees_per_point_redeem: number;
    min_points_to_redeem: number;
    is_active: boolean;
  } | null>(null);
  const [redeemLoyalty, setRedeemLoyalty] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Initialize counter session
  useEffect(() => {
    const session = getCounterSession();
    if (session) {
      setSelectedCounter(session.counterId);
    }
  }, []);

  // Update counter session when counter changes
  useEffect(() => {
    if (selectedCounter) {
      const counter = counters.find(c => c.id === selectedCounter);
      if (counter) {
        setCounterSession(selectedCounter, counter.name);
      }
    }
  }, [selectedCounter, counters]);

  // Fetch company profile, counters, coupons, and discounts
  useEffect(() => {
    fetchCompanyProfile();
    fetchCounters();
    fetchCoupons();
    fetchProductDiscounts();
    fetchActiveTemplate();
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

      // Fetch billing settings from profile
      if (data?.billing_settings && typeof data.billing_settings === "object") {
        const settings = data.billing_settings as any;
        setBillingSettings({
          ...settings.ManualBilling,
          isRestaurant: settings.isRestaurant,
          enableKitchenInterface: settings.enableKitchenInterface,
          enableBilingualBill: settings.enableBilingualBill
        });
      }
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
        // Use session counter if available, otherwise default to first
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

  // Fetch customer details and loyalty points when phone changes
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!customerPhone || customerPhone.length < 10) {
        setLoyaltyPoints(0);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch customer name
        const { data: customerData } = await supabase
          .from('customers')
          .select('name')
          .eq('phone', customerPhone)
          .eq('created_by', user.id)
          .maybeSingle();

        if (customerData?.name && !customerName) {
          setCustomerName(customerData.name);
        }

        // Fetch loyalty points
        const { data: loyaltyData, error } = await supabase
          .from('loyalty_points')
          .select('points')
          .eq('customer_phone', customerPhone)
          .eq('created_by', user.id)
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

  // Auto-search as user types
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchTerm) {
        setProducts([]);
        return;
      }

      try {
        if (isOnline) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('created_by', user.id)
            .eq('is_deleted', false)
            .or(`name.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
            .limit(10);

          if (error) throw error;
          setProducts(data || []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, isOnline]);

  const handleAddToCart = (product: any, customWeight?: string, customIgst?: string) => {
    const existingItem = cartItems.find(item => item.barcode === product.barcode);
    const weightValue = parseFloat(customWeight || weight) || 1;
    const quantity = product.price_type === 'weight' ? weightValue : 1;

    // Stock validation for all types
    const currentCartQuantity = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = currentCartQuantity + quantity;
    
    if (newTotalQuantity > product.stock_quantity) {
      toast.error(`Insufficient stock! Available: ${product.stock_quantity}, In cart: ${currentCartQuantity.toFixed(3)}, Requested: ${quantity}. Cannot exceed stock limit.`);
      return;
    }
    
    // Check for active discount
    const now = new Date();
    const activeDiscount = productDiscounts.find(
      discount => 
        discount.product_id === product.id &&
        new Date(discount.start_date) <= now &&
        new Date(discount.end_date) >= now
    );

    let finalPrice = parseFloat(product.price);
    let discountInfo = null;

    if (activeDiscount) {
      if (activeDiscount.discount_type === 'percentage') {
        const discountAmount = (product.price * activeDiscount.discount_percentage) / 100;
        finalPrice = product.price - discountAmount;
        discountInfo = `${activeDiscount.discount_percentage}% off`;
      } else if (activeDiscount.discount_type === 'fixed') {
        finalPrice = Math.max(0, product.price - activeDiscount.discount_amount);
        discountInfo = `₹${activeDiscount.discount_amount} off`;
      }
    }
    
    // Calculate GST details based on billing settings (like ModernBilling)
    const isInclusive = billingSettings?.mode === "inclusive";
    let gstRate = 0;
    
    // Determine gstRate - use IGST if intraStateTrade, otherwise CGST+SGST
    if (intraStateTrade) {
      gstRate = parseFloat(customIgst || "0") || Number(product.igst) || 0;
    } else {
      gstRate = Number(product.cgst || 0) + Number(product.sgst || 0);
    }

    // Price logic based on billing mode (like ModernBilling)
    let basePrice = finalPrice;
    let finalDisplayPrice = finalPrice;
    
    if (isInclusive && gstRate > 0) {
      if (billingSettings?.inclusiveBillType === "mrp") {
        // Inclusive + MRP: Keep MRP as is, no base extraction
        basePrice = finalPrice;
        finalDisplayPrice = finalPrice;
      } else {
        // Inclusive + Split: Extract base from MRP, GST shown separately
        basePrice = finalPrice / (1 + gstRate / 100);
        finalDisplayPrice = finalPrice;
      }
    } else if (!isInclusive && gstRate > 0) {
      // Exclusive: Store base price, GST will be added on top
      basePrice = finalPrice;
      finalDisplayPrice = finalPrice * (1 + gstRate / 100);
    }

    // Determine tax rates
    const cgst = intraStateTrade ? 0 : (Number(product.cgst) || 0);
    const sgst = intraStateTrade ? 0 : (Number(product.sgst) || 0);
    const igst = intraStateTrade ? (parseFloat(customIgst || "0") || Number(product.igst) || 0) : 0;
    
    if (existingItem) {
      setCartItems(items => 
        items.map(item => 
          item.barcode === product.barcode 
            ? { ...item, quantity: item.quantity + quantity, tax_rate: gstRate, cgst, sgst, igst, price: basePrice }
            : item
        )
      );
      toast.success(`Updated ${product.name} quantity`);
    } else {
      const newItem: CartItem = {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        tamil_name: product.tamil_name || '',
        price: basePrice,
        quantity,
        tax_rate: gstRate,
        cgst: cgst,
        sgst: sgst,
        igst: igst,
        price_type: product.price_type,
        category: product.category,
        discountInfo,
        is_inclusive: isInclusive,
      };
      setCartItems([...cartItems, newItem]);
      toast.success(`Added ${product.name} to cart`);
    }
    setWeight("1");
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return;
    setCartItems(items =>
      items.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
    toast.success("Item removed from cart");
  };

  // Calculate totals for cart display and invoice (like ModernBilling)
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate taxes based on trade type
    const productIGST = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const igstRate = item.igst || 0;
      return sum + (itemTotal * igstRate / 100);
    }, 0);
    
    const productSGST = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const sgstRate = item.sgst || 0;
      return sum + (itemTotal * sgstRate / 100);
    }, 0);
    
    const productCGST = cartItems.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const cgstRate = item.cgst || 0;
      return sum + (itemTotal * cgstRate / 100);
    }, 0);
    
    const productTaxAmount = intraStateTrade ? productIGST : (productSGST + productCGST);
    
    // Handle Inclusive MRP mode - no tax addition
    if (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "mrp") {
      // For MRP mode, subtotal is already MRP, no tax shown
      const coupon = coupons.find(c => c.id === selectedCoupon);
      let couponDiscountAmount = 0;
      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          couponDiscountAmount = (subtotal * Number(coupon.discount_value)) / 100;
        } else {
          couponDiscountAmount = Number(coupon.discount_value);
        }
      }
      const afterCouponDiscount = subtotal - couponDiscountAmount;
      const additionalGstRateNum = parseFloat(additionalGstRate) || 0;
      const additionalGstAmount = additionalGstRateNum > 0 ? (afterCouponDiscount * additionalGstRateNum / 100) : 0;
      
      // Calculate loyalty discount
      let loyaltyDiscountAmount = 0;
      if (redeemLoyalty && loyaltySettings?.is_active && pointsToRedeem > 0) {
        loyaltyDiscountAmount = pointsToRedeem * loyaltySettings.rupees_per_point_redeem;
      }
      
      const total = afterCouponDiscount + additionalGstAmount - loyaltyDiscountAmount;
      
      return {
        subtotal,                            // MRP subtotal
        productTaxAmount: 0,                  // No tax shown
        productSGST: 0,
        productCGST: 0,
        productIGST: 0,
        subtotalWithProductTax: subtotal,    // MRP already includes GST
        couponDiscountAmount,
        loyaltyDiscountAmount,
        pointsRedeemed: redeemLoyalty ? pointsToRedeem : 0,
        afterCouponDiscount,
        additionalTaxAmount: additionalGstAmount,
        additionalSGST: 0,
        additionalCGST: 0,
        totalSGST: 0,
        totalCGST: 0,
        totalIGST: 0,
        taxAmount: additionalGstAmount,
        total: Math.max(0, total),           // MRP + additional tax - loyalty discount
      };
    }

    // For exclusive or inclusive+split: calculate subtotal with tax
    const subtotalWithProductTax = subtotal + productTaxAmount;

    // Calculate coupon discount
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

    // Calculate additional GST if provided
    const additionalGstRateNum = parseFloat(additionalGstRate) || 0;
    const additionalGstAmount = additionalGstRateNum > 0 ? (afterCouponDiscount * additionalGstRateNum / 100) : 0;
    const additionalSGST = intraStateTrade ? 0 : (additionalGstAmount / 2);
    const additionalCGST = intraStateTrade ? 0 : (additionalGstAmount / 2);
    
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
    };
  };

  const generateInvoice = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!customerName || !customerPhone) {
      toast.error("Please enter customer details");
      return;
    }

    if (!selectedCounter) {
      toast.error("Please select a counter");
      return;
    }

    setIsProcessing(true);

    // Generate bill number in format: DDMMYY-XX
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
    
    // Get today's bill count
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const { data: { user } } = await supabase.auth.getUser();
    
    let billCount = 1;
    if (user) {
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('created_at', startOfToday.toISOString());
      billCount = (count || 0) + 1;
    }
    
    const billNumber = `${dateStr}-${String(billCount).padStart(2, '0')}`;
    const totals = calculateTotals();
    
    // Use calculated totals
    const subtotal = totals.subtotal;
    const productIGST = totals.productIGST;
    const productSGST = totals.productSGST;
    const productCGST = totals.productCGST;
    const productTaxAmount = totals.productTaxAmount;
    const couponDiscount = totals.couponDiscountAmount;
    const additionalGstAmount = totals.additionalTaxAmount;
    const additionalSGST = totals.additionalSGST;
    const additionalCGST = totals.additionalCGST;
    const totalSGST = totals.totalSGST;
    const totalCGST = totals.totalCGST;
    const totalIGST = totals.totalIGST;
    const taxAmount = totals.taxAmount;
    const total = totals.total;

    // Calculate required height based on content and billing mode
    const showTax = billingSettings?.mode === "exclusive" ||
      (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split");
    
    const headerHeight = 45;
    const itemsHeight = cartItems.length * 4.5 + 15;
    const taxLines = showTax ? ((intraStateTrade && productIGST > 0 ? 4 : 0) + (!intraStateTrade ? ((productSGST > 0 ? 4 : 0) + (productCGST > 0 ? 4 : 0)) : 0)) : 0;
    const additionalTaxLines = (showTax && additionalGstAmount > 0 && !intraStateTrade) ? 8 : 0;
    const totalsHeight = 8 + taxLines + (couponDiscount > 0 ? 4 : 0) + additionalTaxLines + 12;
    const footerHeight = 20;
    const requiredHeight = Math.ceil(headerHeight + itemsHeight + totalsHeight + footerHeight + 15);
    
    // Save customer and invoice FIRST (don't download PDF)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (isOnline && user) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', customerPhone)
          .maybeSingle();

        let customerId = existingCustomer?.id;

        if (!existingCustomer) {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert([{ name: customerName, phone: customerPhone, created_by: user.id }])
            .select()
            .maybeSingle();
          customerId = newCustomer?.id;
        }

        await supabase.from('invoices').insert([{
          bill_number: billNumber,
          total_amount: total,
          tax_amount: taxAmount || 0, // Ensure never null
          discount_amount: couponDiscount || 0,
          items_data: cartItems as any,
          created_by: user.id,
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: customerPhone,
          counter_id: selectedCounter,
        }]);

        const pointsEarned = Math.floor(total / 100);
        const { data: existingLoyalty } = await supabase
          .from('loyalty_points')
          .select('*')
          .eq('customer_phone', customerPhone)
          .maybeSingle();

        if (existingLoyalty) {
          await supabase
            .from('loyalty_points')
            .update({
              points: existingLoyalty.points + pointsEarned,
              total_spent: existingLoyalty.total_spent + total,
              customer_name: customerName,
            })
            .eq('customer_phone', customerPhone);
        } else {
          await supabase
            .from('loyalty_points')
            .insert([{
              customer_phone: customerPhone,
              customer_name: customerName,
              points: pointsEarned,
              total_spent: total,
              created_by: user.id,
            }]);
        }

        if (pointsEarned > 0) {
          toast.success(`Customer earned ${pointsEarned} loyalty points!`);
        }

        for (const item of cartItems) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.id)
            .single();

          if (product) {
            // Reduce stock for both quantity and weight types
            const newQuantity = product.stock_quantity - item.quantity;
            await supabase
              .from('products')
              .update({ stock_quantity: Math.max(0, newQuantity) })
              .eq('id', item.id);
          }
        }
      } else {
        await saveInvoiceToIndexedDB({
          id: crypto.randomUUID(),
          bill_number: billNumber,
          total_amount: total,
          tax_amount: taxAmount,
          discount_amount: 0,
          items_data: cartItems,
          created_at: new Date().toISOString(),
          synced: false,
          customer_name: customerName,
          customer_phone: customerPhone,
        });
      }

      // ESC/POS printing - auto print thermal receipt
      if (invoiceFormat === 'thermal') {
        try {
          const receiptData = buildReceiptData({
            billNumber,
            companyProfile,
            customerName,
            customerPhone,
            cartItems,
            totals: {
              subtotal,
              taxAmount,
              couponDiscountAmount: couponDiscount,
              total
            },
            paymentMode,
            isParcel,
            loyaltyPoints,
            enableBilingual: billingSettings?.enableBilingualBill,
            billingMode: billingSettings?.mode || 'inclusive',
            inclusiveBillType: billingSettings?.inclusiveBillType || 'split'
          });

          const printResult = await printEscPosReceipt(receiptData);
          
          if (printResult.success) {
            if (printResult.printed) {
              toast.success("Receipt printed successfully!");
            } else {
              console.log('ESC/POS commands generated:', printResult.commands);
              toast.info("Receipt ready. Connect thermal printer service to auto-print.");
            }
          } else {
            console.error('Print error:', printResult.error);
            toast.warning("Could not generate ESC/POS receipt. Invoice saved.");
          }
        } catch (printError) {
          console.error('ESC/POS print error:', printError);
          toast.warning("ESC/POS print failed. Invoice saved to history.");
        }
      }

      toast.success("Sale completed! Invoice saved.");
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setSearchTerm("");
      setAdditionalGstRate("");
      setSelectedCoupon("");
      setLoyaltyPoints(0);
    } catch (error) {
      console.error(error);
      toast.error("Error saving invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateThermalInvoice = (
    billNumber: string,
    subtotal: number,
    productSGST: number,
    productCGST: number,
    productIGST: number,
    couponDiscount: number,
    additionalSGST: number,
    additionalCGST: number,
    additionalGstAmount: number,
    taxAmount: number,
    total: number,
    requiredHeight: number,
    inclusiveBillType?: "split" | "mrp"
  ) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, Math.max(requiredHeight, 120)] // Minimum 120mm to prevent cutting
    });
    
    const pageWidth = 80;
    const centerX = pageWidth / 2;
    const leftMargin = 5;
    const rightMargin = 75;
    
    let currentY = 10;
    if (companyProfile) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(companyProfile.company_name, centerX, currentY, { align: "center" });
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      currentY += 5;
      if (companyProfile.address) {
        doc.text(companyProfile.address, centerX, currentY, { align: "center" });
        currentY += 4;
      }
      if (companyProfile.city || companyProfile.state || companyProfile.pincode) {
        const location = [companyProfile.city, companyProfile.state, companyProfile.pincode].filter(Boolean).join(', ');
        doc.text(location, centerX, currentY, { align: "center" });
        currentY += 4;
      }
      if (companyProfile.phone) {
        doc.text(`Ph: ${companyProfile.phone}`, centerX, currentY, { align: "center" });
        currentY += 4;
      }
      if (companyProfile.gstin) {
        doc.text(`GSTIN: ${companyProfile.gstin}`, centerX, currentY, { align: "center" });
        currentY += 4;
      }
    }
    
    currentY += 2;
    doc.setLineWidth(0.3);
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    currentY += 5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("INVOICE", centerX, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Bill: ${billNumber}`, leftMargin, currentY);
    currentY += 4;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin, currentY);
    currentY += 4;
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, leftMargin, currentY);
    currentY += 4;
    doc.text(`Payment: ${paymentMode.toUpperCase()}`, leftMargin, currentY);
    if (isParcel && billingSettings?.isRestaurant) {
      currentY += 4;
      doc.setFont(undefined, 'bold');
      doc.text("*** PARCEL ***", centerX, currentY, { align: "center" });
      doc.setFont(undefined, 'normal');
    }
    
    currentY += 5;
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 4;
    doc.text(`Customer: ${customerName}`, leftMargin, currentY);
    currentY += 4;
    doc.text(`Phone: ${customerPhone}`, leftMargin, currentY);
    currentY += 4;
    if (loyaltyPoints > 0) {
      doc.text(`Loyalty Points: ${loyaltyPoints}`, leftMargin, currentY);
      currentY += 4;
    }
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    currentY += 5;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(6.5);
    const showTaxColumn = billingSettings?.mode === "exclusive" ||
      (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split");
    
    // Fixed column positions with proper spacing to prevent collision
    const colItem = leftMargin;
    const colQty = 38;
    const colRate = 50;
    const colTax = 62;
    const colAmt = rightMargin - 2;
    
    doc.text("Item", colItem, currentY);
    doc.text("Qty", colQty, currentY);
    doc.text("Rate", colRate, currentY);
    if (showTaxColumn) {
      doc.text("Tax", colTax, currentY);
    }
    doc.text("Amt", colAmt, currentY, { align: "right" });
    
    currentY += 3;
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    currentY += 4;
    doc.setFont(undefined, 'normal');
    
    // Helper function to wrap text by width
    function wrapTextByWidth(doc: any, text: string, maxWidth: number) {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      words.forEach(word => {
        const testLine = currentLine ? currentLine + " " + word : word;
        const width = doc.getTextWidth(testLine);

        if (width > maxWidth) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) lines.push(currentLine);
      return lines.length > 0 ? lines : [text.substring(0, 16)];
    }

    // Fixed column positions
    const colQtyPos = 38;
    const colRatePos = 50;
    const colTaxPos = 62;
    const colAmtPos = rightMargin - 2;

    cartItems.forEach(item => {
      // Wrap item name (max width = 28mm to prevent collision)
      const nameLines = wrapTextByWidth(doc, item.name, 28);
      
      // Qty label
      const qtyLabel = item.price_type === "weight"
        ? `${item.quantity.toFixed(2)}kg`
        : item.quantity.toString();

      const amount = item.price * item.quantity;

      nameLines.forEach((line, index) => {
        const y = currentY;
        const indent = index === 0 ? 0 : 2;

        // Print item name
        doc.text(line.substring(0, 16), leftMargin + indent, y);

        // Only show values on first line
        if (index === 0) {
          doc.text(qtyLabel, colQtyPos, y);
          doc.text(formatIndianNumber(item.price), colRatePos, y);

          if (showTaxColumn) {
            doc.text(`${item.tax_rate.toFixed(0)}%`, colTaxPos, y);
          }

          doc.text(formatIndianNumber(amount), colAmtPos, y, { align: "right" });
        }

        currentY += index === 0 ? 4.2 : 3.5;
      });

      currentY += 0.5; // Small gap between products
    });


    
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 4;
    
    doc.setFontSize(8);
    doc.text("Subtotal:", leftMargin, currentY);
    doc.text(formatIndianNumber(subtotal), rightMargin - 2, currentY, { align: "right" });
    currentY += 4;
    
    // Show taxes based on billing mode
    // TAX DISPLAY RULE:
    // Exclusive: Show GST
    // Inclusive + Split: Show GST
    // Inclusive + MRP: No GST shown
    const showTax = billingSettings?.mode === "exclusive" ||
      (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split");

    if (showTax) {
      if (intraStateTrade && productIGST > 0) {
        doc.text("IGST:", leftMargin, currentY);
        doc.text(formatIndianNumber(productIGST), rightMargin - 2, currentY, { align: "right" });
        currentY += 4;
      } else if (!intraStateTrade) {
        if (productSGST > 0) {
          doc.text("SGST:", leftMargin, currentY);
          doc.text(formatIndianNumber(productSGST), rightMargin - 2, currentY, { align: "right" });
          currentY += 4;
        }
        
        if (productCGST > 0) {
          doc.text("CGST:", leftMargin, currentY);
          doc.text(formatIndianNumber(productCGST), rightMargin - 2, currentY, { align: "right" });
          currentY += 4;
        }
      }
    }
    
    if (couponDiscount > 0) {
      const coupon = coupons.find(c => c.id === selectedCoupon);
      doc.text(`Coupon (${coupon?.code}):`, leftMargin, currentY);
      doc.text(`-${formatIndianNumber(couponDiscount)}`, rightMargin - 2, currentY, { align: "right" });
      currentY += 4;
    }
    
    if (showTax && additionalGstAmount > 0 && !intraStateTrade) {
      doc.text("Add. SGST:", leftMargin, currentY);
      doc.text(formatIndianNumber(additionalSGST), rightMargin - 2, currentY, { align: "right" });
      currentY += 4;
      doc.text("Add. CGST:", leftMargin, currentY);
      doc.text(formatIndianNumber(additionalCGST), rightMargin - 2, currentY, { align: "right" });
      currentY += 4;
    }
    
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 4;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text("TOTAL:", leftMargin, currentY);
    doc.text("Rs. " + formatIndianNumber(total, 2), rightMargin - 2, currentY, { align: "right" });
    
    currentY += 8;
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    // Add GST note based on billing mode
    currentY += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    const gstNote = billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "mrp"
      ? "MRP Inclusive – Taxes included in total price"
      : billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split"
      ? "Base + GST split shown"
      : "GST added extra";
    doc.text(gstNote, centerX, currentY, { align: "center" });
    
    // Bilingual support - Tamil translations (using transliteration since jsPDF doesn't support Tamil Unicode)
    if (billingSettings?.enableBilingualBill) {
      currentY += 2.5;
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100); // Gray color for Tamil
      const tamilGstNote = billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "mrp"
        ? "(MRP Ulladakkam - Vari Serkkappattadhu)"
        : "(Adippadai + GST Kaattappattadhu)";
      doc.text(tamilGstNote, centerX, currentY, { align: "center" });
      doc.setTextColor(0, 0, 0); // Reset to black
    }
    
    currentY += 4;
    doc.setFont(undefined, 'italic');
    doc.setFontSize(8);
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
    
    // Ensure we have enough space - add extra padding if needed
    if (currentY > requiredHeight - 5) {
      currentY += 5; // Add extra padding
    }
    
    // Auto-print functionality
    if (billingSettings?.autoPrint) {
      const pdfBlob = doc.output('blob');
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
    inclusiveBillType?: "split" | "mrp"
  ) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });
    
    const pageWidth = 210;
    const leftMargin = 15;
    const rightMargin = 195;
    const centerX = pageWidth / 2;
    
    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 41, g: 128, b: 185 }; // Default blue
    };
    
    // Use template colors or defaults
    const primaryColor = activeTemplate?.template_data?.primaryColor 
      ? hexToRgb(activeTemplate.template_data.primaryColor)
      : { r: 41, g: 128, b: 185 };
    
    const headerBgColor = activeTemplate?.template_data?.headerBg 
      ? hexToRgb(activeTemplate.template_data.headerBg)
      : { r: 248, g: 250, b: 252 };
    
    // Header with template styling - larger and more professional
    let currentY = 25;
    const headerHeight = 55;
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Add gradient effect (lighter shade at bottom)
    doc.setFillColor(
      Math.min(255, primaryColor.r + 15),
      Math.min(255, primaryColor.g + 15),
      Math.min(255, primaryColor.b + 15)
    );
    doc.rect(0, headerHeight - 8, pageWidth, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont(undefined, 'bold');
    if (companyProfile) {
      doc.text(companyProfile.company_name, centerX, currentY, { align: "center" });
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      currentY += 10;
      if (companyProfile.address) {
        doc.text(companyProfile.address, centerX, currentY, { align: "center" });
        currentY += 6;
      }
      const location = [companyProfile.city, companyProfile.state, companyProfile.pincode].filter(Boolean).join(', ');
      if (location) {
        doc.text(location, centerX, currentY, { align: "center" });
        currentY += 6;
      }
      if (companyProfile.phone || companyProfile.gstin) {
        const contact = [
          companyProfile.phone ? `Ph: ${companyProfile.phone}` : '',
          companyProfile.gstin ? `GSTIN: ${companyProfile.gstin}` : ''
        ].filter(Boolean).join(' | ');
        doc.text(contact, centerX, currentY, { align: "center" });
      }
    }
    
    currentY = headerHeight + 15;
    
    // Professional invoice title with light background
    doc.setFillColor(250, 251, 252);
    doc.rect(leftMargin, currentY, rightMargin - leftMargin, 18, 'F');
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.rect(leftMargin, currentY, rightMargin - leftMargin, 18);
    
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text("TAX INVOICE", centerX, currentY + 12, { align: "center" });
    
    currentY += 25;
    const boxY = currentY;
    
    // Info boxes with template colors
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.setFillColor(headerBgColor.r, headerBgColor.g, headerBgColor.b);
    doc.rect(leftMargin, boxY, 85, 32, 'FD');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("Invoice Details", leftMargin + 3, boxY + 7);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Bill No: ${billNumber}`, leftMargin + 3, boxY + 14);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin + 3, boxY + 20);
    doc.text(`Payment: ${paymentMode.toUpperCase()}`, leftMargin + 3, boxY + 26);
    
    doc.setFillColor(headerBgColor.r, headerBgColor.g, headerBgColor.b);
    doc.rect(110, boxY, 85, 32, 'FD');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("Customer Details", 113, boxY + 7);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${customerName || 'Walk-in Customer'}`, 113, boxY + 14);
    doc.text(`Phone: ${customerPhone || 'N/A'}`, 113, boxY + 20);
    if (loyaltyPoints > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text(`Loyalty Points: ${loyaltyPoints}`, 113, boxY + 26);
      doc.setTextColor(0, 0, 0);
    } else if (isParcel && billingSettings?.isRestaurant) {
      doc.setTextColor(220, 53, 69);
      doc.text("PARCEL ORDER", 113, boxY + 26);
      doc.setTextColor(0, 0, 0);
    }
    
    currentY = boxY + 40;
    
    // Products table header with template color
    const showTaxColumn = billingSettings?.mode === "exclusive" ||
      (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split");
    
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(leftMargin, currentY, rightMargin - leftMargin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text("Item", leftMargin + 2, currentY + 6);
    doc.text("Qty", 100, currentY + 6, { align: "center" });
    doc.text("Rate", 130, currentY + 6, { align: "center" });
    if (showTaxColumn) {
      doc.text("Tax", 155, currentY + 6, { align: "center" });
      doc.text("Amount", rightMargin - 2, currentY + 6, { align: "right" });
    } else {
      doc.text("Amount", rightMargin - 2, currentY + 6, { align: "right" });
    }
    
    currentY += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    // Draw table borders for each row
    cartItems.forEach((item, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(leftMargin, currentY, rightMargin - leftMargin, 8, 'F');
      
      // Draw cell borders
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(leftMargin, currentY, rightMargin, currentY);
      
      const itemName = item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name;
      const qtyLabel = item.price_type === 'weight' ? `${item.quantity.toFixed(3)} kg` : `${item.quantity}`;
      const itemAmount = item.price * item.quantity;
      
      doc.text(itemName, leftMargin + 2, currentY + 5.5);
      doc.text(qtyLabel, 100, currentY + 5.5, { align: "center" });
      doc.text(`${item.price.toFixed(2)}`, 130, currentY + 5.5, { align: "center" });
      if (showTaxColumn) {
        doc.text(`${item.tax_rate.toFixed(1)}%`, 155, currentY + 5.5, { align: "center" });
        doc.text(`${itemAmount.toFixed(2)}`, rightMargin - 2, currentY + 5.5, { align: "right" });
      } else {
        doc.text(`${itemAmount.toFixed(2)}`, rightMargin - 2, currentY + 5.5, { align: "right" });
      }
      
      currentY += 8;
    });
    
    // Bottom border of table
    doc.setLineWidth(0.5);
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    
    currentY += 8;
    const totalsStartX = 125;
    
    // Totals box with background
    const totalsBoxY = currentY;
    doc.setFillColor(250, 252, 255);
    const boxHeight = 
      8 + // Subtotal
      (productSGST > 0 ? 12 : 0) + // Product taxes
      (couponDiscount > 0 ? 6 : 0) + // Coupon
      (additionalSGST > 0 ? 12 : 0) + // Additional taxes  
      (taxAmount > 0 ? 20 : 0) + // Total taxes
      14; // Grand total
    
    doc.rect(totalsStartX - 3, totalsBoxY - 2, rightMargin - totalsStartX + 5, boxHeight, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    doc.setFont(undefined, 'normal');
    
    currentY = totalsBoxY;
    doc.text("Subtotal:", totalsStartX, currentY);
    doc.text(formatIndianNumber(subtotal, 2), rightMargin - 2, currentY, { align: "right" });
    currentY += 6;
    
    // Show taxes based on billing mode
    const showTax = billingSettings?.mode === "exclusive" ||
      (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split");
    
    if (showTax) {
      if (intraStateTrade && productIGST > 0) {
        doc.text("IGST (Product):", totalsStartX, currentY);
        doc.text(formatIndianNumber(productIGST, 2), rightMargin - 2, currentY, { align: "right" });
        currentY += 6;
      } else if (!intraStateTrade) {
        if (productSGST > 0) {
          doc.text("SGST (Product):", totalsStartX, currentY);
          doc.text(formatIndianNumber(productSGST, 2), rightMargin - 2, currentY, { align: "right" });
          currentY += 6;
        }
        
        if (productCGST > 0) {
          doc.text("CGST (Product):", totalsStartX, currentY);
          doc.text(formatIndianNumber(productCGST, 2), rightMargin - 2, currentY, { align: "right" });
          currentY += 6;
        }
      }
    }
    
    if (couponDiscount > 0) {
      const coupon = coupons.find(c => c.id === selectedCoupon);
      doc.setTextColor(220, 53, 69);
      doc.text(`Coupon (${coupon?.code}):`, totalsStartX, currentY);
      doc.text(`-${formatIndianNumber(couponDiscount, 2)}`, rightMargin - 2, currentY, { align: "right" });
      doc.setTextColor(0, 0, 0);
      currentY += 6;
    }
    
    if (showTax && additionalSGST > 0 && !intraStateTrade) {
      doc.text(`Additional SGST (${additionalGstRate}%):`, totalsStartX, currentY);
      doc.text(formatIndianNumber(additionalSGST, 2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
      
      doc.text(`Additional CGST (${additionalGstRate}%):`, totalsStartX, currentY);
      doc.text(formatIndianNumber(additionalCGST, 2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
    }
    
    if (showTax && taxAmount > 0) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(totalsStartX, currentY, rightMargin - 2, currentY);
      currentY += 5;
      
      doc.setFont(undefined, 'bold');
      
      if (intraStateTrade) {
        doc.text("Total IGST:", totalsStartX, currentY);
        doc.text(formatIndianNumber(totalIGST, 2), rightMargin - 2, currentY, { align: "right" });
        currentY += 6;
      } else {
        doc.text("Total SGST:", totalsStartX, currentY);
        doc.text(formatIndianNumber(totalSGST, 2), rightMargin - 2, currentY, { align: "right" });
        currentY += 6;
        
        doc.text("Total CGST:", totalsStartX, currentY);
        doc.text(formatIndianNumber(totalCGST, 2), rightMargin - 2, currentY, { align: "right" });
        currentY += 6;
      }
      
      doc.text("Total Tax:", totalsStartX, currentY);
      doc.text(formatIndianNumber(taxAmount, 2), rightMargin - 2, currentY, { align: "right" });
      currentY += 8;
      doc.setFont(undefined, 'normal');
    }
    
    // Grand total with prominent styling using template color
    const totalColor = activeTemplate?.template_data?.layout === 'compact' 
      ? primaryColor 
      : { r: 22, g: 163, b: 74 }; // Green for most templates, use primary for compact
    
    doc.setFillColor(totalColor.r, totalColor.g, totalColor.b);
    doc.rect(totalsStartX - 5, currentY - 3, rightMargin - totalsStartX + 7, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(13);
    doc.text("GRAND TOTAL:", totalsStartX, currentY + 5);
    doc.text(formatIndianNumber(total, 2), rightMargin - 2, currentY + 5, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    currentY += 20;
    
    // Add GST note based on billing mode
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const gstNote = inclusiveBillType === "mrp"
      ? "MRP Inclusive – All taxes included in price"
      : billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split"
      ? "Base + GST shown separately"
      : "GST added extra";
    doc.text(gstNote, centerX, currentY, { align: "center" });
    
    currentY += 8;
    doc.setFont(undefined, 'italic');
    doc.setFontSize(10);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, centerX, currentY, { align: "center" });
    
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(1);
    doc.line(leftMargin, 280, rightMargin, 280);
    
    // Auto-print functionality
    if (billingSettings?.autoPrint) {
      const pdfBlob = doc.output('blob');
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Manual Billing</h1>
          <div className="ml-auto flex items-center gap-2">
            <OnlineStatusIndicator />
            <BarcodeScanner 
              onScan={async (barcode) => {
                const product = products.find(p => p.barcode === barcode);
                if (product) {
                  handleAddToCart(product);
                } else {
                  const dbProduct = await getProductByBarcode(barcode);
                  if (dbProduct) {
                    handleAddToCart(dbProduct);
                  } else {
                    toast.error(`Product not found: ${barcode}`);
                  }
                }
              }}
            />
            <PrinterStatusIndicator />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          {/* Left Side - Controls + Products */}
          <div className="overflow-y-auto p-2 space-y-2">
            {/* Counter & Customer */}
            <Card className="shadow-sm">
              <CardHeader className="px-2 py-1.5">
                <CardTitle className="text-xs">Counter & Customer</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <Label htmlFor="counter" className="text-[10px]">Counter</Label>
                    <select id="counter" value={selectedCounter} onChange={(e) => setSelectedCounter(e.target.value)} className="flex h-7 w-full rounded-md border border-input bg-background px-1.5 py-0.5 text-xs mt-0.5">
                      <option value="">Select</option>
                      {counters.map((counter) => (<option key={counter.id} value={counter.id}>{counter.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="payment-mode" className="text-[10px]">Payment</Label>
                    <select id="payment-mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="flex h-7 w-full rounded-md border border-input bg-background px-1.5 py-0.5 text-xs mt-0.5">
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="customer-name" className="text-[10px]">Name</Label>
                    <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name" className="h-7 text-xs mt-0.5" />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone" className="text-[10px]">Phone</Label>
                    <Input id="customer-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" className="h-7 text-xs mt-0.5" />
                    {loyaltyPoints > 0 && <p className="text-[9px] text-green-600 font-medium">Pts: {loyaltyPoints}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <Card className="shadow-sm">
              <CardContent className="p-2">
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[60px]">
                    <Label htmlFor="gst-rate" className="text-[10px]">Tax %</Label>
                    <Input id="gst-rate" type="number" step="0.01" min="0" max="100" placeholder="0" value={additionalGstRate} onChange={(e) => setAdditionalGstRate(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <Label htmlFor="coupon" className="text-[10px]">Coupon</Label>
                    <select id="coupon" value={selectedCoupon} onChange={(e) => setSelectedCoupon(e.target.value)} className="flex h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs">
                      <option value="">None</option>
                      {coupons.map((coupon) => (<option key={coupon.id} value={coupon.id}>{coupon.code}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <input id="igst-toggle" type="checkbox" checked={intraStateTrade} onChange={(e) => setIntraStateTrade(e.target.checked)} className="h-3.5 w-3.5" />
                    <Label htmlFor="igst-toggle" className="text-[10px]">IGST</Label>
                  </div>
                  {billingSettings?.isRestaurant && (
                    <div className="flex items-center gap-1">
                      <input id="parcel-toggle" type="checkbox" checked={isParcel} onChange={(e) => setIsParcel(e.target.checked)} className="h-3.5 w-3.5" />
                      <Label htmlFor="parcel-toggle" className="text-[10px]">Parcel</Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Points Redemption */}
            {loyaltySettings?.is_active && loyaltyPoints >= (loyaltySettings?.min_points_to_redeem || 100) && (
              <Card className="shadow-sm border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="redeem-loyalty"
                      type="checkbox"
                      checked={redeemLoyalty}
                      onChange={(e) => {
                        setRedeemLoyalty(e.target.checked);
                        if (e.target.checked) {
                          // Auto-set max redeemable points
                          const maxRedeem = Math.min(loyaltyPoints, Math.floor(calculateTotals().subtotal / (loyaltySettings?.rupees_per_point_redeem || 1)));
                          setPointsToRedeem(maxRedeem);
                        } else {
                          setPointsToRedeem(0);
                        }
                      }}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="redeem-loyalty" className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      Redeem Loyalty Points
                    </Label>
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      Available: {loyaltyPoints} pts
                    </span>
                  </div>
                  {redeemLoyalty && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={loyaltySettings?.min_points_to_redeem || 100}
                        max={loyaltyPoints}
                        value={pointsToRedeem}
                        onChange={(e) => {
                          const val = Math.min(loyaltyPoints, Math.max(0, parseInt(e.target.value) || 0));
                          setPointsToRedeem(val);
                        }}
                        className="h-6 text-[10px] w-20"
                      />
                      <span className="text-[9px] text-muted-foreground">pts</span>
                      <span className="text-[10px] font-semibold text-green-600 ml-auto">
                        = ₹{(pointsToRedeem * (loyaltySettings?.rupees_per_point_redeem || 1)).toFixed(2)} off
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search Products */}
            <Card className="shadow-sm">
              <CardHeader className="px-2 py-1.5">
                <CardTitle className="text-xs">Products</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2 pt-0 space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && searchTerm) {
                        e.preventDefault();
                        const product = products.find(p => p.barcode === searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
                        if (product) { handleAddToCart(product); setSearchTerm(""); }
                      }
                    }}
                    placeholder="Scan barcode or search..."
                    className="pl-7 h-7 text-xs"
                    autoFocus
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                  {products.map((product) => {
                    const activeDiscount = productDiscounts.find(d => d.product_id === product.id && new Date(d.start_date) <= new Date() && new Date(d.end_date) >= new Date());
                    let discountedPrice = product.price;
                    let discountLabel = '';
                    if (activeDiscount) {
                      if (activeDiscount.discount_type === 'percentage') {
                        discountedPrice = product.price * (1 - activeDiscount.discount_percentage / 100);
                        discountLabel = `${activeDiscount.discount_percentage}% OFF`;
                      } else if (activeDiscount.discount_type === 'fixed') {
                        discountedPrice = Math.max(0, product.price - activeDiscount.discount_amount);
                        discountLabel = `₹${activeDiscount.discount_amount} OFF`;
                      }
                    }
                    return (
                      <div key={product.id} className="p-1.5 bg-muted/50 rounded flex justify-between items-center gap-1.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs truncate">{product.name}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {activeDiscount ? (<><span className="line-through">₹{product.price}</span><span className="font-semibold text-green-600">₹{discountedPrice.toFixed(2)}</span><span className="bg-green-100 text-green-700 px-1 rounded text-[8px]">{discountLabel}</span></>) : (<span className="font-semibold text-primary">₹{product.price}</span>)}
                            <span>Stk:{product.stock_quantity}</span>
                          </div>
                        </div>
                        {product.price_type === 'weight' && (
                          <Input type="text" value={weight} onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setWeight(e.target.value); }} className="h-6 text-[10px] w-14" placeholder="kg" />
                        )}
                        <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => {
                          const existingItem = cartItems.find(item => item.barcode === product.barcode);
                          const weightValue = parseFloat(weight) || 1;
                          const quantity = product.price_type === 'weight' ? weightValue : 1;
                          const currentCartQuantity = existingItem ? existingItem.quantity : 0;
                          if (currentCartQuantity + quantity > product.stock_quantity) { toast.error(`Insufficient stock!`); return; }
                          handleAddToCart(product);
                        }}>+</Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Compact Cart */}
          <div className="border-l bg-background h-full flex flex-col">
            <div className="px-2 py-1.5 border-b bg-muted/30 flex items-center gap-2 shrink-0">
              <Label htmlFor="invoice-format" className="text-[10px] whitespace-nowrap">Format:</Label>
              <select id="invoice-format" value={invoiceFormat} onChange={(e) => setInvoiceFormat(e.target.value as "thermal" | "a4")} className="flex h-6 rounded-md border border-input bg-background px-1.5 text-[10px] flex-1">
                <option value="thermal">Thermal</option>
                <option value="a4">A4</option>
              </select>
            </div>
            <div className="flex-1 overflow-hidden">
              <CompactShoppingCart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onCheckout={generateInvoice}
                useIGST={intraStateTrade}
                billingMode={billingSettings?.mode || "exclusive"}
                inclusiveBillType={billingSettings?.inclusiveBillType || "split"}
                productSGST={calculateTotals().productSGST}
                productCGST={calculateTotals().productCGST}
                productIGST={calculateTotals().productIGST}
                couponDiscount={calculateTotals().couponDiscountAmount}
                couponCode={selectedCoupon ? coupons.find(c => c.id === selectedCoupon)?.code : undefined}
                additionalGstAmount={calculateTotals().additionalTaxAmount}
                loyaltyDiscount={calculateTotals().loyaltyDiscountAmount}
                pointsRedeemed={calculateTotals().pointsRedeemed}
                isProcessing={isProcessing}
                stockLimits={Object.fromEntries(products.map(p => [p.id, p.stock_quantity ?? Infinity]))}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManualBilling;