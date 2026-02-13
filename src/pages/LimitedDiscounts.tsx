import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuthContext } from "@/hooks/useAuthContext";

const LimitedDiscounts = () => {
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    discount_type: "percentage" as "fixed" | "percentage",
    discount_percentage: "",
    discount_amount: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    if (userId) {
      fetchDiscounts();
      fetchProducts();
    }
  }, [userId]);

  const fetchDiscounts = async () => {
    try {
      if (!userId) {
        toast.error("Please sign in to view discounts");
        return;
      }

      const { data, error } = await supabase
        .from('product_discounts')
        .select(`
          *,
          products (name, barcode)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts(data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to fetch discounts: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      if (!userId) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', userId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const discountValue = formData.discount_type === 'percentage' ? formData.discount_percentage : formData.discount_amount;
    if (!formData.product_id || !discountValue || !formData.start_date || !formData.end_date) {
      toast.error("Please fill all required fields");
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      if (!userId) throw new Error("User not authenticated");

      const discountData = {
        product_id: formData.product_id,
        discount_type: formData.discount_type,
        discount_percentage: formData.discount_type === 'percentage' ? parseFloat(formData.discount_percentage) : 0,
        discount_amount: formData.discount_type === 'fixed' ? parseFloat(formData.discount_amount) : 0,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: true,
        created_by: userId,
      };

      if (editingId) {
        const { error } = await supabase
          .from('product_discounts')
          .update(discountData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Discount updated successfully");
      } else {
        const { error } = await supabase
          .from('product_discounts')
          .insert([discountData]);

        if (error) throw error;
        toast.success("Discount created successfully");
      }

      setFormData({ product_id: "", discount_type: "percentage", discount_percentage: "", discount_amount: "", start_date: "", end_date: "" });
      setShowForm(false);
      setEditingId(null);
      fetchDiscounts();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save discount");
    }
  };

  const handleEdit = (discount: any) => {
    // Convert UTC date to local datetime for datetime-local input
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);
    
    // Format: YYYY-MM-DDTHH:mm
    const formatLocalDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      product_id: discount.product_id,
      discount_type: discount.discount_type || 'percentage',
      discount_percentage: discount.discount_percentage?.toString() || "",
      discount_amount: discount.discount_amount?.toString() || "",
      start_date: formatLocalDateTime(startDate),
      end_date: formatLocalDateTime(endDate),
    });
    setEditingId(discount.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!discountToDelete) return;

    try {
      const { error } = await supabase
        .from('product_discounts')
        .delete()
        .eq('id', discountToDelete);

      if (error) throw error;
      toast.success("Discount deleted successfully");
      fetchDiscounts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete discount");
    } finally {
      setDeleteDialogOpen(false);
      setDiscountToDelete(null);
    }
  };

  // Check if discount is expired
  const isExpired = (discount: any) => {
    return new Date(discount.end_date) < new Date();
  };

  // Check if discount is currently active (within date range and is_active)
  const isActive = (discount: any) => {
    const now = new Date();
    const start = new Date(discount.start_date);
    const end = new Date(discount.end_date);
    return now >= start && now <= end && discount.is_active;
  };

  const getEstimatedPrice = (discount: any) => {
    const product = products.find(p => p.id === discount.product_id);
    if (!product) return null;
    
    const originalPrice = parseFloat(product.price);
    let discountedPrice = originalPrice;
    
    if (discount.discount_type === 'percentage') {
      discountedPrice = originalPrice - (originalPrice * discount.discount_percentage / 100);
    } else {
      discountedPrice = originalPrice - discount.discount_amount;
    }
    
    return { originalPrice, discountedPrice: Math.max(0, discountedPrice) };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading discounts..." />
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
          <h1 className="text-xl sm:text-2xl font-bold">Limited Discounts</h1>
          <Button 
            className="ml-auto" 
            size="sm"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ product_id: "", discount_type: "percentage", discount_percentage: "", discount_amount: "", start_date: "", end_date: "" });
            }}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Discount</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? "Edit" : "Create"} Limited Discount</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product">Product</Label>
                    <select
                      id="product"
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.barcode}) - ₹{product.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="discount_type">Discount Type</Label>
                    <select
                      id="discount_type"
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "fixed" | "percentage" })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  {formData.discount_type === 'percentage' ? (
                    <div>
                      <Label htmlFor="discount_percentage">Discount (%)</Label>
                      <Input
                        id="discount_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                        placeholder="e.g., 20"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                      <Input
                        id="discount_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                        placeholder="e.g., 100"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingId ? "Update" : "Create"} Discount</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({ product_id: "", discount_type: "percentage", discount_percentage: "", discount_amount: "", start_date: "", end_date: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((discount) => {
            const priceEstimate = getEstimatedPrice(discount);
            const expired = isExpired(discount);
            const active = isActive(discount);
            
            return (
              <Card key={discount.id} className={expired ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold">{discount.products?.name}</h3>
                      <p className="text-sm text-muted-foreground">{discount.products?.barcode}</p>
                      <p className="text-lg font-semibold text-primary mt-2">
                        {discount.discount_type === 'percentage' 
                          ? `${discount.discount_percentage}% OFF` 
                          : `₹${discount.discount_amount} OFF`}
                      </p>
                      {priceEstimate && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground line-through">₹{priceEstimate.originalPrice.toFixed(2)}</p>
                          <p className="text-lg font-bold text-green-600">₹{priceEstimate.discountedPrice.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      expired 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        : active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {expired ? 'Expired' : active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    <p>Start: {new Date(discount.start_date).toLocaleString()}</p>
                    <p>End: {new Date(discount.end_date).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(discount)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => {
                        setDiscountToDelete(discount.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {discounts.length === 0 && !showForm && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No discounts created yet. Click "Add Discount" to create one.</p>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Discount</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this discount? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDiscountToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default LimitedDiscounts;
