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

// Common product name transliterations (phonetic Tamil)
const PRODUCT_TRANSLITERATION_MAP: { [key: string]: string } = {
  // Biscuits
  'lotus biscoff': 'லோட்டஸ் பிஸ்காஃப்',
  'biscoff': 'பிஸ்காஃப்',
  'milk bikis': 'மில்க் பிகிஸ்',
  'good day': 'குட் டே',
  'bourbon': 'போர்பன்',
  'marie': 'மேரி',
  'parle-g': 'பார்லே-ஜி',
  'parle': 'பார்லே',
  'oreo': 'ஓரியோ',
  'britannia': 'பிரிட்டானியா',
  'sunfeast': 'சன்ஃபீஸ்ட்',
  'biscuit': 'பிஸ்கட்',
  'cookies': 'குக்கீஸ்',
  
  // Chocolates
  'ferrero rocher': 'ஃபெரேரோ ரோஷர்',
  'fer roch': 'ஃபெர் ரோச்',
  'kitkat': 'கிட்கேட்',
  'dairy milk': 'டேரி மில்க்',
  'cadbury': 'கேட்பரி',
  'snickers': 'ஸ்னிக்கர்ஸ்',
  'nestle': 'நெஸ்லே',
  'munch': 'மஞ்ச்',
  'perk': 'பெர்க்',
  '5star': 'ஃபைவ் ஸ்டார்',
  'chocolate': 'சாக்லேட்',
  
  // Drinks
  'coca cola': 'கோகா கோலா',
  'pepsi': 'பெப்சி',
  'sprite': 'ஸ்ப்ரைட்',
  'fanta': 'ஃபேண்டா',
  'limca': 'லிம்கா',
  'thumbs up': 'தம்ஸ் அப்',
  'maaza': 'மாசா',
  'frooti': 'ஃப்ரூட்டி',
  
  // Food items
  'rice': 'ரைஸ்',
  'biryani': 'பிரியாணி',
  'chicken': 'சிக்கன்',
  'mutton': 'மட்டன்',
  'fish': 'ஃபிஷ்',
  'dosa': 'தோசை',
  'idli': 'இட்லி',
  'vada': 'வடை',
  'sambar': 'சாம்பார்',
  'parotta': 'பரோட்டா',
  'chapati': 'சப்பாத்தி',
  'naan': 'நான்',
  'paneer': 'பன்னீர்',
  'tea': 'டீ',
  'coffee': 'காஃபி',
  'milk': 'மில்க்',
  'juice': 'ஜூஸ்',
  'meals': 'மீல்ஸ்',
  
  // Common brands
  'lays': 'லேஸ்',
  'kurkure': 'குர்குரே',
  'maggi': 'மேகி',
  'noodles': 'நூடுல்ஸ்',
  'bread': 'பிரெட்',
  'cake': 'கேக்',
  'chips': 'சிப்ஸ்',
  'aavin': 'ஆவின்',
  'amul': 'அமுல்',
};

// Transliteration map for English to Tamil phonetic conversion
const TRANSLITERATION_MAP: { [key: string]: string } = {
  'ka': 'கா', 'ki': 'கி', 'ku': 'கு', 'ke': 'கெ', 'ko': 'கோ',
  'ga': 'கா', 'gi': 'கி', 'gu': 'கு', 'ge': 'கெ', 'go': 'கோ',
  'cha': 'சா', 'chi': 'சி', 'chu': 'சு', 'che': 'செ', 'cho': 'சோ',
  'ja': 'ஜா', 'ji': 'ஜி', 'ju': 'ஜு', 'je': 'ஜெ', 'jo': 'ஜோ',
  'ta': 'டா', 'ti': 'டி', 'tu': 'டு', 'te': 'டெ', 'to': 'டோ',
  'tha': 'தா', 'thi': 'தி', 'thu': 'து', 'the': 'தெ', 'tho': 'தோ',
  'na': 'நா', 'ni': 'நி', 'nu': 'நு', 'ne': 'நெ', 'no': 'நோ',
  'pa': 'பா', 'pi': 'பி', 'pu': 'பு', 'pe': 'பெ', 'po': 'போ',
  'ba': 'பா', 'bi': 'பி', 'bu': 'பு', 'be': 'பெ', 'bo': 'போ',
  'ma': 'மா', 'mi': 'மி', 'mu': 'மு', 'me': 'மெ', 'mo': 'மோ',
  'ya': 'யா', 'yi': 'யி', 'yu': 'யு', 'ye': 'யெ', 'yo': 'யோ',
  'ra': 'ரா', 'ri': 'ரி', 'ru': 'ரு', 're': 'ரெ', 'ro': 'ரோ',
  'la': 'லா', 'li': 'லி', 'lu': 'லு', 'le': 'லெ', 'lo': 'லோ',
  'va': 'வா', 'vi': 'வி', 'vu': 'வு', 've': 'வெ', 'vo': 'வோ',
  'sa': 'சா', 'si': 'சி', 'su': 'சு', 'se': 'செ', 'so': 'சோ',
  'sha': 'ஷா', 'shi': 'ஷி', 'shu': 'ஷு', 'she': 'ஷெ', 'sho': 'ஷோ',
  'ha': 'ஹா', 'hi': 'ஹி', 'hu': 'ஹு', 'he': 'ஹெ', 'ho': 'ஹோ',
  'fa': 'ஃபா', 'fi': 'ஃபி', 'fu': 'ஃபு', 'fe': 'ஃபெ', 'fo': 'ஃபோ',
  'k': 'க்', 'g': 'க்', 'ch': 'ச்', 'j': 'ஜ்', 't': 'ட்', 'd': 'ட்',
  'n': 'ந்', 'p': 'ப்', 'b': 'ப்', 'm': 'ம்', 'y': 'ய்', 'r': 'ர்',
  'l': 'ல்', 'v': 'வ்', 's': 'ஸ்', 'h': 'ஹ்', 'f': 'ஃப்',
  'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'u': 'உ', 'uu': 'ஊ',
  'e': 'எ', 'ee': 'ஏ', 'ai': 'ஐ', 'o': 'ஒ', 'oo': 'ஓ', 'au': 'ஔ',
};

// Basic character-by-character transliteration
function basicTransliterate(word: string): string {
  let result = '';
  let i = 0;
  const lower = word.toLowerCase();
  
  while (i < lower.length) {
    let matched = false;
    
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
      result += lower[i];
      i++;
    }
  }
  
  return result;
}

// Get Tamil transliteration for product name
function getProductTamilName(englishName: string): string {
  const lowerName = englishName.toLowerCase().trim();
  
  if (PRODUCT_TRANSLITERATION_MAP[lowerName]) {
    return PRODUCT_TRANSLITERATION_MAP[lowerName];
  }
  
  const words = lowerName.split(/\s+/);
  const transliteratedWords: string[] = [];
  
  for (const word of words) {
    if (PRODUCT_TRANSLITERATION_MAP[word]) {
      transliteratedWords.push(PRODUCT_TRANSLITERATION_MAP[word]);
    } else {
      transliteratedWords.push(basicTransliterate(word));
    }
  }
  
  return transliteratedWords.join(' ');
}

function formatCurrency(num: number): string {
  return num.toFixed(2);
}

// Round to nearest rupee
function roundToNearestRupee(amount: number): { roundedTotal: number; roundOff: number } {
  const roundedTotal = Math.round(amount);
  const roundOff = roundedTotal - amount;
  return { roundedTotal, roundOff };
}

/**
 * Generate HTML receipt for image-based printing
 * This HTML will be converted to PNG by the local print service
 * The PNG is then sent to the printer as an ESC/POS image command
 */
function generateReceiptHTML(data: ReceiptData): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  
  const showTax = data.billingMode !== 'no_tax' && 
    !(data.billingMode === 'inclusive' && data.inclusiveBillType === 'mrp');
  
  const { roundedTotal, roundOff } = roundToNearestRupee(data.total);
  
  // Build items HTML
  let itemsHtml = '';
  for (const item of data.items) {
    const qtyStr = item.price_type === 'weight' ? item.quantity.toFixed(2) : item.quantity.toString();
    const amount = item.price * item.quantity;
    const tamilName = data.enableBilingual ? (item.nameTamil || getProductTamilName(item.name)) : null;
    
    itemsHtml += `
      <tr>
        <td style="text-align:left; padding: 2px 0;">
          <div>${escapeHtml(item.name)}</div>
          ${tamilName ? `<div style="font-size: 10px; color: #555;">${escapeHtml(tamilName)}</div>` : ''}
        </td>
        <td style="text-align:center; padding: 2px;">${qtyStr}</td>
        <td style="text-align:right; padding: 2px;">${formatCurrency(item.price)}</td>
        <td style="text-align:right; padding: 2px;">${formatCurrency(amount)}</td>
      </tr>
    `;
  }
  
  // Generate the full HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 384px; /* 58mm at 203 DPI */
      background: white;
      color: black;
      padding: 8px;
    }
    
    .tamil {
      font-family: 'Noto Sans Tamil', sans-serif;
    }
    
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .separator { border-top: 1px dashed #000; margin: 6px 0; }
    
    .header { margin-bottom: 8px; }
    .company-name { font-size: 16px; font-weight: bold; }
    .company-tamil { font-size: 13px; }
    
    table { width: 100%; border-collapse: collapse; }
    th { font-weight: bold; border-bottom: 1px solid #000; padding: 4px 2px; }
    
    .totals { margin-top: 8px; }
    .total-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .grand-total { font-size: 14px; font-weight: bold; margin-top: 4px; padding: 4px 0; border-top: 1px solid #000; }
    
    .footer { margin-top: 10px; text-align: center; }
  </style>
</head>
<body>
  ${data.isParcel ? `
    <div class="center bold" style="font-size: 14px; margin-bottom: 8px;">
      *** TAKEAWAY ***
      ${data.enableBilingual ? `<div class="tamil" style="font-size: 12px;">(${TAMIL_TRANSLATIONS['TAKEAWAY']})</div>` : ''}
    </div>
  ` : ''}
  
  <div class="header center">
    <div class="company-name">${escapeHtml(data.companyName.toUpperCase())}</div>
    ${data.enableBilingual && data.companyNameTamil ? `<div class="company-tamil tamil">(${escapeHtml(data.companyNameTamil)})</div>` : ''}
    ${data.address ? `<div style="font-size: 11px;">${escapeHtml(data.address)}</div>` : ''}
    ${(data.city || data.state || data.pincode) ? `<div style="font-size: 11px;">${[data.city, data.state].filter(Boolean).join(', ')}${data.pincode ? ' - ' + data.pincode : ''}</div>` : ''}
    ${data.phone ? `<div style="font-size: 11px;">Ph: ${escapeHtml(data.phone)}</div>` : ''}
    ${data.gstin ? `<div style="font-size: 10px;">GSTIN: ${escapeHtml(data.gstin)}</div>` : ''}
  </div>
  
  <div class="separator"></div>
  
  <div class="center bold">
    TAX INVOICE
    ${data.enableBilingual ? `<div class="tamil" style="font-size: 11px; font-weight: normal;">(${TAMIL_TRANSLATIONS['TAX INVOICE']})</div>` : ''}
  </div>
  
  <div class="separator"></div>
  
  <div style="font-size: 11px;">
    <div style="display: flex; justify-content: space-between;">
      <span>Bill: ${escapeHtml(data.billNumber)}</span>
      <span>Mode: ${escapeHtml(data.paymentMode.toUpperCase())}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>Date: ${dateStr}</span>
      <span>Time: ${timeStr}</span>
    </div>
  </div>
  
  ${(data.customerName || data.customerPhone) ? `
    <div class="separator"></div>
    <div style="font-size: 11px;">
      ${data.customerName ? `<div>Customer: ${escapeHtml(data.customerName)}</div>` : ''}
      ${data.customerPhone ? `<div>Phone: ${escapeHtml(data.customerPhone)}</div>` : ''}
      ${data.loyaltyPoints && data.loyaltyPoints > 0 ? `<div>Loyalty Points: ${data.loyaltyPoints}</div>` : ''}
    </div>
  ` : ''}
  
  <div class="separator"></div>
  
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  <div class="separator"></div>
  
  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>${formatCurrency(data.subtotal)}</span>
    </div>
    
    ${showTax && data.taxAmount > 0 ? `
      <div class="total-row">
        <span>CGST:</span>
        <span>${formatCurrency(data.taxAmount / 2)}</span>
      </div>
      <div class="total-row">
        <span>SGST:</span>
        <span>${formatCurrency(data.taxAmount / 2)}</span>
      </div>
    ` : ''}
    
    ${data.discount && data.discount > 0 ? `
      <div class="total-row">
        <span>Discount:</span>
        <span>-${formatCurrency(data.discount)}</span>
      </div>
      ${data.enableBilingual ? `<div class="tamil" style="font-size: 10px; color: #555; padding-left: 8px;">${TAMIL_TRANSLATIONS['Discount']}</div>` : ''}
    ` : ''}
    
    ${Math.abs(roundOff) >= 0.01 ? `
      <div class="total-row">
        <span>Round Off:</span>
        <span>${roundOff >= 0 ? '+' : ''}${formatCurrency(roundOff)}</span>
      </div>
    ` : ''}
    
    <div class="grand-total total-row">
      <span>TOTAL:</span>
      <span>Rs.${roundedTotal.toFixed(2)}</span>
    </div>
    ${data.enableBilingual ? `<div class="tamil center" style="font-size: 12px;">${TAMIL_TRANSLATIONS['TOTAL']}</div>` : ''}
  </div>
  
  <div class="separator"></div>
  
  <div class="footer">
    <div class="bold">${escapeHtml(data.thankYouNote || 'Thank you for your business!')}</div>
    ${data.enableBilingual ? `<div class="tamil" style="font-size: 11px; margin-top: 4px;">நன்றி!</div>` : ''}
  </div>
</body>
</html>
  `.trim();
  
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ESC/POS Commands for fallback text-only printing
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';
const INIT = ESC + '@';
const CENTER = ESC + 'a\x01';
const LEFT = ESC + 'a\x00';
const BOLD_ON = ESC + 'E\x01';
const BOLD_OFF = ESC + 'E\x00';
const DOUBLE_HEIGHT_ON = ESC + '!' + '\x10';
const NORMAL_SIZE = ESC + '!' + '\x00';
const CUT_PAPER = GS + 'V\x00';
const LINE_WIDTH = 32;

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return ' '.repeat(len - str.length) + str;
}

function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxWidth) {
      lines.push(remaining);
      break;
    }
    let breakPoint = remaining.lastIndexOf(' ', maxWidth);
    if (breakPoint <= 0) breakPoint = maxWidth;
    lines.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }
  return lines;
}

/**
 * Generate fallback ESC/POS text commands (no Tamil, English only)
 * Used when image printing fails or is not available
 */
function generateFallbackTextCommands(data: ReceiptData): string {
  let receipt = '';
  
  receipt += INIT + LF;
  
  // Takeaway header
  if (data.isParcel) {
    receipt += CENTER + BOLD_ON + DOUBLE_HEIGHT_ON;
    receipt += '*** TAKEAWAY ***' + LF;
    receipt += NORMAL_SIZE + BOLD_OFF + LF;
  }
  
  // Company Header
  receipt += CENTER + BOLD_ON;
  const companyName = data.companyName.toUpperCase();
  const nameLines = wrapText(companyName, LINE_WIDTH);
  for (const line of nameLines) {
    receipt += line + LF;
  }
  receipt += BOLD_OFF;
  
  // Address
  receipt += CENTER;
  if (data.address) {
    const addressLines = wrapText(data.address, LINE_WIDTH);
    for (const line of addressLines) {
      receipt += line + LF;
    }
  }
  
  const location = [data.city, data.state].filter(Boolean).join(', ');
  if (location || data.pincode) {
    const locationStr = [location, data.pincode].filter(Boolean).join(' - ');
    const locLines = wrapText(locationStr, LINE_WIDTH);
    for (const line of locLines) {
      receipt += line + LF;
    }
  }
  
  if (data.phone) receipt += 'Ph: ' + data.phone + LF;
  if (data.gstin) receipt += 'GSTIN: ' + data.gstin + LF;
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  receipt += CENTER + BOLD_ON + 'TAX INVOICE' + LF + BOLD_OFF;
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Bill details
  receipt += LEFT;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-GB');
  
  const billInfo = `Bill: ${data.billNumber}`;
  const modeInfo = `Mode: ${data.paymentMode.toUpperCase()}`;
  receipt += billInfo + ' '.repeat(Math.max(1, LINE_WIDTH - billInfo.length - modeInfo.length)) + modeInfo + LF;
  
  const dateInfo = `Date: ${dateStr}`;
  const timeInfo = `Time: ${timeStr}`;
  receipt += dateInfo + ' '.repeat(Math.max(1, LINE_WIDTH - dateInfo.length - timeInfo.length)) + timeInfo + LF;
  
  // Customer
  if (data.customerName || data.customerPhone) {
    receipt += '-'.repeat(LINE_WIDTH) + LF;
    if (data.customerName) receipt += 'Customer: ' + data.customerName + LF;
    if (data.customerPhone) receipt += 'Phone: ' + data.customerPhone + LF;
    if (data.loyaltyPoints && data.loyaltyPoints > 0) {
      receipt += 'Loyalty Points: ' + data.loyaltyPoints + LF;
    }
  }
  
  // Items
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  receipt += BOLD_ON + padRight('Item', 12) + padLeft('Qty', 4) + padLeft('Rate', 8) + padLeft('Amt', 8) + LF + BOLD_OFF;
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  for (const item of data.items) {
    const qtyStr = item.price_type === 'weight' ? item.quantity.toFixed(2) : item.quantity.toString();
    const rateStr = formatCurrency(item.price);
    const amount = item.price * item.quantity;
    const amtStr = formatCurrency(amount);
    
    // English name only (skip Tamil in fallback mode)
    const nameLines = wrapText(item.name, LINE_WIDTH);
    for (const line of nameLines) {
      receipt += line + LF;
    }
    
    // Numbers on separate line
    const numericLine = ' '.repeat(12) + padLeft(qtyStr, 4) + padLeft(rateStr, 8) + padLeft(amtStr, 8);
    receipt += numericLine + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Totals
  const subtotalLabel = 'Subtotal:';
  const subtotalVal = formatCurrency(data.subtotal);
  receipt += padRight(subtotalLabel, LINE_WIDTH - subtotalVal.length) + subtotalVal + LF;
  
  const showTax = data.billingMode !== 'no_tax' && 
    !(data.billingMode === 'inclusive' && data.inclusiveBillType === 'mrp');
  
  if (showTax && data.taxAmount > 0) {
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
    receipt += padRight(discLabel, LINE_WIDTH - discVal.length) + discVal + LF;
  }
  
  const { roundedTotal, roundOff } = roundToNearestRupee(data.total);
  
  if (Math.abs(roundOff) >= 0.01) {
    const roundLabel = 'Round Off:';
    const roundVal = (roundOff >= 0 ? '+' : '') + formatCurrency(roundOff);
    receipt += roundLabel + ' '.repeat(LINE_WIDTH - roundLabel.length - roundVal.length) + roundVal + LF;
  }
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Grand total
  receipt += LEFT + BOLD_ON;
  const totalLabel = 'TOTAL:';
  const totalVal = 'Rs.' + roundedTotal.toFixed(2);
  receipt += padRight(totalLabel, LINE_WIDTH - totalVal.length) + totalVal + LF;
  receipt += BOLD_OFF;
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  
  // Thank you
  receipt += CENTER + BOLD_ON;
  const thankYou = data.thankYouNote || 'Thank you for your business!';
  const thankYouLines = wrapText(thankYou, LINE_WIDTH);
  for (const line of thankYouLines) {
    receipt += line + LF;
  }
  receipt += BOLD_OFF;
  
  receipt += '-'.repeat(LINE_WIDTH) + LF;
  receipt += LF + LF + LF + LF;
  receipt += CUT_PAPER;
  
  return receipt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const receiptData: ReceiptData = await req.json();
    
    console.log('Generating receipt for:', receiptData.billNumber);
    console.log('Bilingual mode:', receiptData.enableBilingual);
    
    // Generate HTML for image-based printing (best for Tamil)
    const receiptHtml = generateReceiptHTML(receiptData);
    
    // Generate fallback text commands (English only, for when image fails)
    const fallbackCommands = generateFallbackTextCommands(receiptData);
    
    // Convert fallback to base64
    const encoder = new TextEncoder();
    const bytes = encoder.encode(fallbackCommands);
    const base64Commands = btoa(String.fromCharCode(...bytes));
    
    console.log('Receipt HTML generated successfully');
    console.log('Fallback text commands generated');
    
    return new Response(
      JSON.stringify({
        success: true,
        billNumber: receiptData.billNumber,
        // NEW: HTML for image-based printing (recommended for Tamil)
        receiptHtml: receiptHtml,
        // Keep existing for backward compatibility
        escposCommands: base64Commands,
        rawCommands: fallbackCommands,
        // Flag to indicate bilingual mode
        enableBilingual: receiptData.enableBilingual || false,
        message: receiptData.enableBilingual 
          ? 'HTML receipt generated for image-based printing (Tamil support)'
          : 'ESC/POS commands generated successfully'
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
