import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, RotateCcw, Package, FileText, CheckCircle2, Clock, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { SkeletonTable } from "@/components/common";
import LoadingButton from "@/components/LoadingButton";
import DeleteConfirmDialog from "@/components/common/DeleteConfirmDialog";

interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  reason: string;
}

interface Return {
  id: string;
  return_number: string;
  return_type: 'purchase_return' | 'sales_return';
  reference_type: 'invoice' | 'purchase';
  reference_id: string;
  reference_number: string;
  supplier_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items_data: ReturnItem[];
  reason: string;
  return_date: string;
  amount_type: 'refund' | 'credit' | 'exchange';
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

const RETURN_REASONS = [
  "Defective/Damaged",
  "Wrong item received",
  "Quality issues",
  "Expired product",
  "Customer dissatisfaction",
  "Size/specification mismatch",
  "Other"
];

const Returns = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAuthContext();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'sales_return' | 'purchase_return'>('all');
  
  // Form state
  const [returnType, setReturnType] = useState<'purchase_return' | 'sales_return'>('sales_return');
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceData, setReferenceData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [amountType, setAmountType] = useState<'refund' | 'credit' | 'exchange'>('refund');
  const [manualAmount, setManualAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchReturns();
    }
  }, [authLoading, userId]);

  const fetchReturns = async () => {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns((data || []).map(r => ({
        ...r,
        items_data: r.items_data as unknown as ReturnItem[]
      })) as Return[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch returns");
    } finally {
      setLoading(false);
    }
  };

  const searchReference = async () => {
    if (!referenceNumber.trim()) {
      toast.error("Enter a reference number");
      return;
    }

    setIsSearching(true);
    try {
      if (returnType === 'sales_return') {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('bill_number', referenceNumber.trim())
          .eq('created_by', userId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Invoice not found");
          return;
        }

        setReferenceData({
          id: data.id,
          number: data.bill_number,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          items: (data.items_data as any[]).map(item => ({
            id: item.id || item.barcode,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            maxQuantity: item.quantity
          })),
          total: data.total_amount
        });
        toast.success("Invoice found!");
      } else {
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .eq('purchase_number', referenceNumber.trim())
          .eq('created_by', userId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Purchase order not found");
          return;
        }

        setReferenceData({
          id: data.id,
          number: data.purchase_number,
          supplier_name: data.supplier_name,
          items: (data.items_data as any[]).map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            maxQuantity: item.quantity
          })),
          total: data.total_amount
        });
        toast.success("Purchase order found!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to search");
    } finally {
      setIsSearching(false);
    }
  };

  const addItemToReturn = (item: any) => {
    const existing = selectedItems.find(i => i.id === item.id);
    if (existing) {
      toast.error("Item already added");
      return;
    }
    setSelectedItems([...selectedItems, {
      id: item.id,
      name: item.name,
      quantity: 1,
      unit_price: item.unit_price,
      reason: reason || "Defective/Damaged"
    }]);
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    const item = referenceData?.items.find((i: any) => i.id === id);
    const maxQty = item?.maxQuantity || Infinity;
    
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter(i => i.id !== id));
    } else if (quantity > maxQty) {
      toast.error(`Maximum quantity is ${maxQty}`);
    } else {
      setSelectedItems(selectedItems.map(i => 
        i.id === id ? { ...i, quantity } : i
      ));
    }
  };

  const calculateTotal = () => {
    if (manualAmount && parseFloat(manualAmount) > 0) {
      return parseFloat(manualAmount);
    }
    return selectedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const generateReturnNumber = () => {
    const prefix = returnType === 'sales_return' ? 'SR' : 'PR';
    const date = new Date();
    const dateStr = format(date, 'yyMMdd');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${dateStr}-${random}`;
  };

  const handleSubmit = async () => {
    if (!referenceData || selectedItems.length === 0) {
      toast.error("Select items to return");
      return;
    }

    const finalReason = reason === "Other" ? customReason : reason;
    if (!finalReason) {
      toast.error("Select a reason for return");
      return;
    }

    setIsSubmitting(true);
    try {
      const returnData = {
        created_by: userId,
        return_number: generateReturnNumber(),
        return_type: returnType,
        reference_type: returnType === 'sales_return' ? 'invoice' : 'purchase',
        reference_id: referenceData.id,
        reference_number: referenceData.number,
        supplier_name: referenceData.supplier_name || null,
        customer_name: referenceData.customer_name || null,
        customer_phone: referenceData.customer_phone || null,
        items_data: selectedItems as unknown as any,
        reason: finalReason,
        amount_type: amountType,
        total_amount: calculateTotal(),
        status: 'pending',
        notes: notes || null
      };

      const { error } = await supabase
        .from('returns')
        .insert([returnData]);

      if (error) throw error;

      toast.success("Return created successfully!");
      setDialogOpen(false);
      resetForm();
      fetchReturns();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (returnId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ status: newStatus })
        .eq('id', returnId);

      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      fetchReturns();
      if (selectedReturn?.id === returnId) {
        setSelectedReturn({ ...selectedReturn, status: newStatus });
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!returnToDelete) return;

    try {
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', returnToDelete);

      if (error) throw error;
      toast.success("Return deleted successfully");
      fetchReturns();
      setDetailDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete return");
    } finally {
      setDeleteDialogOpen(false);
      setReturnToDelete(null);
    }
  };

  const resetForm = () => {
    setReturnType('sales_return');
    setReferenceNumber("");
    setReferenceData(null);
    setSelectedItems([]);
    setReason("");
    setCustomReason("");
    setAmountType('refund');
    setManualAmount("");
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = r.return_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTab = activeTab === 'all' || r.return_type === activeTab;
    
    return matchesSearch && matchesTab;
  });

  // Summary stats
  const stats = {
    total: returns.length,
    salesReturns: returns.filter(r => r.return_type === 'sales_return').length,
    purchaseReturns: returns.filter(r => r.return_type === 'purchase_return').length,
    pending: returns.filter(r => r.status === 'pending').length,
    totalRefundAmount: returns.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.total_amount, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Returns Management</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Return</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Return Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Return Type</Label>
                    <Select value={returnType} onValueChange={(v) => {
                      setReturnType(v as any);
                      setReferenceData(null);
                      setSelectedItems([]);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales_return">Sales Return (Customer)</SelectItem>
                        <SelectItem value="purchase_return">Purchase Return (Supplier)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{returnType === 'sales_return' ? 'Invoice Number' : 'PO Number'}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder={returnType === 'sales_return' ? 'Enter bill number' : 'Enter PO number'}
                      />
                      <LoadingButton 
                        variant="outline" 
                        onClick={searchReference}
                        isLoading={isSearching}
                      >
                        <Search className="h-4 w-4" />
                      </LoadingButton>
                    </div>
                  </div>
                </div>

                {/* Reference Details */}
                {referenceData && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reference:</span>
                        <span className="font-medium">{referenceData.number}</span>
                      </div>
                      {referenceData.customer_name && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Customer:</span>
                          <span>{referenceData.customer_name}</span>
                        </div>
                      )}
                      {referenceData.supplier_name && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Supplier:</span>
                          <span>{referenceData.supplier_name}</span>
                        </div>
                      )}
                      
                      {/* Available Items */}
                      <div>
                        <Label className="text-xs">Available Items (click to add)</Label>
                        <div className="mt-2 max-h-32 overflow-y-auto border rounded">
                          {referenceData.items.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => addItemToReturn(item)}
                            >
                              <span className="text-sm">{item.name}</span>
                              <div className="text-right text-xs text-muted-foreground">
                                <div>Qty: {item.quantity}</div>
                                <div>{formatIndianCurrency(item.unit_price)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selected Items */}
                {selectedItems.length > 0 && (
                  <div>
                    <Label>Items to Return</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{item.name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                                className="w-16 h-8"
                              />
                            </TableCell>
                            <TableCell>{formatIndianCurrency(item.unit_price)}</TableCell>
                            <TableCell>{formatIndianCurrency(item.unit_price * item.quantity)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateItemQuantity(item.id, 0)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Reason & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reason for Return</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {RETURN_REASONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reason === "Other" && (
                      <Input
                        className="mt-2"
                        placeholder="Specify reason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                      />
                    )}
                  </div>
                  <div>
                    <Label>Amount Handling</Label>
                    <Select value={amountType} onValueChange={(v) => setAmountType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refund">Refund (Cash/Card)</SelectItem>
                        <SelectItem value="credit">Store Credit</SelectItem>
                        <SelectItem value="exchange">Exchange</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Manual Amount Override */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Manual Amount (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="Enter custom amount"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave empty to use calculated total</p>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Summary */}
                <Card className="bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Return Amount:</span>
                      <span className="text-2xl font-bold text-primary">{formatIndianCurrency(calculateTotal())}</span>
                    </div>
                  </CardContent>
                </Card>

                <LoadingButton 
                  className="w-full" 
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={selectedItems.length === 0 || !reason}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Create Return
                </LoadingButton>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Returns</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.salesReturns}</div>
              <div className="text-xs text-muted-foreground">Sales Returns</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.purchaseReturns}</div>
              <div className="text-xs text-muted-foreground">Purchase Returns</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{formatIndianCurrency(stats.totalRefundAmount)}</div>
              <div className="text-xs text-muted-foreground">Total Refunded</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>Return Records</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-10 w-48"
                  />
                </div>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="sales_return" className="text-xs">Sales</TabsTrigger>
                    <TabsTrigger value="purchase_return" className="text-xs">Purchase</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : filteredReturns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No returns found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.map(ret => (
                      <TableRow key={ret.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                        setSelectedReturn(ret);
                        setDetailDialogOpen(true);
                      }}>
                        <TableCell className="font-medium">{ret.return_number}</TableCell>
                        <TableCell>
                          <Badge variant={ret.return_type === 'sales_return' ? 'default' : 'secondary'}>
                            {ret.return_type === 'sales_return' ? 'Sales' : 'Purchase'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{ret.reference_number}</TableCell>
                        <TableCell>{ret.customer_name || ret.supplier_name || '-'}</TableCell>
                        <TableCell className="font-semibold">{formatIndianCurrency(ret.total_amount)}</TableCell>
                        <TableCell>{getStatusBadge(ret.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(ret.return_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedReturn && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  {selectedReturn.return_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <Badge className="ml-2" variant={selectedReturn.return_type === 'sales_return' ? 'default' : 'secondary'}>
                      {selectedReturn.return_type === 'sales_return' ? 'Sales Return' : 'Purchase Return'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="ml-2 font-medium">{selectedReturn.reference_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{selectedReturn.customer_name ? 'Customer:' : 'Supplier:'}</span>
                    <span className="ml-2">{selectedReturn.customer_name || selectedReturn.supplier_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount Type:</span>
                    <span className="ml-2 capitalize">{selectedReturn.amount_type}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Reason</Label>
                  <p className="text-sm">{selectedReturn.reason}</p>
                </div>

                {selectedReturn.notes && (
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <p className="text-sm text-muted-foreground">{selectedReturn.notes}</p>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReturn.items_data.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatIndianCurrency(item.unit_price)}</TableCell>
                        <TableCell>{formatIndianCurrency(item.unit_price * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center p-3 bg-primary/5 rounded">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-primary">{formatIndianCurrency(selectedReturn.total_amount)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                  </div>
                  <div className="flex gap-2">
                    {selectedReturn.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedReturn.id, 'approved')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selectedReturn.id, 'cancelled')}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {selectedReturn.status === 'approved' && (
                      <Button size="sm" onClick={() => handleStatusChange(selectedReturn.id, 'completed')}>
                        Mark Completed
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive"
                      onClick={() => {
                        setReturnToDelete(selectedReturn.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Return?"
        description="This will permanently delete this return record. This action cannot be undone."
      />
    </div>
  );
};

export default Returns;
