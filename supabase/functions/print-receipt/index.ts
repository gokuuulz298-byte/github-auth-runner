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
  billingMode?: 'inclusive' | 'exclusive' | 'no_tax';
  inclusiveBillType?: 'mrp' | 'split';
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
const DOUBLE_HEIGHT_ON = ESC + '!' + '\x10';  // Double height using ESC !
const DOUBLE_WIDTH_HEIGHT = ESC + '!' + '\x30';  // Double width + height
const NORMAL_SIZE = ESC + '!' + '\x00';  // Normal size
const SMALL_SIZE = ESC + '!' + '\x00';  // Normal/small size
const CUT_PAPER = GS + 'V\x00';  // Full cut

const LINE_WIDTH = 32; // 58mm printer = 32 chars
const HALF_LINE_WIDTH = 16; // For double-height text

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

// Transliteration map for English to Tamil phonetic conversion
const TRANSLITERATION_MAP: { [key: string]: string } = {
  // Consonants with vowels
  'ka': 'கா', 'ki': 'கி', 'ku': 'கு', 'ke': 'கெ', 'ko': 'கோ',
  'ga': 'கா', 'gi': 'கி', 'gu': 'கு', 'ge': 'கெ', 'go': 'கோ',
  'cha': 'சா', 'chi': 'சி', 'chu': 'சு', 'che': 'செ', 'cho': 'சோ',
  'ja': 'ஜா', 'ji': 'ஜி', 'ju': 'ஜு', 'je': 'ஜெ', 'jo': 'ஜோ',
  'ta': 'டா', 'ti': 'டி', 'tu': 'டு', 'te': 'டெ', 'to': 'டோ',
  'tha': 'தா', 'thi': 'தி', 'thu': 'து', 'the': 'தெ', 'tho': 'தோ',
  'da': 'டா', 'di': 'டி', 'du': 'டு', 'de': 'டெ', 'do': 'டோ',
  'dha': 'தா', 'dhi': 'தி', 'dhu': 'து', 'dhe': 'தெ', 'dho': 'தோ',
  'na': 'நா', 'ni': 'நி', 'nu': 'நு', 'ne': 'நெ', 'no': 'நோ',
  'pa': 'பா', 'pi': 'பி', 'pu': 'பு', 'pe': 'பெ', 'po': 'போ',
  'ba': 'பா', 'bi': 'பி', 'bu': 'பு', 'be': 'பெ', 'bo': 'போ',
  'ma': 'மா', 'mi': 'மி', 'mu': 'மு', 'me': 'மெ', 'mo': 'மோ',
  'ya': 'யா', 'yi': 'யி', 'yu': 'யு', 'ye': 'யெ', 'yo': 'யோ',
  'ra': 'ரா', 'ri': 'ரி', 'ru': 'ரு', 're': 'ரெ', 'ro': 'ரோ',
  'la': 'லா', 'li': 'லி', 'lu': 'லு', 'le': 'லெ', 'lo': 'லோ',
  'va': 'வா', 'vi': 'வி', 'vu': 'வு', 've': 'வெ', 'vo': 'வோ',
  'wa': 'வா', 'wi': 'வி', 'wu': 'வு', 'we': 'வெ', 'wo': 'வோ',
  'sa': 'சா', 'si': 'சி', 'su': 'சு', 'se': 'செ', 'so': 'சோ',
  'sha': 'ஷா', 'shi': 'ஷி', 'shu': 'ஷு', 'she': 'ஷெ', 'sho': 'ஷோ',
  'ha': 'ஹா', 'hi': 'ஹி', 'hu': 'ஹு', 'he': 'ஹெ', 'ho': 'ஹோ',
  'fa': 'ஃபா', 'fi': 'ஃபி', 'fu': 'ஃபு', 'fe': 'ஃபெ', 'fo': 'ஃபோ',
  // Single consonants with implicit 'a'
  'k': 'க்', 'g': 'க்', 'ch': 'ச்', 'j': 'ஜ்', 't': 'ட்', 'd': 'ட்',
  'n': 'ந்', 'p': 'ப்', 'b': 'ப்', 'm': 'ம்', 'y': 'ய்', 'r': 'ர்',
  'l': 'ல்', 'v': 'வ்', 'w': 'வ்', 's': 'ஸ்', 'h': 'ஹ்', 'f': 'ஃப்',
  // Vowels
  'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'u': 'உ', 'uu': 'ஊ',
  'e': 'எ', 'ee': 'ஏ', 'ai': 'ஐ', 'o': 'ஒ', 'oo': 'ஓ', 'au': 'ஔ',
  // Common patterns
  'is': 'இஸ்', 'er': 'ர்', 'es': 'ஸ்', 'ks': 'க்ஸ்',
};

// Common product name transliterations (phonetic Tamil - NOT translations)
const PRODUCT_TRANSLITERATION_MAP: { [key: string]: string } = {
  // Biscuits - TRANSLITERATION (how it sounds in Tamil)
  'lotus biscoff': 'லோட்டஸ் பிஸ்காஃப்',
  'biscoff': 'பிஸ்காஃப்',
  'milk bikis': 'மில்க் பிகிஸ்',
  'bikis': 'பிகிஸ்',
  'good day': 'குட் டே',
  'bourbon': 'போர்பன்',
  'marie': 'மேரி',
  'parle-g': 'பார்லே-ஜி',
  'parle g': 'பார்லே ஜி',
  'parle': 'பார்லே',
  'oreo': 'ஓரியோ',
  'hide & seek': 'ஹைட் அண்ட் சீக்',
  'hide and seek': 'ஹைட் அண்ட் சீக்',
  'britannia': 'பிரிட்டானியா',
  'sunfeast': 'சன்ஃபீஸ்ட்',
  'mcvities': 'மெக்விட்டீஸ்',
  'digestive': 'டைஜெஸ்டிவ்',
  'cream': 'க்ரீம்',
  'biscuit': 'பிஸ்கட்',
  'biscuits': 'பிஸ்கட்ஸ்',
  'cookies': 'குக்கீஸ்',
  'cookie': 'குக்கீ',
  
  // Chocolates - TRANSLITERATION
  'ferrero rocher': 'ஃபெரேரோ ரோஷர்',
  'fer roch': 'ஃபெர் ரோச்',
  'kitkat': 'கிட்கேட்',
  'kit kat': 'கிட் கேட்',
  'dairy milk': 'டேரி மில்க்',
  'cadbury': 'கேட்பரி',
  'snickers': 'ஸ்னிக்கர்ஸ்',
  'mars': 'மார்ஸ்',
  'twix': 'ட்விக்ஸ்',
  'bounty': 'பவுண்டி',
  'galaxy': 'கேலக்ஸி',
  'nestle': 'நெஸ்லே',
  'milkybar': 'மில்கிபார்',
  'munch': 'மஞ்ச்',
  'perk': 'பெர்க்',
  '5star': 'ஃபைவ் ஸ்டார்',
  'five star': 'ஃபைவ் ஸ்டார்',
  'gems': 'ஜெம்ஸ்',
  'eclairs': 'எக்லேர்ஸ்',
  'chocolate': 'சாக்லேட்',
  
  // Drinks - TRANSLITERATION
  'coca cola': 'கோகா கோலா',
  'coke': 'கோக்',
  'pepsi': 'பெப்சி',
  'sprite': 'ஸ்ப்ரைட்',
  'fanta': 'ஃபேண்டா',
  'limca': 'லிம்கா',
  'thumbs up': 'தம்ஸ் அப்',
  'maaza': 'மாசா',
  'frooti': 'ஃப்ரூட்டி',
  'slice': 'ஸ்லைஸ்',
  'mountain dew': 'மவுண்டன் டியூ',
  'redbull': 'ரெட்புல்',
  'red bull': 'ரெட் புல்',
  'monster': 'மான்ஸ்டர்',
  
  // Common food items - TRANSLITERATION (phonetic, not meaning)
  'rice': 'ரைஸ்',
  'biryani': 'பிரியாணி',
  'chicken': 'சிக்கன்',
  'mutton': 'மட்டன்',
  'fish': 'ஃபிஷ்',
  'egg': 'எக்',
  'dosa': 'தோசை',
  'idli': 'இட்லி',
  'vada': 'வடை',
  'sambar': 'சாம்பார்',
  'rasam': 'ரசம்',
  'curd': 'கர்ட்',
  'chutney': 'சட்னி',
  'parotta': 'பரோட்டா',
  'chapati': 'சப்பாத்தி',
  'naan': 'நான்',
  'roti': 'ரோட்டி',
  'puri': 'பூரி',
  'paneer': 'பன்னீர்',
  'dal': 'தால்',
  'curry': 'கறி',
  'gravy': 'கிரேவி',
  'fry': 'ஃப்ரை',
  'masala': 'மசாலா',
  'tea': 'டீ',
  'coffee': 'காஃபி',
  'milk': 'மில்க்',
  'juice': 'ஜூஸ்',
  'water': 'வாட்டர்',
  'butter': 'பட்டர்',
  'ghee': 'கீ',
  'oil': 'ஆயில்',
  'salt': 'சால்ட்',
  'sugar': 'சுகர்',
  'pepper': 'பெப்பர்',
  'chilli': 'சில்லி',
  'meal': 'மீல்',
  'meals': 'மீல்ஸ்',
  'lunch': 'லன்ச்',
  'dinner': 'டின்னர்',
  'breakfast': 'பிரேக்ஃபாஸ்ட்',
  'snacks': 'ஸ்நாக்ஸ்',
  'sweet': 'ஸ்வீட்',
  'payasam': 'பாயசம்',
  'halwa': 'அல்வா',
  'laddu': 'லட்டு',
  'jalebi': 'ஜிலேபி',
  'samosa': 'சமோசா',
  'pakoda': 'பக்கோடா',
  'bajji': 'பஜ்ஜி',
  'pongal': 'பொங்கல்',
  'upma': 'உப்புமா',
  'kesari': 'கேசரி',
  
  // Dairy
  'aavin': 'ஆவின்',
  'premium': 'பிரீமியம்',
  'amul': 'அமுல்',
  
  // Common brands/products
  'lays': 'லேஸ்',
  'kurkure': 'குர்குரே',
  'haldirams': 'ஹல்தீராம்ஸ்',
  'maggi': 'மேகி',
  'noodles': 'நூடுல்ஸ்',
  'pasta': 'பாஸ்தா',
  'bread': 'பிரெட்',
  'cake': 'கேக்',
  'chips': 'சிப்ஸ்',
};

// Function to get Tamil transliteration for product name
function getProductTamilName(englishName: string): string {
  const lowerName = englishName.toLowerCase().trim();
  
  // Check for exact match in transliteration map
  if (PRODUCT_TRANSLITERATION_MAP[lowerName]) {
    return PRODUCT_TRANSLITERATION_MAP[lowerName];
  }
  
  // Try to find partial matches and build transliteration
  let result = lowerName;
  const words = lowerName.split(/\s+/);
  const transliteratedWords: string[] = [];
  
  for (const word of words) {
    if (PRODUCT_TRANSLITERATION_MAP[word]) {
      transliteratedWords.push(PRODUCT_TRANSLITERATION_MAP[word]);
    } else {
      // Try basic transliteration for unknown words
      transliteratedWords.push(basicTransliterate(word));
    }
  }
  
  return transliteratedWords.join(' ');
}

// Basic character-by-character transliteration
function basicTransliterate(word: string): string {
  let result = '';
  let i = 0;
  const lower = word.toLowerCase();
  
  while (i < lower.length) {
    let matched = false;
    
    // Try to match longer patterns first (3 chars, 2 chars, 1 char)
    for (let len = 3; len >= 1; len--) {
      const substr = lower.substring(i, i + len);
      if (TRANSLITERATION_MAP[substr]) {
        result += TRANSLITERATION_MAP[substr];
        i += len;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Keep the character as-is if no mapping found
      result += lower[i];
      i++;
    }
  }
  
  return result;
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return ' '.repeat(len - str.length) + str;
}

function centerText(str: string, width: number): string {
  if (str.length >= width) return str.substring(0, width);
  const padding = Math.floor((width - str.length) / 2);
  return ' '.repeat(padding) + str + ' '.repeat(width - str.length - padding);
}

function formatCurrency(num: number): string {
  return num.toFixed(2);
}

// Round to nearest rupee (standard Indian rounding)
function roundToNearestRupee(amount: number): { roundedTotal: number; roundOff: number } {
  const roundedTotal = Math.round(amount);
  const roundOff = roundedTotal - amount;
  return { roundedTotal, roundOff };
}

// Wrap text to fit within a specified width
function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxWidth) {
      lines.push(remaining);
      break;
    }
    // Try to break at a space
    let breakPoint = remaining.lastIndexOf(' ', maxWidth);
    if (breakPoint <= 0) breakPoint = maxWidth;
    lines.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }
  return lines;
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
  
  // Company Header - centered, bold
  // Use normal size for company name to prevent cutoff
  receipt += CENTER + BOLD_ON;
  const companyName = data.companyName.toUpperCase();
  const nameLines = wrapText(companyName, LINE_WIDTH);
  for (const line of nameLines) {
    receipt += line + LF;
  }
  receipt += BOLD_OFF;
  
  // Tamil company name on separate line (if bilingual)
  if (data.enableBilingual && data.companyNameTamil) {
    receipt += CENTER;
    receipt += '(' + data.companyNameTamil + ')' + LF;
  }
  
  // Address section - centered
  receipt += CENTER;
  
  // Address - wrap and center each line
  if (data.address) {
    const addressLines = wrapText(data.address, LINE_WIDTH);
    for (const line of addressLines) {
      receipt += line + LF;
    }
  }
  
  // City, State - Pincode
  const location = [data.city, data.state].filter(Boolean).join(', ');
  if (location || data.pincode) {
    const locationStr = [location, data.pincode].filter(Boolean).join(' - ');
    const locLines = wrapText(locationStr, LINE_WIDTH);
    for (const line of locLines) {
      receipt += line + LF;
    }
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
  // Header for item columns
  receipt += padRight('Item', 12) + padLeft('Qty', 4) + padLeft('Rate', 8) + padLeft('Amt', 8) + LF;
  receipt += BOLD_OFF;
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Items - PROFESSIONAL MULTI-LINE LAYOUT
  for (const item of data.items) {
    const qtyStr = item.price_type === 'weight' ? item.quantity.toFixed(2) : item.quantity.toString();
    const rateStr = formatCurrency(item.price);
    const amount = item.price * item.quantity;
    const amtStr = formatCurrency(amount);
    
    const itemName = item.name;
    
    // Line 1: English item name (wrap if longer than LINE_WIDTH)
    const nameLines = wrapText(itemName, LINE_WIDTH);
    for (const line of nameLines) {
      receipt += line + LF;
    }
    
    // Line 2: Tamil name in brackets (if bilingual) - using TRANSLITERATION
    if (data.enableBilingual) {
      const tamilName = item.nameTamil || getProductTamilName(item.name);
      if (tamilName) {
        const tamilLine = '(' + tamilName + ')';
        const tamilLines = wrapText(tamilLine, LINE_WIDTH);
        for (const line of tamilLines) {
          receipt += line + LF;
        }
      }
    }
    
    // Line 3: Numbers ONLY - Qty, Rate, Amt right-aligned
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
  
  // Show tax based on billing mode
  const showTax = data.billingMode !== 'no_tax' && 
    !(data.billingMode === 'inclusive' && data.inclusiveBillType === 'mrp');
  
  if (showTax && data.taxAmount > 0) {
    // Show CGST/SGST split for better clarity
    const halfTax = data.taxAmount / 2;
    const cgstLabel = 'CGST:';
    const cgstVal = formatCurrency(halfTax);
    receipt += cgstLabel + ' '.repeat(LINE_WIDTH - cgstLabel.length - cgstVal.length) + cgstVal + LF;
    
    const sgstLabel = 'SGST:';
    const sgstVal = formatCurrency(halfTax);
    receipt += sgstLabel + ' '.repeat(LINE_WIDTH - sgstLabel.length - sgstVal.length) + sgstVal + LF;
  }
  
  if (data.discount && data.discount > 0) {
    const discLabel = 'Discount:';
    const discVal = '-' + formatCurrency(data.discount);
    receipt += discLabel + ' '.repeat(LINE_WIDTH - discLabel.length - discVal.length) + discVal + LF;
  }
  
  // Calculate round-off
  const { roundedTotal, roundOff } = roundToNearestRupee(data.total);
  
  // Show round-off if it's not zero
  if (Math.abs(roundOff) >= 0.01) {
    const roundLabel = 'Round Off:';
    const roundVal = (roundOff >= 0 ? '+' : '') + formatCurrency(roundOff);
    receipt += roundLabel + ' '.repeat(LINE_WIDTH - roundLabel.length - roundVal.length) + roundVal + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Grand total (bold, normal size to prevent cutoff)
  receipt += LEFT + BOLD_ON;
  const totalLabel = 'TOTAL:';
  const totalVal = 'Rs.' + roundedTotal.toFixed(2);
  receipt += totalLabel + ' '.repeat(Math.max(1, LINE_WIDTH - totalLabel.length - totalVal.length)) + totalVal + LF;
  receipt += BOLD_OFF;
  
  // Tamil translation for TOTAL on a SEPARATE line with spacing
  if (data.enableBilingual) {
    receipt += LF;  // Extra line break
    receipt += CENTER;
    receipt += '(' + TAMIL_TRANSLATIONS['TOTAL'] + ')' + LF;
    receipt += LF;  // Extra line break after Tamil
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Thank you note (centered)
  receipt += CENTER + BOLD_ON;
  const thankYou = data.thankYouNote || 'Thank you for your business!';
  const thankYouLines = wrapText(thankYou, LINE_WIDTH);
  for (const line of thankYouLines) {
    receipt += line + LF;
  }
  receipt += BOLD_OFF;
  
  // Tamil translation for Thank You on SEPARATE line with spacing
  if (data.enableBilingual) {
    receipt += LF;  // Extra line break
    receipt += CENTER;
    receipt += '(' + TAMIL_TRANSLATIONS['Thank You!'] + ')' + LF;
    receipt += LF;  // Extra line break after Tamil
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
