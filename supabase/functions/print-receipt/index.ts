import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptItem {
  name: string;
  nameTamil?: string;
  quantity: number;
  price: number;
  price_type?: string;
  tax_rate?: number;
}

interface ReceiptData {
  billNumber: string;
  companyName: string;
  companyNameTamil?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  gstin?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  discount?: number;
  total: number;
  paymentMode: string;
  isParcel?: boolean;
  loyaltyPoints?: number;
  enableBilingual?: boolean;
  thankYouNote?: string;
}

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';

// Commands
const INIT = ESC + '@';  // Initialize printer
const CENTER = ESC + 'a' + '\x01';  // Center align
const LEFT = ESC + 'a' + '\x00';  // Left align
const RIGHT = ESC + 'a' + '\x02';  // Right align
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const DOUBLE_HEIGHT = ESC + '!' + '\x10';
const NORMAL_SIZE = ESC + '!' + '\x00';
const CUT_PAPER = GS + 'V' + '\x00';  // Full cut
const FEED_LINES = (n: number) => ESC + 'd' + String.fromCharCode(n);

// Tamil Unicode translations for common terms
const TAMIL_TRANSLATIONS: { [key: string]: string } = {
  'TAX INVOICE': 'வரி இரசீது',
  'TAKEAWAY': 'எடுத்துச்செல்ல',
  'Bill No': 'ரசீது எண்',
  'Date': 'தேதி',
  'Time': 'நேரம்',
  'Customer': 'வாடிக்கையாளர்',
  'Phone': 'தொலைபேசி',
  'Points': 'புள்ளிகள்',
  'Item': 'பொருள்',
  'Qty': 'அளவு',
  'Rate': 'விலை',
  'Amt': 'தொகை',
  'Subtotal': 'உப மொத்தம்',
  'SGST': 'எஸ்ஜிஎஸ்டி',
  'CGST': 'சிஜிஎஸ்டி',
  'IGST': 'ஐஜிஎஸ்டி',
  'Discount': 'தள்ளுபடி',
  'TOTAL': 'மொத்தம்',
  'Thank you for your business!': 'உங்கள் வணிகத்திற்கு நன்றி!',
  'Payment': 'செலுத்தி',
  'CASH': 'ரொக்கம்',
  'UPI': 'யூபிஐ',
  'CARD': 'அட்டை',
};

// Common product name translations to Tamil
const PRODUCT_TAMIL_MAP: { [key: string]: string } = {
  // Food items
  'rice': 'அரிசி', 'biryani': 'பிரியாணி', 'chicken': 'கோழி', 'mutton': 'ஆட்டிறைச்சி',
  'fish': 'மீன்', 'egg': 'முட்டை', 'dosa': 'தோசை', 'idli': 'இட்லி',
  'vada': 'வடை', 'sambar': 'சாம்பார்', 'rasam': 'ரசம்', 'curd': 'தயிர்',
  'chutney': 'சட்னி', 'parotta': 'பரோட்டா', 'chapati': 'சப்பாத்தி', 'naan': 'நான்',
  'roti': 'ரொட்டி', 'puri': 'பூரி', 'paneer': 'பன்னீர்', 'dal': 'பருப்பு',
  'curry': 'கறி', 'gravy': 'குழம்பு', 'fry': 'வறுவல்', 'masala': 'மசாலா',
  'tea': 'தேநீர்', 'coffee': 'காபி', 'milk': 'பால்', 'juice': 'சாறு',
  'water': 'தண்ணீர்', 'butter': 'வெண்ணெய்', 'ghee': 'நெய்', 'oil': 'எண்ணெய்',
  'salt': 'உப்பு', 'sugar': 'சர்க்கரை', 'pepper': 'மிளகு', 'chilli': 'மிளகாய்',
  'meal': 'உணவு', 'meals': 'உணவு', 'lunch': 'மதிய உணவு', 'dinner': 'இரவு உணவு',
  'breakfast': 'காலை உணவு', 'snacks': 'சிற்றுண்டி', 'sweet': 'இனிப்பு',
  'payasam': 'பாயசம்', 'halwa': 'அல்வா', 'laddu': 'லட்டு', 'jalebi': 'ஜிலேபி',
  'samosa': 'சமோசா', 'pakoda': 'பக்கோடா', 'bajji': 'பஜ்ஜி', 'vadai': 'வடை',
  'pongal': 'பொங்கல்', 'upma': 'உப்புமா', 'kesari': 'கேசரி', 'haleem': 'ஹலீம்',
  // Vegetables
  'tomato': 'தக்காளி', 'onion': 'வெங்காயம்', 'potato': 'உருளைக்கிழங்கு',
  'carrot': 'கேரட்', 'beans': 'பீன்ஸ்', 'cabbage': 'முட்டைக்கோஸ்',
  'brinjal': 'கத்திரிக்காய்', 'ladies finger': 'வெண்டைக்காய்', 'drumstick': 'முருங்கைக்காய்',
  // Fruits
  'banana': 'வாழைப்பழம்', 'apple': 'ஆப்பிள்', 'mango': 'மாம்பழம்', 'grape': 'திராட்சை',
  'orange': 'ஆரஞ்சு', 'coconut': 'தேங்காய்', 'lemon': 'எலுமிச்சை',
};

// Function to get Tamil translation for product name
function getProductTamilName(englishName: string): string {
  const lowerName = englishName.toLowerCase();
  
  // Check for exact match
  if (PRODUCT_TAMIL_MAP[lowerName]) {
    return PRODUCT_TAMIL_MAP[lowerName];
  }
  
  // Check for partial matches
  for (const [eng, tamil] of Object.entries(PRODUCT_TAMIL_MAP)) {
    if (lowerName.includes(eng)) {
      return tamil;
    }
  }
  
  return ''; // Return empty if no translation found
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return ' '.repeat(len - str.length) + str;
}

function formatCurrency(num: number): string {
  return num.toFixed(2);
}

function generateReceiptCommands(data: ReceiptData): string {
  const LINE_WIDTH = 32; // 58mm printer = 32 chars
  let receipt = '';
  
  // Initialize printer
  receipt += INIT;
  
  // TAKEAWAY header if parcel
  if (data.isParcel) {
    receipt += CENTER + BOLD_ON + DOUBLE_HEIGHT;
    receipt += '*** TAKEAWAY ***' + LF;
    if (data.enableBilingual) {
      receipt += NORMAL_SIZE;
      receipt += '(' + TAMIL_TRANSLATIONS['TAKEAWAY'] + ')' + LF;
    }
    receipt += NORMAL_SIZE + BOLD_OFF;
    receipt += LF;
  }
  
  // Company Header
  receipt += CENTER + BOLD_ON + DOUBLE_HEIGHT;
  receipt += data.companyName + LF;
  
  // Tamil company name
  if (data.enableBilingual && data.companyNameTamil) {
    receipt += NORMAL_SIZE;
    receipt += '(' + data.companyNameTamil + ')' + LF;
  }
  
  receipt += NORMAL_SIZE + BOLD_OFF;
  
  if (data.address) {
    receipt += data.address + LF;
  }
  
  const location = [data.city, data.state, data.pincode].filter(Boolean).join(', ');
  if (location) {
    receipt += location + LF;
  }
  
  if (data.phone) {
    receipt += 'Ph: ' + data.phone + LF;
  }
  
  if (data.gstin) {
    receipt += 'GSTIN: ' + data.gstin + LF;
  }
  
  // Separator
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // TAX INVOICE Header
  receipt += CENTER + BOLD_ON;
  receipt += 'TAX INVOICE' + LF;
  if (data.enableBilingual) {
    receipt += BOLD_OFF + '(' + TAMIL_TRANSLATIONS['TAX INVOICE'] + ')' + LF;
    receipt += BOLD_ON;
  }
  receipt += BOLD_OFF + LEFT;
  
  // Bill details
  const now = new Date();
  receipt += `Bill: ${data.billNumber}` + LF;
  receipt += `Date: ${now.toLocaleDateString()}  Time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` + LF;
  receipt += `Payment: ${data.paymentMode.toUpperCase()}` + LF;
  
  // Customer details
  if (data.customerName) {
    receipt += '-'.repeat(LINE_WIDTH) + LF;
    receipt += `Customer: ${data.customerName}` + LF;
    if (data.customerPhone) {
      receipt += `Phone: ${data.customerPhone}` + LF;
    }
    if (data.loyaltyPoints && data.loyaltyPoints > 0) {
      receipt += `Loyalty Points: ${data.loyaltyPoints}` + LF;
    }
  }
  
  // Items header
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  receipt += BOLD_ON;
  receipt += padRight('Item', 14) + padLeft('Qty', 5) + padLeft('Rate', 6) + padLeft('Amt', 7) + LF;
  receipt += BOLD_OFF;
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Items
  for (const item of data.items) {
    let itemName = item.name;
    if (itemName.length > 14) {
      // First line with values
      receipt += padRight(itemName.substring(0, 14), 14);
      const qtyLabel = item.price_type === 'weight' ? item.quantity.toFixed(2) : item.quantity.toString();
      receipt += padLeft(qtyLabel, 5);
      receipt += padLeft(formatCurrency(item.price), 6);
      receipt += padLeft(formatCurrency(item.price * item.quantity), 7) + LF;
      // Second line with remaining name
      receipt += itemName.substring(14) + LF;
    } else {
      receipt += padRight(itemName, 14);
      const qtyLabel = item.price_type === 'weight' ? item.quantity.toFixed(2) : item.quantity.toString();
      receipt += padLeft(qtyLabel, 5);
      receipt += padLeft(formatCurrency(item.price), 6);
      receipt += padLeft(formatCurrency(item.price * item.quantity), 7) + LF;
    }
    
    // Tamil name - use provided nameTamil or auto-translate
    if (data.enableBilingual) {
      const tamilName = item.nameTamil || getProductTamilName(item.name);
      if (tamilName) {
        receipt += '  (' + tamilName + ')' + LF;
      }
    }
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Totals
  receipt += padRight('Subtotal:', 18) + padLeft(formatCurrency(data.subtotal), 14) + LF;
  
  if (data.taxAmount > 0) {
    receipt += padRight('Tax:', 18) + padLeft(formatCurrency(data.taxAmount), 14) + LF;
  }
  
  if (data.discount && data.discount > 0) {
    receipt += padRight('Discount:', 18) + padLeft('-' + formatCurrency(data.discount), 14) + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Grand total
  receipt += BOLD_ON + DOUBLE_HEIGHT;
  receipt += padRight('TOTAL:', 14) + padLeft('Rs.' + formatCurrency(data.total), 18) + LF;
  if (data.enableBilingual) {
    receipt += NORMAL_SIZE;
    receipt += padRight('(' + TAMIL_TRANSLATIONS['TOTAL'] + ')', 14) + LF;
  }
  receipt += NORMAL_SIZE + BOLD_OFF;
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Thank you note
  receipt += CENTER;
  const thankYou = data.thankYouNote || 'Thank you for your business!';
  receipt += thankYou + LF;
  if (data.enableBilingual) {
    receipt += '(' + TAMIL_TRANSLATIONS['Thank you for your business!'] + ')' + LF;
  }
  
  // Feed and cut
  receipt += FEED_LINES(4);
  receipt += CUT_PAPER;
  
  return receipt;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const receiptData: ReceiptData = await req.json();
    
    console.log('Generating ESC/POS receipt for:', receiptData.billNumber);
    
    // Generate ESC/POS commands
    const escposCommands = generateReceiptCommands(receiptData);
    
    // Convert to base64 for transmission
    const encoder = new TextEncoder();
    const bytes = encoder.encode(escposCommands);
    const base64Commands = btoa(String.fromCharCode(...bytes));
    
    // Return the commands - client will send to local print service
    return new Response(
      JSON.stringify({
        success: true,
        billNumber: receiptData.billNumber,
        escposCommands: base64Commands,
        rawCommands: escposCommands,
        message: 'ESC/POS commands generated successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error: unknown) {
    console.error('Error generating receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
