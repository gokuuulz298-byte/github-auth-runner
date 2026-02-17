import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCog, Plus, Trash2, Edit2, Eye, EyeOff, Check, X, Receipt, ChefHat, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Staff {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  allowed_modules: string[];
  is_active: boolean;
  show_in_bill: boolean;
  auth_user_id?: string;
}

interface StaffCardProps {
  staff: Staff[];
  onRefresh: () => void;
  isRestaurantMode?: boolean;
}

const BILLING_MODULES = [
  { id: "modern-billing", label: "Modern Billing" },
];

const MANAGEMENT_MODULES = [
  { id: "inventory", label: "Inventory" },
  { id: "invoices", label: "Invoices" },
  { id: "customers", label: "Customers" },
  { id: "analytics", label: "Analytics" },
  { id: "categories", label: "Categories" },
  { id: "counters", label: "Counters" },
  { id: "coupons", label: "Coupons" },
  { id: "discounts", label: "Limited Discounts" },
  { id: "barcodes", label: "Barcodes" },
  { id: "templates", label: "Templates" },
  { id: "purchases", label: "Purchases" },
  { id: "expenses", label: "Expenses" },
  { id: "low-stocks", label: "Low Stocks" },
  { id: "advanced-reports", label: "Advanced Reports" },
  { id: "audits", label: "Audits" },
  { id: "returns", label: "Returns" },
  { id: "inventory-movements", label: "Stock Ledger" },
  { id: "suppliers", label: "Suppliers" },
  { id: "profile", label: "Profile" },
];

const RESTAURANT_MODULES = [
  { id: "kitchen", label: "Kitchen Display", icon: ChefHat },
  { id: "waiter", label: "Waiter Interface", icon: Users },
];

const StaffCard = ({ staff, onRefresh, isRestaurantMode = false }: StaffCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    display_name: "",
    allowed_modules: [] as string[],
    show_in_bill: false,
  });

  const getAllModules = () => {
    const modules = [...BILLING_MODULES, ...MANAGEMENT_MODULES];
    if (isRestaurantMode) {
      modules.push(...RESTAURANT_MODULES);
    }
    return modules;
  };

  const resetForm = () => {
    setFormData({ email: "", password: "", display_name: "", allowed_modules: [], show_in_bill: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formData.email || !formData.password || !formData.display_name) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const emailLower = formData.email.toLowerCase().trim();

      // Check if email already exists in staff table (for this admin)
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle();

      if (existingStaff) {
        toast.error("A staff member with this email already exists");
        setIsSubmitting(false);
        return;
      }

      // Create Supabase auth user for staff
      // Note: We use the admin's supabase client to create the user
      // The user will be able to login with these credentials
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLower,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            display_name: formData.display_name,
            role: 'staff',
            parent_user_id: user.id
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error("This email is already registered. Please use a different email.");
        } else {
          toast.error(authError.message);
        }
        setIsSubmitting(false);
        return;
      }

      // Insert into staff table with auth_user_id
      const { error: staffError } = await supabase.from("staff").insert({
        created_by: user.id,
        email: emailLower,
        password_hash: formData.password, // Store for reference (hashed by auth)
        display_name: formData.display_name,
        allowed_modules: formData.allowed_modules,
        show_in_bill: formData.show_in_bill,
        auth_user_id: authData.user?.id || null,
      });

      if (staffError) {
        if (staffError.code === "23505") {
          toast.error("A staff member with this email already exists");
        } else {
          throw staffError;
        }
        setIsSubmitting(false);
        return;
      }

      // Create user_roles entry
      if (authData.user?.id) {
        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'staff',
          parent_user_id: user.id
        });
      }

      toast.success("Staff member added successfully! They can now login with their email and password.");
      resetForm();
      onRefresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.email || !formData.display_name) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        email: formData.email.toLowerCase().trim(),
        display_name: formData.display_name,
        allowed_modules: formData.allowed_modules,
        show_in_bill: formData.show_in_bill,
      };
      
      if (formData.password) {
        updateData.password_hash = formData.password;
      }

      const { error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          toast.error("A staff member with this email already exists");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Staff member updated successfully");
      resetForm();
      onRefresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsSubmitting(true);
    try {
      // Get staff info first
      const { data: staffData } = await supabase
        .from('staff')
        .select('auth_user_id')
        .eq('id', deleteId)
        .single();

      // Delete from staff table
      const { error } = await supabase.from("staff").delete().eq("id", deleteId);
      if (error) throw error;

      // Delete user_roles entry if exists
      if (staffData?.auth_user_id) {
        await supabase.from('user_roles').delete().eq('user_id', staffData.auth_user_id);
      }

      toast.success("Staff member deleted successfully");
      setDeleteId(null);
      onRefresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const startEdit = (member: Staff) => {
    setEditingId(member.id);
    setFormData({
      email: member.email,
      password: "",
      display_name: member.display_name,
      allowed_modules: member.allowed_modules || [],
      show_in_bill: member.show_in_bill || false,
    });
    setIsAdding(false);
  };

  const toggleModule = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_modules: prev.allowed_modules.includes(moduleId)
        ? prev.allowed_modules.filter(m => m !== moduleId)
        : [...prev.allowed_modules, moduleId]
    }));
  };

  const selectAllModules = () => {
    setFormData(prev => ({
      ...prev,
      allowed_modules: getAllModules().map(m => m.id)
    }));
  };

  const clearAllModules = () => {
    setFormData(prev => ({
      ...prev,
      allowed_modules: []
    }));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5 text-blue-600" />
            Staff Management
          </CardTitle>
          {!isAdding && !editingId && (
            <Button
              size="sm"
              onClick={() => {
                setIsAdding(true);
                setFormData({ email: "", password: "", display_name: "", allowed_modules: [], show_in_bill: false });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Staff
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-4 border">
            <h4 className="font-medium text-sm">
              {isAdding ? "Add New Staff Member" : "Edit Staff Member"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Display Name *</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="John Doe"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="h-9"
                  disabled={!!editingId}
                />
                {isAdding && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Staff will login using this email
                  </p>
                )}
              </div>
              {/* Only show password field when adding new staff, not when editing */}
              {isAdding && (
                <div className="sm:col-span-2">
                  <Label className="text-xs">Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword["form"] ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="h-9 pr-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9"
                      onClick={() => setShowPassword({ ...showPassword, form: !showPassword["form"] })}
                    >
                      {showPassword["form"] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Module Access */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Module Access</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllModules} className="h-6 text-xs">
                    Select All
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAllModules} className="h-6 text-xs">
                    Clear All
                  </Button>
                </div>
              </div>
              
              {/* Billing Modules */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Billing</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-background rounded-lg border">
                  {BILLING_MODULES.map((module) => (
                    <div key={module.id} className="flex items-center gap-2">
                      <Checkbox
                        id={module.id}
                        checked={formData.allowed_modules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                      />
                      <Label htmlFor={module.id} className="text-xs cursor-pointer">
                        {module.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restaurant Modules - Only show in restaurant mode */}
              {isRestaurantMode && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Restaurant</p>
                  <div className="grid grid-cols-2 gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    {RESTAURANT_MODULES.map((module) => (
                      <div key={module.id} className="flex items-center gap-2">
                        <Checkbox
                          id={module.id}
                          checked={formData.allowed_modules.includes(module.id)}
                          onCheckedChange={() => toggleModule(module.id)}
                        />
                        <Label htmlFor={module.id} className="text-xs cursor-pointer flex items-center gap-1">
                          <module.icon className="h-3 w-3" />
                          {module.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Management Modules */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Management</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-background rounded-lg border">
                  {MANAGEMENT_MODULES.map((module) => (
                    <div key={module.id} className="flex items-center gap-2">
                      <Checkbox
                        id={module.id}
                        checked={formData.allowed_modules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                      />
                      <Label htmlFor={module.id} className="text-xs cursor-pointer">
                        {module.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Show in Bill */}
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.show_in_bill}
                onCheckedChange={(v) => setFormData({ ...formData, show_in_bill: v })}
              />
              <div>
                <Label className="text-sm">Show in Thermal Bill</Label>
                <p className="text-xs text-muted-foreground">Display staff name on printed bills</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => (editingId ? handleUpdate(editingId) : handleAdd())}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {editingId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    {editingId ? "Update" : "Add"}
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Staff List */}
        {staff.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-muted-foreground">
            <UserCog className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No staff members added yet</p>
            <p className="text-xs">Add staff to give limited access to your POS</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  member.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    member.is_active ? "bg-blue-100" : "bg-gray-100"
                  }`}>
                    <UserCog className={`h-5 w-5 ${member.is_active ? "text-blue-600" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{member.display_name}</p>
                      <Badge variant={member.is_active ? "default" : "secondary"} className="text-xs">
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {member.show_in_bill && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Receipt className="h-3 w-3" />
                          Bill
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.allowed_modules?.slice(0, 3).map(mod => (
                        <Badge key={mod} variant="outline" className="text-[10px] py-0">
                          {mod}
                        </Badge>
                      ))}
                      {(member.allowed_modules?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          +{(member.allowed_modules?.length || 0) - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => toggleActive(member.id, member.is_active)}
                  >
                    {member.is_active ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEdit(member)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setDeleteId(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this staff member? This action cannot be undone.
              The staff member will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default StaffCard;