import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loyaltyData, setLoyaltyData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    fetchCustomers();
    fetchLoyaltyData();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view customers");
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching customers");
    }
  };

  const fetchLoyaltyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('created_by', user.id);

      if (error) throw error;
      
      const loyaltyMap: Record<string, any> = {};
      data?.forEach((loyalty) => {
        loyaltyMap[loyalty.customer_phone] = loyalty;
      });
      setLoyaltyData(loyaltyMap);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('customers')
        .insert([{ ...newCustomer, created_by: user.id }]);

      if (error) throw error;

      toast.success("Customer added successfully");
      setDialogOpen(false);
      setNewCustomer({ name: "", phone: "", email: "" });
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error("Error adding customer");
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Customers</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto">
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
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddCustomer} className="w-full">
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Customer List</CardTitle>
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

            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {filteredCustomers.map((customer) => {
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
                      {loyalty && (
                        <div className="text-left sm:text-right">
                          <p className="text-base sm:text-lg font-bold text-primary">{loyalty.points || 0} pts</p>
                          <p className="text-xs text-muted-foreground">₹{(loyalty.total_spent || 0).toFixed(2)} spent</p>
                        </div>
                      )}
                      {!loyalty && (
                        <div className="text-left sm:text-right">
                          <p className="text-base sm:text-lg font-bold text-muted-foreground">0 pts</p>
                          <p className="text-xs text-muted-foreground">₹0.00 spent</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Customers;
