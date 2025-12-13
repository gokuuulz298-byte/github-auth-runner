import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import ShoppingCart, { CartItem } from "@/components/ShoppingCart";
import { getProductByBarcode, saveInvoiceToIndexedDB } from "@/lib/indexedDB";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIndianNumber } from "@/lib/numberFormat";
import { setCounterSession, getCounterSession } from "@/lib/counterSession";

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
  }, []);

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
      if (data?.billing_settings && typeof data.billing_settings === "object" && "ManualBilling" in data.billing_settings) {
        setBillingSettings((data.billing_settings as any).ManualBilling);
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

  // Fetch loyalty points when customer phone changes
  useEffect(() => {
    const fetchLoyaltyPoints = async () => {
      if (!customerPhone || customerPhone.length < 10) {
        setLoyaltyPoints(0);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('loyalty_points')
          .select('points')
          .eq('customer_phone', customerPhone)
          .maybeSingle();

        if (error) throw error;
        setLoyaltyPoints(data?.points || 0);
      } catch (error) {
        console.error(error);
        setLoyaltyPoints(0);
      }
    };

    fetchLoyaltyPoints();
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
      const total = afterCouponDiscount + additionalGstAmount;
      
      return {
        subtotal,                            // MRP subtotal
        productTaxAmount: 0,                  // No tax shown
        productSGST: 0,
        productCGST: 0,
        productIGST: 0,
        subtotalWithProductTax: subtotal,    // MRP already includes GST
        couponDiscountAmount,
        afterCouponDiscount,
        additionalTaxAmount: additionalGstAmount,
        additionalSGST: 0,
        additionalCGST: 0,
        totalSGST: 0,
        totalCGST: 0,
        totalIGST: 0,
        taxAmount: additionalGstAmount,
        total,                                // MRP + additional tax if any
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
    const total = afterCouponDiscount + additionalGstAmount;

    return {
      subtotal,
      productTaxAmount,
      productSGST,
      productCGST,
      productIGST,
      subtotalWithProductTax,
      couponDiscountAmount,
      afterCouponDiscount,
      additionalTaxAmount: additionalGstAmount,
      additionalSGST,
      additionalCGST,
      totalSGST,
      totalCGST,
      totalIGST,
      taxAmount,
      total,
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
    const requiredHeight = Math.ceil(headerHeight + itemsHeight + totalsHeight + footerHeight + 15); // Added extra 15mm safety margin
    
    // Generate PDF based on selected format
    if (invoiceFormat === 'a4') {
      generateA4Invoice(billNumber, subtotal, productSGST, productCGST, productIGST, couponDiscount, additionalSGST, additionalCGST, totalSGST, totalCGST, totalIGST, taxAmount, total, billingSettings?.inclusiveBillType);
    } else {
      generateThermalInvoice(billNumber, subtotal, productSGST, productCGST, productIGST, couponDiscount, additionalSGST, additionalCGST, additionalGstAmount, taxAmount, total, requiredHeight, billingSettings?.inclusiveBillType);
    }

    // Save customer and invoice, and reduce stock
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
          tax_amount: taxAmount,
          discount_amount: couponDiscount,
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

      toast.success("Invoice generated successfully!");
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
    doc.setFontSize(7);
    const showTaxColumn = billingSettings?.mode === "exclusive" ||
      (billingSettings?.mode === "inclusive" && billingSettings?.inclusiveBillType === "split");
    
    doc.text("Item", leftMargin, currentY);
    doc.text("Qty", 40, currentY);
    doc.text("Rate", 55, currentY);
    if (showTaxColumn) {
      doc.text("Tax", 67, currentY);
      doc.text("Amt", 78, currentY, { align: "right" });
    } else {
      doc.text("Amt", 78, currentY, { align: "right" });
    }
    
    currentY += 3;
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    currentY += 4;
    doc.setFont(undefined, 'normal');
    // Wrap text by actual width (mm)
function wrapTextByWidth(doc: any, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach(word => {
    const testLine = currentLine ? currentLine + " " + word : word;
    const width = doc.getTextWidth(testLine);

    if (width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

    cartItems.forEach(item => {
  // Wrap item name (max 24 chars per line)
  // Wrap item name safely (max width = 32mm)
const nameLines = wrapTextByWidth(doc, item.name, 32);


  // Qty label
  const qtyLabel =
    item.price_type === "weight"
      ? `${item.quantity.toFixed(3)}kg`
      : item.quantity.toString();

  const amount = item.price * item.quantity;

  // FIXED COLUMN COORDINATES
  // FINAL NON-OVERLAPPING COLUMN POSITIONS
const colQty = 40;   // Qty column
const colRate = 55;  // Rate column
const colTax = 67;   // Tax column
const colAmt = 78;   // Amount (always right)


  nameLines.forEach((line, index) => {
  const y = currentY;
  const indent = index === 0 ? 0 : 4;

  // TEXT LINE
  doc.text(line, leftMargin + indent, y);

  // FIRST LINE → Show Qty, Rate, Tax, Amt
  if (index === 0) {

    // FIXED FINAL COLUMN POSITIONS
    const colQty = 40;
    const colRate = 55;
    const colTax = 67;
    const colAmt = 78;

    doc.text(qtyLabel, colQty, y);
    doc.text(formatIndianNumber(item.price), colRate, y);

    if (showTaxColumn) {
      doc.text(`${item.tax_rate.toFixed(1)}%`, colTax, y);
    }

    doc.text(formatIndianNumber(amount), colAmt, y, { align: "right" });
  }

  currentY += index === 0 ? 4.5 : 4;
});


  currentY += 1; // small gap between products
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
    
    currentY += 4;
    doc.setFont(undefined, 'italic');
    doc.setFontSize(8);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, centerX, currentY, { align: "center" });
    
    // Ensure we have enough space - add extra padding if needed
    if (currentY > requiredHeight - 5) {
      currentY += 5; // Add extra padding
    }
    
    doc.save(`${billNumber}.pdf`);
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
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, leftMargin + 3, boxY + 26);
    
    doc.setFillColor(headerBgColor.r, headerBgColor.g, headerBgColor.b);
    doc.rect(110, boxY, 85, 32, 'FD');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("Customer Details", 113, boxY + 7);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${customerName}`, 113, boxY + 14);
    doc.text(`Phone: ${customerPhone}`, 113, boxY + 20);
    if (loyaltyPoints > 0) {
      doc.text(`Loyalty Points: ${loyaltyPoints}`, 113, boxY + 26);
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
    
    doc.save(`${billNumber}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Manual Billing</h1>
          {!isOnline && (
            <span className="ml-auto bg-warning text-warning-foreground px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
              Offline
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-full">
          <div className="space-y-4">
            <Card>
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-base sm:text-lg">Counter & Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
                <div>
                  <Label htmlFor="counter" className="text-sm">Counter</Label>
                  <select
                    id="counter"
                    value={selectedCounter}
                    onChange={(e) => setSelectedCounter(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                  >
                    <option value="">Select Counter</option>
                    {counters.map((counter) => (
                      <option key={counter.id} value={counter.id}>
                        {counter.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="customer-name" className="text-sm">Customer Name</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-phone">Phone Number</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="gst-rate">Additional Tax % (Optional)</Label>
                  <Input
                    id="gst-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g., 5"
                    value={additionalGstRate}
                    onChange={(e) => setAdditionalGstRate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Apply additional tax on bill (separate from CGST/SGST)
                  </p>
                </div>
                <div>
                  <Label htmlFor="coupon">Coupon Code (Optional)</Label>
                  <select
                    id="coupon"
                    value={selectedCoupon}
                    onChange={(e) => setSelectedCoupon(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No Coupon</option>
                    {coupons.map((coupon) => (
                      <option key={coupon.id} value={coupon.id}>
                        {coupon.code} - {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`} off
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && searchTerm) {
                        e.preventDefault();
                        const product = products.find(p => p.barcode === searchTerm);
                        if (product) {
                          handleAddToCart(product);
                          setSearchTerm("");
                        }
                      }
                    }}
                    placeholder="Search by name or scan barcode..."
                    className="pl-10"
                    autoFocus
                  />
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {products.map((product) => {
                    const activeDiscount = productDiscounts.find(
                      discount => 
                        discount.product_id === product.id &&
                        new Date(discount.start_date) <= new Date() &&
                        new Date(discount.end_date) >= new Date()
                    );
                    
                    return (
                      <div key={product.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{product.name}</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                              <p className="text-sm text-muted-foreground">
                                Price: ₹{product.price}{product.price_type === 'weight' && '/kg'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Code: {product.barcode}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Stock: {product.stock_quantity}
                              </p>
                              {activeDiscount && (
                                <p className="text-sm text-green-600 font-semibold">
                                  {activeDiscount.discount_type === 'percentage' 
                                    ? `${activeDiscount.discount_percentage}% off` 
                                    : `₹${activeDiscount.discount_amount} off`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {product.price_type === 'weight' && (
                          <div>
                            <Label htmlFor={`weight-${product.id}`} className="text-xs">Weight (kg)</Label>
                            <Input
                              id={`weight-${product.id}`}
                              type="text"
                              value={weight}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setWeight(val);
                                }
                              }}
                              onBlur={() => {
                                const numValue = parseFloat(weight);
                                if (!numValue || numValue < 0.001) setWeight("0.001");
                              }}
                              className="h-8"
                              placeholder="0.000"
                            />
                          </div>
                        )}
                        {intraStateTrade && (
                          <div className={product.price_type === 'weight' ? '' : 'col-span-2'}>
                            <Label htmlFor={`igst-${product.id}`} className="text-xs">IGST %</Label>
                            <Input
                              id={`igst-${product.id}`}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0"
                              className="h-8"
                              defaultValue="0"
                            />
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          // Stock validation
                          const existingItem = cartItems.find(item => item.barcode === product.barcode);
                          const weightValue = parseFloat(weight) || 1;
                          const quantity = product.price_type === 'weight' ? weightValue : 1;
                          const currentCartQuantity = existingItem ? existingItem.quantity : 0;
                          const newTotalQuantity = currentCartQuantity + quantity;
                          
                          if (newTotalQuantity > product.stock_quantity) {
                            toast.error(`Insufficient stock! Available: ${product.stock_quantity}, In cart: ${currentCartQuantity.toFixed(3)}, Requested: ${quantity}. Cannot exceed stock limit.`);
                            return;
                          }
                          
                          const igstInput = document.getElementById(`igst-${product.id}`) as HTMLInputElement;
                          const igstValue = igstInput?.value || "0";
                          handleAddToCart(
                            product, 
                            product.price_type === 'weight' ? weight : undefined,
                            intraStateTrade ? igstValue : undefined
                          );
                        }}
                      >
                        Add to Cart
                      </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="invoice-format">Invoice Format</Label>
                  <select
                    id="invoice-format"
                    value={invoiceFormat}
                    onChange={(e) => setInvoiceFormat(e.target.value as "thermal" | "a4")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                  >
                    <option value="thermal">Thermal Print (80mm)</option>
                    <option value="a4">A4 Size</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="intra-state-toggle" className="font-medium">Intra-State Trade</Label>
                    <p className="text-xs text-muted-foreground">Enable for IGST instead of CGST+SGST</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="intra-state-toggle"
                      type="checkbox"
                      checked={intraStateTrade}
                      onChange={(e) => setIntraStateTrade(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </CardContent>
            </Card>

            <ShoppingCart
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
              additionalGstRate={additionalGstRate}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManualBilling;