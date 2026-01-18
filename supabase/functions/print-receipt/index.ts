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

// ESC/POS Commands - using hex values directly
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';

// Commands - properly formatted
const INIT = ESC + '@';  // Initialize printer
const CENTER = ESC + 'a\x01';  // Center align
const LEFT = ESC + 'a\x00';  // Left align
const BOLD_ON = ESC + 'E\x01';
const BOLD_OFF = ESC + 'E\x00';
const DOUBLE_HEIGHT_ON = GS + '!\x10';  // Use GS ! for size - double height
const DOUBLE_WIDTH_HEIGHT = GS + '!\x11';  // Double width + height
const NORMAL_SIZE = GS + '!\x00';  // Normal size
const CUT_PAPER = GS + 'V\x00';  // Full cut

const LINE_WIDTH = 32; // 58mm printer = 32 chars

// Tamil Unicode translations for common terms
const TAMIL_TRANSLATIONS: { [key: string]: string } = {
  'TAX INVOICE': 'வரி இரசீது',
  'TAKEAWAY': 'எடுத்துச்செல்ல',
  'Bill': 'ரசீது',
  'Date': 'தேதி',
  'Time': 'நேரம்',
  'Mode': 'முறை',
  'Customer': 'வாடிக்கையாளர்',
  'Phone': 'தொலைபேசி',
  'Points': 'புள்ளிகள்',
  'Item': 'பொருள்',
  'Qty': 'அளவு',
  'Rate': 'விலை',
  'Amt': 'தொகை',
  'Subtotal': 'உப மொத்தம்',
  'Tax': 'வரி',
  'Discount': 'தள்ளுபடி',
  'TOTAL': 'மொத்தம்',
  'Thank You!': 'நன்றி!',
  'CASH': 'ரொக்கம்',
  'UPI': 'யூபிஐ',
  'CARD': 'அட்டை',
};

// Common product name translations to Tamil Unicode
const PRODUCT_TAMIL_MAP: { [key: string]: string } = {
  // Biscuits and snacks
  'lotus biscoff': 'லோட்டஸ் பிஸ்காஃப்',
  'biscoff': 'பிஸ்காஃப்',
  'milk bikis': 'மில்க் பிகிஸ்',
  'bikis': 'பிகிஸ்',
  'good day': 'குட் டே',
  'bourbon': 'போர்பன்',
  'marie': 'மேரி',
  'parle-g': 'பார்லே-ஜி',
  'parle': 'பார்லே',
  'oreo': 'ஓரியோ',
  'hide & seek': 'ஹைட் & சீக்',
  
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
  // Dairy
  'aavin': 'ஆவின்', 'premium': 'பிரீமியம்',
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
  let receipt = '';
  
  // Initialize printer
  receipt += INIT;
  receipt += LF; // Add a line feed after init
  
  // TAKEAWAY header if parcel
  if (data.isParcel) {
    receipt += CENTER + BOLD_ON + DOUBLE_HEIGHT_ON;
    receipt += '*** TAKEAWAY ***' + LF;
    receipt += NORMAL_SIZE + BOLD_OFF;
    if (data.enableBilingual) {
      receipt += CENTER;
      receipt += '(' + TAMIL_TRANSLATIONS['TAKEAWAY'] + ')' + LF;
    }
    receipt += LF;
  }
  
  // Company Header - English (centered, bold, double height)
  receipt += CENTER + BOLD_ON + DOUBLE_HEIGHT_ON;
  receipt += data.companyName.toUpperCase() + LF;
  receipt += NORMAL_SIZE + BOLD_OFF;
  
  // Tamil company name on separate line (if bilingual)
  if (data.enableBilingual && data.companyNameTamil) {
    receipt += CENTER;
    receipt += '(' + data.companyNameTamil + ')' + LF;
  }
  
  // Address section - left aligned for better readability
  receipt += CENTER;
  
  // Address - each part on separate line
  if (data.address) {
    receipt += data.address + LF;
  }
  
  // City, State - Pincode
  const location = [data.city, data.state].filter(Boolean).join(', ');
  if (location || data.pincode) {
    receipt += [location, data.pincode].filter(Boolean).join(' - ') + LF;
  }
  
  if (data.phone) {
    receipt += 'Ph: ' + data.phone + LF;
  }
  
  if (data.gstin) {
    receipt += 'GSTIN: ' + data.gstin + LF;
  }
  
  // Separator
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // TAX INVOICE Header (centered, bold)
  receipt += CENTER + BOLD_ON;
  receipt += 'TAX INVOICE' + LF;
  receipt += BOLD_OFF;
  if (data.enableBilingual) {
    receipt += '(' + TAMIL_TRANSLATIONS['TAX INVOICE'] + ')' + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Bill details - formatted layout (left aligned)
  receipt += LEFT;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  
  // Line 1: Bill number and Mode (properly spaced)
  const billInfo = `Bill: ${data.billNumber}`;
  const modeInfo = `Mode: ${data.paymentMode.toUpperCase()}`;
  receipt += billInfo + ' '.repeat(Math.max(1, LINE_WIDTH - billInfo.length - modeInfo.length)) + modeInfo + LF;
  
  // Line 2: Date and Time
  const dateInfo = `Date: ${dateStr}`;
  const timeInfo = `Time: ${timeStr}`;
  receipt += dateInfo + ' '.repeat(Math.max(1, LINE_WIDTH - dateInfo.length - timeInfo.length)) + timeInfo + LF;
  
  // Customer details (if present)
  if (data.customerName || data.customerPhone) {
    receipt += '-'.repeat(LINE_WIDTH) + LF;
    if (data.customerName) {
      receipt += 'Customer: ' + data.customerName + LF;
    }
    if (data.customerPhone) {
      receipt += 'Phone: ' + data.customerPhone + LF;
    }
    if (data.loyaltyPoints && data.loyaltyPoints > 0) {
      receipt += 'Loyalty Points: ' + data.loyaltyPoints + LF;
    }
  }
  
  // Items header
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  receipt += BOLD_ON;
  // Header for item columns - Qty(4) Rate(8) Amt(8) = 20 chars, right-aligned on 32-char line
  receipt += padRight('Item', 12) + padLeft('Qty', 4) + padLeft('Rate', 8) + padLeft('Amt', 8) + LF;
  receipt += BOLD_OFF;
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Items - PROFESSIONAL MULTI-LINE LAYOUT
  // Rule: Numbers NEVER share a line with variable-length text
  // Line 1: English item name (wrapped if needed)
  // Line 2: Tamil name in brackets (if bilingual)
  // Line 3: Qty / Rate / Amt → numbers only, right-aligned
  for (const item of data.items) {
    const qtyStr = item.price_type === 'weight' ? item.quantity.toFixed(2) : item.quantity.toString();
    const rateStr = formatCurrency(item.price);
    const amount = item.price * item.quantity;
    const amtStr = formatCurrency(amount);
    
    const itemName = item.name;
    
    // Line 1: English item name (wrap if longer than LINE_WIDTH)
    if (itemName.length <= LINE_WIDTH) {
      receipt += itemName + LF;
    } else {
      // Wrap long item names
      let remaining = itemName;
      while (remaining.length > 0) {
        receipt += remaining.substring(0, LINE_WIDTH) + LF;
        remaining = remaining.substring(LINE_WIDTH);
      }
    }
    
    // Line 2: Tamil name in brackets (if bilingual)
    if (data.enableBilingual) {
      const tamilName = item.nameTamil || getProductTamilName(item.name);
      if (tamilName) {
        const tamilLine = '(' + tamilName + ')';
        if (tamilLine.length <= LINE_WIDTH) {
          receipt += tamilLine + LF;
        } else {
          // Wrap long Tamil names
          let remaining = tamilLine;
          while (remaining.length > 0) {
            receipt += remaining.substring(0, LINE_WIDTH) + LF;
            remaining = remaining.substring(LINE_WIDTH);
          }
        }
      }
    }
    
    // Line 3: Numbers ONLY - Qty, Rate, Amt right-aligned
    // Format: spaces(12) + Qty(4) + Rate(8) + Amt(8) = 32 chars
    const numericLine = ' '.repeat(12) + padLeft(qtyStr, 4) + padLeft(rateStr, 8) + padLeft(amtStr, 8);
    receipt += numericLine + LF;
    
    // Empty line between items for readability
    receipt += LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Totals section - right aligned values
  const subtotalLabel = 'Subtotal:';
  const subtotalVal = formatCurrency(data.subtotal);
  receipt += subtotalLabel + ' '.repeat(LINE_WIDTH - subtotalLabel.length - subtotalVal.length) + subtotalVal + LF;
  
  if (data.taxAmount > 0) {
    const taxLabel = 'Tax:';
    const taxVal = formatCurrency(data.taxAmount);
    receipt += taxLabel + ' '.repeat(LINE_WIDTH - taxLabel.length - taxVal.length) + taxVal + LF;
  }
  
  if (data.discount && data.discount > 0) {
    const discLabel = 'Discount:';
    const discVal = '-' + formatCurrency(data.discount);
    receipt += discLabel + ' '.repeat(LINE_WIDTH - discLabel.length - discVal.length) + discVal + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Grand total (bold, double height)
  // Note: Double height halves the effective line width to ~16 chars
  receipt += BOLD_ON + DOUBLE_HEIGHT_ON;
  const totalLabel = 'TOTAL:';
  const totalVal = 'Rs.' + formatCurrency(data.total);
  // For double-height, we have ~16 char width, so calculate spacing
  const totalSpacing = Math.max(1, 16 - totalLabel.length - totalVal.length);
  receipt += totalLabel + ' '.repeat(totalSpacing) + totalVal + LF;
  receipt += NORMAL_SIZE + BOLD_OFF;
  
  if (data.enableBilingual) {
    receipt += '(' + TAMIL_TRANSLATIONS['TOTAL'] + ')' + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Thank you note (centered)
  receipt += CENTER + BOLD_ON;
  const thankYou = data.thankYouNote || 'Thank you for your business!';
  receipt += thankYou + LF;
  receipt += BOLD_OFF;
  if (data.enableBilingual) {
    receipt += '(' + TAMIL_TRANSLATIONS['Thank You!'] + ')' + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Feed and cut
  receipt += LF + LF + LF + LF;
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
    
    // Log preview for debugging - strip all control characters
    console.log('================ BILL PREVIEW ================');
    const previewText = escposCommands.replace(/[\x00-\x1F\x7F]/g, '');
    console.log(previewText);
    console.log('============== END BILL PREVIEW ==============');
    
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
