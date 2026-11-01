import { supabase } from "@/integrations/supabase/client";

interface PrintReceiptData {
  billNumber: string;
  companyName: string;
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
  loyaltyPoints?: number;
  thankYouNote?: string;
  billingMode?: "inclusive" | "exclusive" | "no_tax";
  inclusiveBillType?: "mrp" | "split";
}

export interface PrintServiceConfig {
  host: string;
  port: number;
  protocol: string;
}

export const PRINT_SERVICE_STORAGE_KEY = "upcurv_print_service";

export const PRINT_SERVICE_DEFAULTS: PrintServiceConfig = {
  host: "virtual-printer.online",
  port: 9919,
  protocol: "escpos",
};

export function getPrintServiceConfig(): PrintServiceConfig {
  try {
    const raw = localStorage.getItem(PRINT_SERVICE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        host: parsed.host || PRINT_SERVICE_DEFAULTS.host,
        port: Number(parsed.port) || PRINT_SERVICE_DEFAULTS.port,
        protocol: parsed.protocol || PRINT_SERVICE_DEFAULTS.protocol,
      };
    }
  } catch {
    // fall through to defaults
  }
  return { ...PRINT_SERVICE_DEFAULTS };
}

export function savePrintServiceConfig(config: Partial<PrintServiceConfig>) {
  const merged = { ...getPrintServiceConfig(), ...config };
  localStorage.setItem(PRINT_SERVICE_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * Generate ESC/POS commands via edge function
 */
export async function generateEscPosCommands(data: PrintReceiptData): Promise<string> {
  const { data: response, error } = await supabase.functions.invoke("print-receipt", {
    body: data,
  });

  if (error) throw error;

  if (!response.success) {
    throw new Error(response.error || "Failed to generate receipt");
  }

  return response.rawCommands;
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

/**
 * Send ESC/POS commands to the configured print destination.
 *
 * - Local service (localhost): HTTP POST to /print
 * - Remote printer (e.g. virtual-printer.online): relayed through the
 *   `print-relay` edge function, which opens a raw TCP socket to the host.
 */
export async function sendToLocalPrinter(
  commands: string,
  config: PrintServiceConfig = getPrintServiceConfig(),
): Promise<boolean> {
  try {
    if (isLocalHost(config.host)) {
      const response = await fetch(`http://${config.host}:${config.port}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands }),
      });

      if (!response.ok) {
        throw new Error(`Print service error: ${response.statusText}`);
      }

      const result = await response.json();
      return !!result.success;
    }

    // Remote printer → relay raw ESC/POS bytes through edge function
    const { data: result, error } = await supabase.functions.invoke("print-relay", {
      body: {
        host: config.host,
        port: config.port,
        data: commands,
      },
    });

    if (error) throw error;
    if (!result?.success) {
      throw new Error(result?.error || "Print relay failed");
    }
    return true;
  } catch (error) {
    console.error("Error sending to printer:", error);
    // Don't throw - printer might not be reachable
    return false;
  }
}

/**
 * Print receipt using ESC/POS (English only).
 */
export async function printEscPosReceipt(data: PrintReceiptData): Promise<any> {
  try {
    const { data: response, error } = await supabase.functions.invoke("print-receipt", {
      body: data,
    });

    if (error) {
      throw new Error(error.message || "Receipt generation failed");
    }

    if (!response?.success) {
      throw new Error(response?.error || "Receipt generation failed");
    }

    const printed = await sendToLocalPrinter(response.rawCommands, getPrintServiceConfig());
    return { success: true, printed, mode: "text" };
  } catch (err: any) {
    console.error("printEscPosReceipt error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if the print destination is available.
 * Remote printers are assumed reachable; failures surface at print time.
 */
export async function checkPrintServiceAvailable(
  config: PrintServiceConfig = getPrintServiceConfig(),
): Promise<boolean> {
  if (!isLocalHost(config.host)) return true;
  try {
    const response = await fetch(`http://${config.host}:${config.port}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Send a small test receipt to the configured print destination.
 */
export async function sendTestPrint(config: PrintServiceConfig = getPrintServiceConfig()): Promise<boolean> {
  const timestamp = new Date().toLocaleString("en-IN");
  const esc = "\x1B";
  const commands =
    `${esc}@` +
    `${esc}a\x01` +
    "UPCURV BILLING\n" +
    "TEST PRINT\n" +
    `${esc}a\x00` +
    `${timestamp}\n` +
    "If you can read this, the\n" +
    "printer connection works!\n\n\n\n" +
    `${esc}V\x00`;

  return sendToLocalPrinter(commands, config);
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
  loyaltyPoints?: number;
  billingMode?: "inclusive" | "exclusive" | "no_tax";
  inclusiveBillType?: "mrp" | "split";
}): PrintReceiptData {
  const {
    billNumber,
    companyProfile,
    customerName,
    customerPhone,
    cartItems,
    totals,
    paymentMode,
    loyaltyPoints,
    billingMode,
    inclusiveBillType,
  } = params;

  return {
    billNumber,
    companyName: companyProfile?.company_name || "STORE",
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
    loyaltyPoints,
    thankYouNote: companyProfile?.thank_you_note,
    billingMode,
    inclusiveBillType,
  };
}
