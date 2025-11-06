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
  const [invoiceFormat, setInvoiceFormat] = useState<"thermal" | "a4">("thermal");
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

  // Fetch loyalty points when customer phone changes
  useEffect(() => {
    const fetchLoyaltyPoints = async () => {
      if (!customerPhone || customerPhone.length < 10) {
        setLoyaltyPoints(0);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('loyalty_points')
          .select('points')
          .eq('customer_phone', customerPhone)
          .eq('created_by', user.id)
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

      // Update stock quantities - fetch fresh data to avoid race conditions
      for (const item of cartItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();

        if (product && product.stock_quantity !== null) {
          const newStock = Number(product.stock_quantity) - item.quantity;
          await supabase
            .from('products')
            .update({ stock_quantity: Math.max(0, newStock) })
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

      // Calculate required height based on content
      const headerHeight = 45;
      const itemsHeight = cartItems.length * 5 + 15;
      const totalsHeight = (totals.couponDiscountAmount > 0 ? 4 : 0) + (additionalGstRate ? 4 : 0) + 30;
      const footerHeight = 15;
      const requiredHeight = headerHeight + itemsHeight + totalsHeight + footerHeight + 10;
      
      // Generate PDF based on selected format
      if (invoiceFormat === 'a4') {
        generateA4Invoice(billNumber, totals.subtotal, totals.productSGST, totals.productCGST, totals.productIGST, totals.couponDiscountAmount, totals.additionalSGST, totals.additionalCGST, totals.totalSGST, totals.totalCGST, totals.totalIGST, totals.taxAmount, totals.total);
      } else {
        generateThermalInvoice(billNumber, totals.subtotal, totals.productTaxAmount, totals.productIGST, totals.couponDiscountAmount, totals.additionalTaxAmount, totals.taxAmount, totals.total, requiredHeight);
      }

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

  const generateThermalInvoice = (
    billNumber: string,
    subtotal: number,
    productTaxAmount: number,
    productIGST: number,
    couponDiscount: number,
    additionalGstAmount: number,
    taxAmount: number,
    total: number,
    requiredHeight: number
  ) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, Math.max(requiredHeight, 100)]
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
    doc.text("Item", leftMargin, currentY);
    doc.text("Qty", 45, currentY);
    doc.text("Rate", 55, currentY);
    doc.text("Amt", rightMargin, currentY, { align: "right" });
    
    currentY += 3;
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    currentY += 4;
    doc.setFont(undefined, 'normal');
    cartItems.forEach(item => {
      const itemName = item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name;
      const qtyLabel = item.price_type === 'weight' ? `${item.quantity.toFixed(3)}kg` : item.quantity.toString();
      
      const taxRate = item.tax_rate || item.igst || (item.cgst + item.sgst) || 0;
      doc.text(itemName, leftMargin, currentY);
      doc.text(qtyLabel, 43, currentY);
      doc.text(formatIndianNumber(item.price), 53, currentY);
      doc.text(formatIndianNumber(item.price * item.quantity), rightMargin - 2, currentY, { align: "right" });
      currentY += 3.5;
      if (taxRate > 0) {
        doc.setFontSize(6);
        doc.text(`Tax: ${taxRate.toFixed(1)}%`, leftMargin + 2, currentY);
        doc.setFontSize(7);
        currentY += 3.5;
      } else {
        currentY += 1;
      }
    });
    
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 4;
    
    doc.setFontSize(8);
    doc.text("Subtotal:", leftMargin, currentY);
    doc.text(formatIndianNumber(subtotal), rightMargin - 2, currentY, { align: "right" });
    currentY += 4;
    
    if (productTaxAmount > 0) {
      doc.text("Tax:", leftMargin, currentY);
      doc.text(formatIndianNumber(productTaxAmount), rightMargin - 2, currentY, { align: "right" });
      currentY += 4;
    }
    
    if (couponDiscount > 0) {
      doc.text("Discount:", leftMargin, currentY);
      doc.text(`-${formatIndianNumber(couponDiscount)}`, rightMargin - 2, currentY, { align: "right" });
      currentY += 4;
    }
    
    if (additionalGstAmount > 0) {
      doc.text("Add. Tax:", leftMargin, currentY);
      doc.text(formatIndianNumber(additionalGstAmount), rightMargin - 2, currentY, { align: "right" });
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
    currentY += 5;
    doc.setFont(undefined, 'italic');
    doc.setFontSize(8);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, centerX, currentY, { align: "center" });
    
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
    total: number
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
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(leftMargin, currentY, rightMargin - leftMargin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text("Item", leftMargin + 2, currentY + 6);
    doc.text("Qty", 100, currentY + 6, { align: "center" });
    doc.text("Rate", 130, currentY + 6, { align: "center" });
    doc.text("Tax", 155, currentY + 6, { align: "center" });
    doc.text("Amount", rightMargin - 2, currentY + 6, { align: "right" });
    
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
      const taxRate = item.tax_rate || item.igst || (item.cgst + item.sgst) || 0;
      
      doc.text(itemName, leftMargin + 2, currentY + 5.5);
      doc.text(qtyLabel, 100, currentY + 5.5, { align: "center" });
      doc.text(`₹${item.price.toFixed(2)}`, 130, currentY + 5.5, { align: "center" });
      doc.text(`${taxRate.toFixed(1)}%`, 155, currentY + 5.5, { align: "center" });
      doc.text(`₹${itemAmount.toFixed(2)}`, rightMargin - 2, currentY + 5.5, { align: "right" });
      
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
    
    if (intraStateTrade) {
      if (productIGST > 0) {
        doc.text("IGST (Product):", totalsStartX, currentY);
        doc.text(formatIndianNumber(productIGST, 2), rightMargin - 2, currentY, { align: "right" });
        currentY += 6;
      }
    } else {
      if (productSGST > 0) {
        doc.text("SGST (Product):", totalsStartX, currentY);
        doc.text(formatIndianNumber(productSGST, 2), rightMargin - 2, currentY, { align: "right" });
        currentY += 6;
        
        doc.text("CGST (Product):", totalsStartX, currentY);
        doc.text(formatIndianNumber(productCGST, 2), rightMargin - 2, currentY, { align: "right" });
        currentY += 6;
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
    
    if (additionalSGST > 0 && !intraStateTrade) {
      doc.text(`Additional SGST (${additionalGstRate}%):`, totalsStartX, currentY);
      doc.text(formatIndianNumber(additionalSGST, 2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
      
      doc.text(`Additional CGST (${additionalGstRate}%):`, totalsStartX, currentY);
      doc.text(formatIndianNumber(additionalCGST, 2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
    }
    
    if (taxAmount > 0) {
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
    doc.setFont(undefined, 'italic');
    doc.setFontSize(10);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, centerX, currentY, { align: "center" });
    
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(1);
    doc.line(leftMargin, 280, rightMargin, 280);
    
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
            <select
              value={invoiceFormat}
              onChange={(e) => setInvoiceFormat(e.target.value as "thermal" | "a4")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="thermal">Thermal Print (80mm)</option>
              <option value="a4">A4 Size</option>
            </select>
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
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 max-h-[calc(100vh-130px)]">
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
              <div className="border-t pt-4 space-y-2">
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
