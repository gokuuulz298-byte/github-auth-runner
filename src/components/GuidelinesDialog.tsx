import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const GuidelinesDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="h-6 w-6 text-primary" />
            Software Usage Guidelines
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Getting Started */}
            <section className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Getting Started
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>• Set up your company profile in <strong>Profile</strong> with GSTIN, address, and contact details.</li>
                <li>• Create product categories in <strong>Categories</strong> for better organization.</li>
                <li>• Add products to <strong>Inventory</strong> with HSN codes, tax rates (CGST/SGST), and stock quantities.</li>
                <li>• Configure billing counters in <strong>Counters</strong> for multi-location support.</li>
              </ul>
            </section>

            {/* Billing */}
            <section className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Billing Operations
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>• Use <strong>Manual Billing</strong> for quick product search and barcode scanning.</li>
                <li>• Use <strong>Modern Billing</strong> for visual product grid with category filters.</li>
                <li>• Select payment mode (Cash, Card, UPI) before completing sale.</li>
                <li>• Apply coupons and discounts at checkout for customer savings.</li>
                <li>• Choose between Thermal (80mm) and A4 invoice formats.</li>
              </ul>
            </section>

            {/* GST Compliance */}
            <section className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Indian GST Compliance
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>• <strong>CGST + SGST:</strong> Applied for intra-state sales (within same state).</li>
                <li>• <strong>IGST:</strong> Applied for inter-state sales (different states). Enable "Intra-State Trade" toggle.</li>
                <li>• Enter valid HSN codes for each product for GST compliance.</li>
                <li>• GSTIN format: 22AAAAA0000A1Z5 (15 characters alphanumeric).</li>
                <li>• <strong>Inclusive Mode:</strong> MRP includes all taxes (no extra GST added).</li>
                <li>• <strong>Exclusive Mode:</strong> Base price + GST shown separately.</li>
              </ul>
            </section>

            {/* Restaurant Mode */}
            <section className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                Restaurant Mode
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>• Enable Restaurant Mode in <strong>Profile Settings</strong>.</li>
                <li>• Mark orders as "Parcel" for takeaway billing.</li>
                <li>• Enable auto-print to automatically send bills to thermal printer.</li>
                <li>• Set default payment mode for faster checkout.</li>
              </ul>
            </section>

            {/* Analytics */}
            <section className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Reports & Analytics
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>• View daily, weekly, and monthly sales in <strong>Analytics</strong>.</li>
                <li>• Track profit margins and top-selling products in <strong>Advanced Reports</strong>.</li>
                <li>• Filter reports by counter and date range.</li>
                <li>• Data updates in real-time as new invoices are created.</li>
              </ul>
            </section>

            {/* Tips */}
            <section className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Pro Tips
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>• Use barcode scanner for faster product entry.</li>
                <li>• Generate printable barcodes in <strong>Barcodes</strong> section.</li>
                <li>• Create custom invoice templates in <strong>Templates</strong>.</li>
                <li>• Monitor low stock alerts in <strong>Low Stocks</strong>.</li>
                <li>• Customer loyalty points are earned: ₹1 point per ₹100 spent.</li>
              </ul>
            </section>

            {/* Support */}
            <section className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                For technical support or feature requests, please contact your system administrator or visit our support portal.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GuidelinesDialog;
