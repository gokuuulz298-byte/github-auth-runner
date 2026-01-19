import { supabase } from "@/integrations/supabase/client";

interface PrintReceiptData {
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
  items: Array<{
    name: string;
    nameTamil?: string;
    quantity: number;
    price: number;
    price_type?: string;
    tax_rate?: number;
  }>;
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

interface PrintServiceConfig {
  host: string;
  port: number;
}

// Default local print service config
const DEFAULT_PRINT_SERVICE: PrintServiceConfig = {
  host: "localhost",
  port: 3001,
};

/**
 * Generate ESC/POS commands via edge function
 */
export async function generateEscPosCommands(data: PrintReceiptData): Promise<{
  rawCommands: string;
  receiptHtml?: string;
  enableBilingual?: boolean;
}> {
  try {
    const { data: response, error } = await supabase.functions.invoke("print-receipt", {
      body: data,
    });

    if (error) throw error;

    if (!response.success) {
      throw new Error(response.error || "Failed to generate receipt");
    }

    return {
      rawCommands: response.rawCommands,
      receiptHtml: response.receiptHtml,
      enableBilingual: response.enableBilingual,
    };
  } catch (error) {
    console.error("Error generating ESC/POS commands:", error);
    throw error;
  }
}

/**
 * Send ESC/POS commands to local print service
 */
export async function sendToLocalPrinter(
  commands: string,
  config: PrintServiceConfig = DEFAULT_PRINT_SERVICE,
  receiptHtml?: string,
): Promise<boolean> {
  try {
    // If HTML is provided (for Tamil/bilingual), use image-based printing
    if (receiptHtml) {
      const response = await fetch(`http://${config.host}:${config.port}/print-html`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html: receiptHtml, fallbackCommands: commands }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) return true;
      }
      // Fall through to text-based printing if image fails
      console.log("Image printing failed, falling back to text");
    }

    // Text-based printing (fallback or non-bilingual)
    const response = await fetch(`http://${config.host}:${config.port}/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commands }),
    });

    if (!response.ok) {
      throw new Error(`Print service error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error sending to local printer:", error);
    return false;
  }
}

/**
 * Print receipt using ESC/POS - combines generation and printing
 */
export async function printEscPosReceipt(data: PrintReceiptData): Promise<{
  success: boolean;
  commands?: string;
  printed?: boolean;
  error?: string;
}> {
  try {
    // Generate receipt (HTML for bilingual, text commands as fallback)
    const result = await generateEscPosCommands(data);

    // Try to send to local print service (uses image printing for Tamil)
    const printed = await sendToLocalPrinter(
      result.rawCommands,
      DEFAULT_PRINT_SERVICE,
      result.enableBilingual ? result.receiptHtml : undefined
    );

    return {
      success: true,
      commands: result.rawCommands,
      printed,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if local print service is available
 */
export async function checkPrintServiceAvailable(config: PrintServiceConfig = DEFAULT_PRINT_SERVICE): Promise<boolean> {
  try {
    const response = await fetch(`http://${config.host}:${config.port}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate receipt data from billing context
 */
export function buildReceiptData(params: {
  billNumber: string;
  companyProfile: any;
  customerName?: string;
  customerPhone?: string;
  cartItems: any[];
  totals: {
    subtotal: number;
    taxAmount: number;
    couponDiscountAmount?: number;
    total: number;
  };
  paymentMode: string;
  isParcel?: boolean;
  loyaltyPoints?: number;
  enableBilingual?: boolean;
  billingMode?: 'inclusive' | 'exclusive' | 'no_tax';
  inclusiveBillType?: 'mrp' | 'split';
}): PrintReceiptData {
  const {
    billNumber,
    companyProfile,
    customerName,
    customerPhone,
    cartItems,
    totals,
    paymentMode,
    isParcel,
    loyaltyPoints,
    enableBilingual,
    billingMode,
    inclusiveBillType,
  } = params;

  return {
    billNumber,
    companyName: companyProfile?.company_name || "STORE",
    companyNameTamil: companyProfile?.company_name_tamil || undefined,
    address: companyProfile?.address,
    city: companyProfile?.city,
    state: companyProfile?.state,
    pincode: companyProfile?.pincode,
    phone: companyProfile?.phone,
    gstin: companyProfile?.gstin,
    customerName,
    customerPhone,
    items: cartItems.map((item) => ({
      name: item.name,
      // Use tamil_name from database if available
      nameTamil: enableBilingual ? item.tamil_name || undefined : undefined,
      quantity: item.quantity,
      price: item.price,
      price_type: item.price_type,
      tax_rate: item.tax_rate,
    })),
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    discount: totals.couponDiscountAmount,
    total: totals.total,
    paymentMode,
    isParcel,
    loyaltyPoints,
    enableBilingual,
    thankYouNote: companyProfile?.thank_you_note,
    billingMode,
    inclusiveBillType,
  };
}

/**
 * Simple transliteration for Tamil (romanized)
 * This creates readable phonetic Tamil for product names
 */
function transliterate(text: string): string {
  // For now, just return the same text as the edge function handles the common translations
  // Product-specific Tamil names should be stored in the database
  return text;
}
