import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Plus, Trash2, Edit2, Eye, EyeOff, Check, X } from "lucide-react";
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

interface Waiter {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
}

interface WaiterCardProps {
  waiters: Waiter[];
  onRefresh: () => void;
}

const WaiterCard = ({ waiters, onRefresh }: WaiterCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    display_name: "",
  });

  const resetForm = () => {
    setFormData({ username: "", password: "", display_name: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formData.username || !formData.password || !formData.display_name) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use secure RPC function that hashes password server-side
      const { error } = await supabase.rpc('create_waiter', {
        p_username: formData.username,
        p_password: formData.password,
        p_display_name: formData.display_name,
        p_created_by: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Username already exists");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Waiter added successfully");
      resetForm();
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add waiter");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.username || !formData.password || !formData.display_name) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      // Use secure RPC function that hashes password server-side
      const { error } = await supabase.rpc('update_waiter', {
        p_waiter_id: id,
        p_username: formData.username,
        p_password: formData.password,
        p_display_name: formData.display_name,
      });

      if (error) throw error;

      toast.success("Waiter updated successfully");
      resetForm();
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update waiter");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("waiters").delete().eq("id", deleteId);

      if (error) throw error;

      toast.success("Waiter deleted successfully");
      setDeleteId(null);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete waiter");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("waiters")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const startEdit = (waiter: Waiter) => {
    setEditingId(waiter.id);
    setFormData({
      username: waiter.username,
      password: "", // Password must be re-entered for security
      display_name: waiter.display_name,
    });
    setIsAdding(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="h-5 w-5 text-indigo-600" />
            Waiter Management
          </CardTitle>
          {!isAdding && !editingId && (
            <Button
              size="sm"
              onClick={() => {
                setIsAdding(true);
                setFormData({ username: "", password: "", display_name: "" });
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Waiter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3 border">
            <h4 className="font-medium text-sm">
              {isAdding ? "Add New Waiter" : "Edit Waiter"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Display Name</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="John Doe"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="john123"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword["form"] ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••"
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
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => (editingId ? handleUpdate(editingId) : handleAdd())}
              >
                <Check className="h-3 w-3 mr-1" />
                {editingId ? "Update" : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Waiters List */}
        {waiters.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-muted-foreground">
            <UserCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No waiters added yet</p>
            <p className="text-xs">Add waiters to enable the waiter interface</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waiters.map((waiter) => (
              <div
                key={waiter.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  waiter.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    waiter.is_active ? "bg-indigo-100" : "bg-gray-100"
                  }`}>
                    <UserCircle className={`h-5 w-5 ${waiter.is_active ? "text-indigo-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{waiter.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{waiter.username}</p>
                  </div>
                  <Badge variant={waiter.is_active ? "default" : "secondary"} className="text-xs">
                    {waiter.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => toggleActive(waiter.id, waiter.is_active)}
                  >
                    {waiter.is_active ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEdit(waiter)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(waiter.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Waiter</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this waiter? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default WaiterCard;
