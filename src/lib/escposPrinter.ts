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
}

interface PrintServiceConfig {
  host: string;
  port: number;
}

// Default local print service config
const DEFAULT_PRINT_SERVICE: PrintServiceConfig = {
  host: 'localhost',
  port: 3001
};

/**
 * Generate ESC/POS commands via edge function
 */
export async function generateEscPosCommands(data: PrintReceiptData): Promise<string> {
  try {
    const { data: response, error } = await supabase.functions.invoke('print-receipt', {
      body: data
    });

    if (error) throw error;

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate receipt');
    }

    return response.rawCommands;
  } catch (error) {
    console.error('Error generating ESC/POS commands:', error);
    throw error;
  }
}

/**
 * Send ESC/POS commands to local print service
 */
export async function sendToLocalPrinter(
  commands: string, 
  config: PrintServiceConfig = DEFAULT_PRINT_SERVICE
): Promise<boolean> {
  try {
    const response = await fetch(`http://${config.host}:${config.port}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ commands }),
    });

    if (!response.ok) {
      throw new Error(`Print service error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error sending to local printer:', error);
    // Don't throw - local service might not be running
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
    // Generate ESC/POS commands
    const commands = await generateEscPosCommands(data);
    
    // Try to send to local print service
    const printed = await sendToLocalPrinter(commands);
    
    return {
      success: true,
      commands,
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
export async function checkPrintServiceAvailable(
  config: PrintServiceConfig = DEFAULT_PRINT_SERVICE
): Promise<boolean> {
  try {
    const response = await fetch(`http://${config.host}:${config.port}/status`, {
      method: 'GET',
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
}): PrintReceiptData {
  const { billNumber, companyProfile, customerName, customerPhone, cartItems, totals, paymentMode, isParcel, loyaltyPoints, enableBilingual } = params;

  return {
    billNumber,
    companyName: companyProfile?.company_name || 'STORE',
    companyNameTamil: companyProfile?.company_name ? transliterate(companyProfile.company_name) : undefined,
    address: companyProfile?.address,
    city: companyProfile?.city,
    state: companyProfile?.state,
    pincode: companyProfile?.pincode,
    phone: companyProfile?.phone,
    gstin: companyProfile?.gstin,
    customerName,
    customerPhone,
    items: cartItems.map(item => ({
      name: item.name,
      // Use tamil_name from database if available, otherwise edge function will auto-translate
      nameTamil: enableBilingual ? (item.tamil_name || transliterate(item.name)) : undefined,
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
