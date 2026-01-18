import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X, Loader2 } from "lucide-react";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { printEscPosReceipt, buildReceiptData, checkPrintServiceAvailable } from "@/lib/escposPrinter";
import { toast } from "sonner";

interface PrintPreviewItem {
  name: string;
  nameTamil?: string;
  quantity: number;
  price: number;
  price_type?: string;
  tax_rate?: number;
}

interface PrintPreviewData {
  billNumber: string;
  companyProfile: any;
  customerName?: string;
  customerPhone?: string;
  items: PrintPreviewItem[];
  subtotal: number;
  taxAmount: number;
  discount?: number;
  total: number;
  paymentMode: string;
  isParcel?: boolean;
  loyaltyPoints?: number;
  enableBilingual?: boolean;
}

interface PrintPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrintPreviewData | null;
  onPrintComplete?: () => void;
}

// Tamil translations for display
const TAMIL_LABELS: { [key: string]: string } = {
  'TAX INVOICE': 'வரி இரசீது',
  'TAKEAWAY': 'எடுத்துச்செல்ல',
  'Bill No': 'ரசீது எண்',
  'Date': 'தேதி',
  'Time': 'நேரம்',
  'Customer': 'வாடிக்கையாளர்',
  'Phone': 'தொலைபேசி',
  'Loyalty Points': 'லாயல்டி புள்ளிகள்',
  'Item': 'பொருள்',
  'Qty': 'அளவு',
  'Rate': 'விலை',
  'Amount': 'தொகை',
  'Subtotal': 'உப மொத்தம்',
  'Tax': 'வரி',
  'Discount': 'தள்ளுபடி',
  'TOTAL': 'மொத்தம்',
  'Thank you': 'நன்றி',
  'Payment': 'செலுத்தி',
  'CASH': 'ரொக்கம்',
  'UPI': 'யூபிஐ',
  'CARD': 'அட்டை',
};

export function PrintPreviewModal({ open, onOpenChange, data, onPrintComplete }: PrintPreviewModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerAvailable, setPrinterAvailable] = useState<boolean | null>(null);

  // Check printer availability when modal opens
  const checkPrinter = async () => {
    const available = await checkPrintServiceAvailable();
    setPrinterAvailable(available);
  };

  if (!data) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const receiptData = buildReceiptData({
        billNumber: data.billNumber,
        companyProfile: data.companyProfile,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        cartItems: data.items,
        totals: {
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          couponDiscountAmount: data.discount,
          total: data.total,
        },
        paymentMode: data.paymentMode,
        isParcel: data.isParcel,
        loyaltyPoints: data.loyaltyPoints,
        enableBilingual: data.enableBilingual,
      });

      const result = await printEscPosReceipt(receiptData);

      if (result.success) {
        if (result.printed) {
          toast.success("Receipt printed successfully!");
        } else {
          toast.info("Print commands generated. Connect printer service to print.");
        }
        onPrintComplete?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to print receipt");
      }
    } catch (error: any) {
      toast.error(error.message || "Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const now = new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={checkPrinter}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Preview
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div className="bg-white text-black p-4 rounded-lg font-mono text-xs border shadow-inner">
          {/* Takeaway Header */}
          {data.isParcel && (
            <div className="text-center mb-2">
              <div className="font-bold text-sm">*** TAKEAWAY ***</div>
              {data.enableBilingual && (
                <div className="text-[10px]">({TAMIL_LABELS['TAKEAWAY']})</div>
              )}
            </div>
          )}

          {/* Company Header */}
          <div className="text-center mb-2">
            <div className="font-bold text-sm">{data.companyProfile?.company_name || 'STORE'}</div>
            {data.enableBilingual && data.companyProfile?.company_name && (
              <div className="text-[10px]">({data.companyProfile.company_name})</div>
            )}
            {data.companyProfile?.address && (
              <div>{data.companyProfile.address}</div>
            )}
            {(data.companyProfile?.city || data.companyProfile?.state) && (
              <div>{[data.companyProfile?.city, data.companyProfile?.state, data.companyProfile?.pincode].filter(Boolean).join(', ')}</div>
            )}
            {data.companyProfile?.phone && (
              <div>Ph: {data.companyProfile.phone}</div>
            )}
            {data.companyProfile?.gstin && (
              <div>GSTIN: {data.companyProfile.gstin}</div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Tax Invoice Header */}
          <div className="text-center font-bold mb-2">
            TAX INVOICE
            {data.enableBilingual && (
              <div className="font-normal text-[10px]">({TAMIL_LABELS['TAX INVOICE']})</div>
            )}
          </div>

          {/* Bill Details */}
          <div className="mb-2">
            <div>Bill: {data.billNumber}</div>
            <div>Date: {now.toLocaleDateString()} Time: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div>Payment: {data.paymentMode.toUpperCase()}</div>
          </div>

          {/* Customer Details */}
          {data.customerName && (
            <>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div>Customer: {data.customerName}</div>
              {data.enableBilingual && (
                <div className="text-[10px]">({TAMIL_LABELS['Customer']}: {data.customerName})</div>
              )}
              {data.customerPhone && <div>Phone: {data.customerPhone}</div>}
              {data.loyaltyPoints && data.loyaltyPoints > 0 && (
                <div>Loyalty Points: {data.loyaltyPoints}</div>
              )}
            </>
          )}

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Items Header */}
          <div className="flex justify-between font-bold mb-1">
            <span className="w-[40%]">Item</span>
            <span className="w-[15%] text-right">Qty</span>
            <span className="w-[20%] text-right">Rate</span>
            <span className="w-[25%] text-right">Amt</span>
          </div>

          <div className="border-t border-gray-300 my-1" />

          {/* Items */}
          {data.items.map((item, idx) => (
            <div key={idx} className="mb-1">
              <div className="flex justify-between">
                <span className="w-[40%] truncate">{item.name}</span>
                <span className="w-[15%] text-right">
                  {item.price_type === 'weight' ? `${item.quantity.toFixed(2)}` : item.quantity}
                </span>
                <span className="w-[20%] text-right">{item.price.toFixed(2)}</span>
                <span className="w-[25%] text-right">{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              {data.enableBilingual && item.nameTamil && (
                <div className="text-[10px] text-gray-600 pl-2">({item.nameTamil})</div>
              )}
            </div>
          ))}

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{data.subtotal.toFixed(2)}</span>
            </div>
            {data.enableBilingual && (
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>({TAMIL_LABELS['Subtotal']})</span>
              </div>
            )}

            {data.taxAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{data.taxAmount.toFixed(2)}</span>
                </div>
                {data.enableBilingual && (
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>({TAMIL_LABELS['Tax']})</span>
                  </div>
                )}
              </>
            )}

            {data.discount && data.discount > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{data.discount.toFixed(2)}</span>
                </div>
                {data.enableBilingual && (
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>({TAMIL_LABELS['Discount']})</span>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-gray-400 my-1" />

            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL:</span>
              <span>Rs.{data.total.toFixed(2)}</span>
            </div>
            {data.enableBilingual && (
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>({TAMIL_LABELS['TOTAL']})</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Thank You */}
          <div className="text-center">
            <div>{data.companyProfile?.thank_you_note || 'Thank you for your business!'}</div>
            {data.enableBilingual && (
              <div className="text-[10px]">(உங்கள் வணிகத்திற்கு நன்றி!)</div>
            )}
          </div>
        </div>

        {/* Printer Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${printerAvailable === true ? 'bg-green-500' : printerAvailable === false ? 'bg-red-500' : 'bg-yellow-500'}`} />
          <span className="text-muted-foreground">
            {printerAvailable === true ? 'Printer service connected' : 
             printerAvailable === false ? 'Printer service offline' : 
             'Checking printer...'}
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
