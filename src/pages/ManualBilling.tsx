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

  // Fetch company profile, counters, coupons, and discounts
  useEffect(() => {
    fetchCompanyProfile();
    fetchCounters();
    fetchCoupons();
    fetchProductDiscounts();
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
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCounters = async () => {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('name');

      if (error) throw error;
      setCounters(data || []);
      if (data && data.length > 0) {
        setSelectedCounter(data[0].id);
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
          const { data, error } = await supabase
            .from('products')
            .select('*')
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

  const handleAddToCart = (product: any, customWeight?: string) => {
    const existingItem = cartItems.find(item => item.barcode === product.barcode);
    const weightValue = parseFloat(customWeight || weight) || 1;
    const quantity = product.price_type === 'weight' ? weightValue : 1;
    
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
    
    // Calculate total tax rate from CGST + SGST
    const cgst = parseFloat(product.cgst) || 0;
    const sgst = parseFloat(product.sgst) || 0;
    const totalTaxRate = cgst + sgst;
    
    if (existingItem) {
      setCartItems(items => 
        items.map(item => 
          item.barcode === product.barcode 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
      toast.success(`Updated ${product.name} quantity`);
    } else {
      const newItem: CartItem = {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        price: finalPrice,
        quantity,
        tax_rate: totalTaxRate,
        cgst: cgst,
        sgst: sgst,
        price_type: product.price_type,
        category: product.category,
        discountInfo,
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

    const billNumber = `INV-${Date.now()}`;
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate SGST and CGST for products
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
    
    const productTaxAmount = productSGST + productCGST;
    
    const subtotalWithProductTax = subtotal + productTaxAmount;
    
    // Calculate coupon discount
    let couponDiscount = 0;
    if (selectedCoupon) {
      const coupon = coupons.find(c => c.id === selectedCoupon);
      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          couponDiscount = subtotalWithProductTax * (coupon.discount_value / 100);
        } else {
          couponDiscount = coupon.discount_value;
        }
      }
    }
    
    const afterCouponDiscount = subtotalWithProductTax - couponDiscount;
    
    // Calculate additional GST if provided (split into SGST/CGST)
    const additionalGstRateNum = parseFloat(additionalGstRate) || 0;
    const additionalGstAmount = additionalGstRateNum > 0 ? (afterCouponDiscount * additionalGstRateNum / 100) : 0;
    const additionalSGST = additionalGstAmount / 2;
    const additionalCGST = additionalGstAmount / 2;
    
    const totalSGST = productSGST + additionalSGST;
    const totalCGST = productCGST + additionalCGST;
    const taxAmount = productTaxAmount + additionalGstAmount;
    const total = afterCouponDiscount + additionalGstAmount;

    // Calculate required height based on content
    const headerHeight = 45;
    const itemsHeight = cartItems.length * 5 + 15;
    const totalsHeight = (couponDiscount > 0 ? 4 : 0) + (additionalGstRate ? 4 : 0) + 30;
    const footerHeight = 15;
    const requiredHeight = headerHeight + itemsHeight + totalsHeight + footerHeight + 10;
    
    // Generate PDF based on selected format
    if (invoiceFormat === 'a4') {
      generateA4Invoice(billNumber, subtotal, productSGST, productCGST, couponDiscount, additionalSGST, additionalCGST, totalSGST, totalCGST, taxAmount, total);
    } else {
      generateThermalInvoice(billNumber, subtotal, productTaxAmount, couponDiscount, additionalGstAmount, taxAmount, total, requiredHeight);
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
            const newQuantity = product.stock_quantity - (item.price_type === 'weight' ? 0 : item.quantity);
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
    productTaxAmount: number,
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
      
      doc.text(itemName, leftMargin, currentY);
      doc.text(qtyLabel, 43, currentY);
      doc.text(formatIndianNumber(item.price), 53, currentY);
      doc.text(formatIndianNumber(item.price * item.quantity), rightMargin - 2, currentY, { align: "right" });
      currentY += 4.5;
    });
    
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 4;
    
    doc.setFontSize(8);
    doc.text("Subtotal:", leftMargin, currentY);
    doc.text(formatIndianNumber(subtotal), rightMargin - 2, currentY, { align: "right" });
    currentY += 4;
    
    // Calculate SGST and CGST breakdown
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
    
    if (couponDiscount > 0) {
      const coupon = coupons.find(c => c.id === selectedCoupon);
      doc.text(`Coupon (${coupon?.code}):`, leftMargin, currentY);
      doc.text(`-${formatIndianNumber(couponDiscount)}`, rightMargin - 2, currentY, { align: "right" });
      currentY += 4;
    }
    
    if (additionalGstAmount > 0) {
      const additionalSGST = additionalGstAmount / 2;
      const additionalCGST = additionalGstAmount / 2;
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
    doc.setFontSize(9);
    doc.text("TOTAL:", leftMargin, currentY);
    doc.text(`₹${formatIndianNumber(total)}`, rightMargin - 2, currentY, { align: "right" });
    
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
    couponDiscount: number,
    additionalSGST: number,
    additionalCGST: number,
    totalSGST: number,
    totalCGST: number,
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
    
    // Header with gradient-like effect
    let currentY = 20;
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    if (companyProfile) {
      doc.text(companyProfile.company_name, centerX, currentY, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      currentY += 8;
      if (companyProfile.address) {
        doc.text(companyProfile.address, centerX, currentY, { align: "center" });
        currentY += 5;
      }
      const location = [companyProfile.city, companyProfile.state, companyProfile.pincode].filter(Boolean).join(', ');
      if (location) {
        doc.text(location, centerX, currentY, { align: "center" });
        currentY += 5;
      }
      if (companyProfile.phone || companyProfile.gstin) {
        const contact = [
          companyProfile.phone ? `Ph: ${companyProfile.phone}` : '',
          companyProfile.gstin ? `GSTIN: ${companyProfile.gstin}` : ''
        ].filter(Boolean).join(' | ');
        doc.text(contact, centerX, currentY, { align: "center" });
      }
    }
    
    doc.setTextColor(0, 0, 0);
    currentY = 55;
    
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text("TAX INVOICE", centerX, currentY, { align: "center" });
    
    currentY += 12;
    const boxY = currentY;
    
    // Info boxes with borders
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.setFillColor(245, 250, 255);
    doc.rect(leftMargin, boxY, 85, 32, 'FD');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text("Invoice Details", leftMargin + 3, boxY + 7);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Bill No: ${billNumber}`, leftMargin + 3, boxY + 14);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin + 3, boxY + 20);
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, leftMargin + 3, boxY + 26);
    
    doc.setFillColor(245, 250, 255);
    doc.rect(110, boxY, 85, 32, 'FD');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185);
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
    
    // Products table header
    doc.setFillColor(41, 128, 185);
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
      
      doc.text(itemName, leftMargin + 2, currentY + 5.5);
      doc.text(qtyLabel, 100, currentY + 5.5, { align: "center" });
      doc.text(`${item.price.toFixed(2)}`, 130, currentY + 5.5, { align: "center" });
      doc.text(`${item.tax_rate.toFixed(1)}%`, 155, currentY + 5.5, { align: "center" });
      doc.text(`${itemAmount.toFixed(2)}`, rightMargin - 2, currentY + 5.5, { align: "right" });
      
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
    doc.text(subtotal.toFixed(2), rightMargin - 2, currentY, { align: "right" });
    currentY += 6;
    
    if (productSGST > 0) {
      doc.text("SGST (Product):", totalsStartX, currentY);
      doc.text(productSGST.toFixed(2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
      
      doc.text("CGST (Product):", totalsStartX, currentY);
      doc.text(productCGST.toFixed(2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
    }
    
    if (couponDiscount > 0) {
      const coupon = coupons.find(c => c.id === selectedCoupon);
      doc.setTextColor(220, 53, 69);
      doc.text(`Coupon (${coupon?.code}):`, totalsStartX, currentY);
      doc.text(`-${couponDiscount.toFixed(2)}`, rightMargin - 2, currentY, { align: "right" });
      doc.setTextColor(0, 0, 0);
      currentY += 6;
    }
    
    if (additionalSGST > 0) {
      doc.text(`Additional SGST (${additionalGstRate}%):`, totalsStartX, currentY);
      doc.text(additionalSGST.toFixed(2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
      
      doc.text(`Additional CGST (${additionalGstRate}%):`, totalsStartX, currentY);
      doc.text(additionalCGST.toFixed(2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
    }
    
    if (taxAmount > 0) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(totalsStartX, currentY, rightMargin - 2, currentY);
      currentY += 5;
      
      doc.setFont(undefined, 'bold');
      doc.text("Total SGST:", totalsStartX, currentY);
      doc.text(totalSGST.toFixed(2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
      
      doc.text("Total CGST:", totalsStartX, currentY);
      doc.text(totalCGST.toFixed(2), rightMargin - 2, currentY, { align: "right" });
      currentY += 6;
      
      doc.text("Total Tax:", totalsStartX, currentY);
      doc.text(taxAmount.toFixed(2), rightMargin - 2, currentY, { align: "right" });
      currentY += 8;
      doc.setFont(undefined, 'normal');
    }
    
    // Grand total with prominent styling
    doc.setFillColor(22, 163, 74);
    doc.rect(totalsStartX - 5, currentY - 3, rightMargin - totalsStartX + 7, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(13);
    doc.text("GRAND TOTAL:", totalsStartX, currentY + 5);
    doc.text(total.toFixed(2), rightMargin - 2, currentY + 5, { align: "right" });
    
    doc.setTextColor(0, 0, 0);
    currentY += 20;
    doc.setFont(undefined, 'italic');
    doc.setFontSize(10);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, centerX, currentY, { align: "center" });
    
    doc.setDrawColor(41, 128, 185);
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
          <h1 className="text-2xl font-bold">Manual Billing</h1>
          {!isOnline && (
            <span className="ml-auto bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm">
              Offline Mode
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Counter & Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="counter">Counter</Label>
                  <select
                    id="counter"
                    value={selectedCounter}
                    onChange={(e) => setSelectedCounter(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <Label htmlFor="customer-name">Customer Name</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
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
                      {product.price_type === 'weight' && (
                        <div className="mb-2">
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
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleAddToCart(product, product.price_type === 'weight' ? weight : undefined)}
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
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>

            <ShoppingCart
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onCheckout={generateInvoice}
              couponDiscount={(() => {
                if (!selectedCoupon) return 0;
                const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
                const productTaxAmount = productSGST + productCGST;
                const subtotalWithProductTax = subtotal + productTaxAmount;
                const coupon = coupons.find(c => c.id === selectedCoupon);
                if (!coupon) return 0;
                if (coupon.discount_type === 'percentage') {
                  return subtotalWithProductTax * (coupon.discount_value / 100);
                }
                return coupon.discount_value;
              })()}
              productSGST={(() => {
                return cartItems.reduce((sum, item) => {
                  const itemTotal = item.price * item.quantity;
                  const sgstRate = item.sgst || 0;
                  return sum + (itemTotal * sgstRate / 100);
                }, 0);
              })()}
              productCGST={(() => {
                return cartItems.reduce((sum, item) => {
                  const itemTotal = item.price * item.quantity;
                  const cgstRate = item.cgst || 0;
                  return sum + (itemTotal * cgstRate / 100);
                }, 0);
              })()}
              additionalGstAmount={(() => {
                if (!additionalGstRate) return 0;
                const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
                const productTaxAmount = productSGST + productCGST;
                const subtotalWithProductTax = subtotal + productTaxAmount;
                let couponDiscount = 0;
                if (selectedCoupon) {
                  const coupon = coupons.find(c => c.id === selectedCoupon);
                  if (coupon) {
                    if (coupon.discount_type === 'percentage') {
                      couponDiscount = subtotalWithProductTax * (coupon.discount_value / 100);
                    } else {
                      couponDiscount = coupon.discount_value;
                    }
                  }
                }
                const afterCouponDiscount = subtotalWithProductTax - couponDiscount;
                const additionalGstRateNum = parseFloat(additionalGstRate) || 0;
                return afterCouponDiscount * additionalGstRateNum / 100;
              })()}
              couponCode={coupons.find(c => c.id === selectedCoupon)?.code}
              additionalGstRate={additionalGstRate}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManualBilling;
