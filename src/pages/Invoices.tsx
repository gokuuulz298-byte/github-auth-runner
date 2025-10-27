import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Download, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import { formatIndianCurrency } from "@/lib/numberFormat";

interface Invoice {
  id: string;
  bill_number: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  items_data: any;
  created_at: string;
}

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      toast.error("Error fetching invoices");
      console.error(error);
    }
  };

  const [companyProfile, setCompanyProfile] = useState<any>(null);

  useEffect(() => {
    fetchCompanyProfile();
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

  const regenerateInvoice = async (invoice: Invoice) => {
    // Fetch loyalty points if customer phone exists
    let loyaltyPoints = 0;
    const invoiceData = invoice as any;
    if (invoiceData.customer_phone) {
      try {
        const { data, error } = await supabase
          .from('loyalty_points')
          .select('points')
          .eq('customer_phone', invoiceData.customer_phone)
          .maybeSingle();
        
        if (!error && data) {
          loyaltyPoints = data.points;
        }
      } catch (error) {
        console.error('Error fetching loyalty points:', error);
      }
    }
    // Calculate required height based on content
    const headerHeight = 45;
    const itemsHeight = invoice.items_data.length * 5 + 15;
    const totalsHeight = 25;
    const footerHeight = 15;
    const requiredHeight = headerHeight + itemsHeight + totalsHeight + footerHeight + 10;
    
    // Create PDF in thermal printer format (80mm width, dynamic height)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, Math.max(requiredHeight, 100)]
    });
    
    // Company Header (thermal format)
    let currentY = 10;
    if (companyProfile) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(companyProfile.company_name, 40, currentY, { align: "center" });
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      currentY += 5;
      if (companyProfile.address) {
        doc.text(companyProfile.address, 40, currentY, { align: "center" });
        currentY += 4;
      }
      if (companyProfile.city || companyProfile.state || companyProfile.pincode) {
        const location = [companyProfile.city, companyProfile.state, companyProfile.pincode].filter(Boolean).join(', ');
        doc.text(location, 40, currentY, { align: "center" });
        currentY += 4;
      }
      if (companyProfile.phone) {
        doc.text(`Ph: ${companyProfile.phone}`, 40, currentY, { align: "center" });
        currentY += 4;
      }
      if (companyProfile.gstin) {
        doc.text(`GSTIN: ${companyProfile.gstin}`, 40, currentY, { align: "center" });
        currentY += 4;
      }
    }
    
    // Separator line
    currentY += 2;
    doc.setLineWidth(0.3);
    doc.line(5, currentY, 75, currentY);
    
    // Invoice details
    currentY += 5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("INVOICE", 40, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Bill: ${invoice.bill_number}`, 5, currentY);
    currentY += 4;
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 5, currentY);
    currentY += 4;
    doc.text(`Time: ${new Date(invoice.created_at).toLocaleTimeString()}`, 5, currentY);
    
    // Customer details
    if (invoiceData.customer_name) {
      currentY += 5;
      doc.line(5, currentY, 75, currentY);
      currentY += 4;
      doc.text(`Customer: ${invoiceData.customer_name}`, 5, currentY);
      currentY += 4;
      doc.text(`Phone: ${invoiceData.customer_phone}`, 5, currentY);
      if (loyaltyPoints > 0) {
        currentY += 4;
        doc.text(`Loyalty Points: ${loyaltyPoints}`, 5, currentY);
      }
    }
    
    currentY += 5;
    doc.line(5, currentY, 75, currentY);
    
    // Products table
    currentY += 5;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7);
    doc.text("Item", 5, currentY);
    doc.text("Qty", 45, currentY);
    doc.text("Rate", 55, currentY);
    doc.text("Amt", 68, currentY);
    
    currentY += 3;
    doc.line(5, currentY, 75, currentY);
    
    currentY += 4;
    doc.setFont(undefined, 'normal');
    invoice.items_data.forEach((item: any) => {
      const itemName = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name;
      const qtyLabel = item.price_type === 'weight' ? `${item.quantity.toFixed(3)}kg` : item.quantity.toString();
      
      doc.text(itemName, 5, currentY);
      doc.text(qtyLabel, 45, currentY);
      doc.text(item.price.toFixed(2), 55, currentY);
      doc.text((item.price * item.quantity).toFixed(2), 68, currentY);
      currentY += 4;
    });
    
    // Bottom line
    doc.line(5, currentY, 75, currentY);
    currentY += 4;
    
    const subtotal = invoice.total_amount - invoice.tax_amount;
    
    // Totals
    doc.setFontSize(8);
    doc.text("Subtotal:", 5, currentY);
    doc.text(subtotal.toFixed(2), 68, currentY);
    currentY += 4;
    
    if (invoice.tax_amount > 0) {
      doc.text("Tax:", 5, currentY);
      doc.text(invoice.tax_amount.toFixed(2), 68, currentY);
      currentY += 4;
    }
    
    // Grand total
    doc.line(5, currentY, 75, currentY);
    currentY += 4;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text("TOTAL:", 5, currentY);
    doc.text(invoice.total_amount.toFixed(2), 68, currentY);
    
    // Footer
    currentY += 8;
    doc.line(5, currentY, 75, currentY);
    currentY += 5;
    doc.setFont(undefined, 'italic');
    doc.setFontSize(8);
    const thankYouNote = companyProfile?.thank_you_note || "Thank you for your business!";
    doc.text(thankYouNote, 40, currentY, { align: "center" });
    
    doc.save(`${invoice.bill_number}.pdf`);
    toast.success("Invoice downloaded!");
  };

  const getFilteredInvoices = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.created_at);
      
      // Date filter
      let dateMatch = true;
      switch (dateFilter) {
        case "today":
          dateMatch = invoiceDate >= today;
          break;
        case "yesterday":
          dateMatch = invoiceDate >= yesterday && invoiceDate < today;
          break;
        case "last7days":
          dateMatch = invoiceDate >= last7Days;
          break;
        case "last30days":
          dateMatch = invoiceDate >= last30Days;
          break;
        default:
          dateMatch = true;
      }
      
      // Search filter
      const searchMatch = searchQuery
        ? invoice.bill_number.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      
      return dateMatch && searchMatch;
    });
  };

  const filteredInvoices = getFilteredInvoices();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Invoice History</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Invoices ({filteredInvoices.length})
                </div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by invoice number..."
                  className="pl-10 text-sm"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-mono">{invoice.bill_number}</TableCell>
                      <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.items_data.length} items</TableCell>
                      <TableCell>{formatIndianCurrency(invoice.tax_amount)}</TableCell>
                      <TableCell className="font-medium">{formatIndianCurrency(invoice.total_amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(invoice);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              regenerateInvoice(invoice);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Invoice Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Bill Number</p>
                  <p className="font-mono font-semibold">{selectedInvoice.bill_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">
                    {new Date(selectedInvoice.created_at).toLocaleDateString()} {new Date(selectedInvoice.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {(selectedInvoice as any).customer_name && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Name</p>
                      <p className="font-semibold">{(selectedInvoice as any).customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{(selectedInvoice as any).customer_phone}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items_data.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.price_type === 'weight' ? `${item.quantity.toFixed(3)} kg` : item.quantity}
                          </TableCell>
                          <TableCell className="text-right">{formatIndianCurrency(item.price)}</TableCell>
                          <TableCell className="text-right">{item.tax_rate}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatIndianCurrency(item.price * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatIndianCurrency(selectedInvoice.total_amount - selectedInvoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatIndianCurrency(selectedInvoice.tax_amount)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount</span>
                    <span>-{formatIndianCurrency(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatIndianCurrency(selectedInvoice.total_amount)}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                className="w-full" 
                onClick={() => {
                  regenerateInvoice(selectedInvoice);
                  setDetailDialogOpen(false);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Invoice
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
