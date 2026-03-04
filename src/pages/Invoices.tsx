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
import { useAuthContext } from "@/hooks/useAuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/common";
import { startOfDay, endOfDay } from "date-fns";

interface Invoice {
  id: string;
  bill_number: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  items_data: any;
  created_at: string;
}

const PAGE_SIZE = 25;

const Invoices = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user } = useAuthContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, dateFilter]);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchInvoices();
      fetchCompanyProfile();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, userId, user, currentPage, debouncedSearch, dateFilter]);

  const fetchInvoices = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Server-side date filter
      if (dateFilter !== "all") {
        const filterDate = new Date(dateFilter);
        query = query
          .gte('created_at', startOfDay(filterDate).toISOString())
          .lte('created_at', endOfDay(filterDate).toISOString());
      }

      // Server-side search filter (debounced)
      if (debouncedSearch) {
        query = query.ilike('bill_number', `%${debouncedSearch}%`);
      }

      // Paginate
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      toast.error("Error fetching invoices");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', userId)
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
    const headerHeight = 45;
    const itemsHeight = invoice.items_data.length * 5 + 15;
    const totalsHeight = 25;
    const footerHeight = 15;
    const requiredHeight = headerHeight + itemsHeight + totalsHeight + footerHeight + 10;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, Math.max(requiredHeight, 100)]
    });
    
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
    
    currentY += 2;
    doc.setLineWidth(0.3);
    doc.line(5, currentY, 75, currentY);
    
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
    
    doc.line(5, currentY, 75, currentY);
    currentY += 4;
    
    const subtotal = invoice.total_amount - invoice.tax_amount;
    
    doc.setFontSize(8);
    doc.text("Subtotal:", 5, currentY);
    doc.text(subtotal.toFixed(2), 68, currentY);
    currentY += 4;
    
    if (invoice.tax_amount > 0) {
      doc.text("Tax:", 5, currentY);
      doc.text(invoice.tax_amount.toFixed(2), 68, currentY);
      currentY += 4;
    }
    
    doc.line(5, currentY, 75, currentY);
    currentY += 4;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text("TOTAL:", 5, currentY);
    doc.text(invoice.total_amount.toFixed(2), 68, currentY);
    
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Invoices ({totalCount})
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFilter === "all" ? "" : dateFilter}
                    onChange={(e) => setDateFilter(e.target.value || "all")}
                    className="w-auto"
                    placeholder="Filter by date"
                  />
                  {dateFilter !== "all" && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDateFilter("all")}
                    >
                      Clear
                    </Button>
                  )}
                </div>
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
                  {invoices.map((invoice) => (
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
                  {invoices.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
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
                          <TableCell className="text-right">
                            {item.tax_rate ? `${item.tax_rate}%` : 
                             item.igst ? `${item.igst}%` : 
                             (item.cgst && item.sgst) ? `${(item.cgst + item.sgst)}%` : '0%'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatIndianCurrency(item.price * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                {(() => {
                  const items = selectedInvoice.items_data;
                  let baseSubtotal = 0;
                  let totalCGST = 0;
                  let totalSGST = 0;
                  let totalIGST = 0;

                  items.forEach((item: any) => {
                    const qty = item.quantity || 1;
                    const price = item.price || 0;
                    const lineTotal = price * qty;
                    const taxRate = item.tax_rate || (item.cgst && item.sgst ? item.cgst + item.sgst : 0) || item.igst || 0;
                    const isInclusive = item.is_inclusive !== false;

                    if (isInclusive && taxRate > 0) {
                      const base = lineTotal / (1 + taxRate / 100);
                      baseSubtotal += base;
                      if (item.igst) {
                        totalIGST += lineTotal - base;
                      } else {
                        totalCGST += (lineTotal - base) / 2;
                        totalSGST += (lineTotal - base) / 2;
                      }
                    } else {
                      baseSubtotal += lineTotal;
                      if (item.igst) {
                        totalIGST += lineTotal * taxRate / 100;
                      } else {
                        totalCGST += lineTotal * taxRate / 200;
                        totalSGST += lineTotal * taxRate / 200;
                      }
                    }
                  });

                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Amount</span>
                        <span>{formatIndianCurrency(baseSubtotal)}</span>
                      </div>
                      {totalCGST > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CGST</span>
                          <span>{formatIndianCurrency(totalCGST)}</span>
                        </div>
                      )}
                      {totalSGST > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">SGST</span>
                          <span>{formatIndianCurrency(totalSGST)}</span>
                        </div>
                      )}
                      {totalIGST > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">IGST</span>
                          <span>{formatIndianCurrency(totalIGST)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}

                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatIndianCurrency(selectedInvoice.discount_amount)}</span>
                  </div>
                )}

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Grand Total</span>
                    <span>{formatIndianCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => regenerateInvoice(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
