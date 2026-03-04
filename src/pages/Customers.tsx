import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationControls } from "@/components/common";
import LoyaltySettingsCard from "@/components/LoyaltySettingsCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import LoadingButton from "@/components/LoadingButton";

const PAGE_SIZE = 25;

const Customers = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user } = useAuthContext();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loyaltyData, setLoyaltyData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const debouncedSearch = useDebounce(searchTerm, 400);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchCustomers();
      fetchLoyaltyData();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, userId, user, currentPage, debouncedSearch]);

  const fetchCustomers = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Server-side search (debounced)
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      }

      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching customers");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoyaltyData = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*');

      if (error) {
        console.error("Error fetching loyalty data:", error);
        return;
      }
      
      const loyaltyMap: Record<string, any> = {};
      data?.forEach((loyalty) => {
        loyaltyMap[loyalty.customer_phone] = loyalty;
      });
      setLoyaltyData(loyaltyMap);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone || !userId) {
      toast.error("Name and phone are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...newCustomer, created_by: userId }])
        .select();

      if (error) throw error;

      toast.success("Customer added successfully");
      setDialogOpen(false);
      setNewCustomer({ name: "", phone: "", email: "" });
      fetchCustomers(); // Refetch to update count and pagination
    } catch (error) {
      console.error(error);
      toast.error("Error adding customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (customers.length === 0) {
      toast.error("No customers to export");
      return;
    }

    const headers = ['Name', 'Phone', 'Email', 'Loyalty Points', 'Total Spent'];
    const rows = customers.map(customer => {
      const loyalty = loyaltyData[customer.phone];
      return [
        customer.name,
        customer.phone,
        customer.email || '',
        loyalty?.points || 0,
        loyalty?.total_spent?.toFixed(2) || '0.00',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${customers.length} customers`);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <LoadingSpinner size="lg" text="Loading customers..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <LoadingButton onClick={handleAddCustomer} className="w-full" isLoading={isSubmitting}>
                    Add Customer
                  </LoadingButton>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4">
        {userId && <LoyaltySettingsCard userId={userId} />}
        
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Customer List ({totalCount})</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" text="Loading..." />
                </div>
              ) : customers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No customers found</p>
              ) : (
                customers.map((customer) => {
                  const loyalty = loyaltyData[customer.phone];
                  return (
                    <div key={customer.id} className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm sm:text-base">{customer.name}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">Phone: {customer.phone}</p>
                          {customer.email && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">Email: {customer.email}</p>
                          )}
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-base sm:text-lg font-bold text-primary">{loyalty?.points || 0} pts</p>
                          <p className="text-xs text-muted-foreground">₹{Number(loyalty?.total_spent || 0).toFixed(2)} spent</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
    </div>
  );
};

export default Customers;
