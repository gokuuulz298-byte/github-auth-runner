import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Users, Edit } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Badge } from "@/components/ui/badge";

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
  current_order_id: string | null;
}

const RestaurantTables = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user, isAdmin } = useAuthContext();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [formData, setFormData] = useState({ table_number: "", capacity: "4" });

  useEffect(() => {
    if (!authLoading && userId) {
      fetchTables();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, userId, user]);

  const fetchTables = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('table_number');

    if (error) {
      console.error(error);
      toast.error("Failed to load tables");
    } else {
      setTables(data || []);
    }
  };

  const handleSubmit = async () => {
    if (!formData.table_number.trim() || !userId) {
      toast.error("Table number is required");
      return;
    }

    try {
      if (editingTable) {
        const { error } = await supabase
          .from('restaurant_tables')
          .update({
            table_number: formData.table_number.trim(),
            capacity: parseInt(formData.capacity) || 4
          })
          .eq('id', editingTable.id);

        if (error) throw error;
        toast.success("Table updated");
      } else {
        const { error } = await supabase
          .from('restaurant_tables')
          .insert([{
            table_number: formData.table_number.trim(),
            capacity: parseInt(formData.capacity) || 4,
            created_by: userId,
            status: 'available'
          }]);

        if (error) throw error;
        toast.success("Table added");
      }

      setDialogOpen(false);
      setEditingTable(null);
      setFormData({ table_number: "", capacity: "4" });
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || "Failed to save table");
    }
  };

  const handleEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete table");
    } else {
      toast.success("Table deleted");
      fetchTables();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Restaurant Tables</h1>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingTable(null);
                setFormData({ table_number: "", capacity: "4" });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Table Number *</Label>
                    <Input
                      value={formData.table_number}
                      onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                      placeholder="e.g., T1, Table 1, A1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="Number of seats"
                    />
                  </div>
                  <Button className="w-full" onClick={handleSubmit}>
                    {editingTable ? "Update Table" : "Add Table"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>All Tables</CardTitle>
            <CardDescription>{tables.length} tables configured</CardDescription>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tables configured yet</p>
                <p className="text-sm mt-2">Add tables to start managing your restaurant layout</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {tables.map((table) => (
                  <Card key={table.id} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(table.status)}`} />
                    <CardContent className="p-4 pt-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{table.table_number}</h3>
                        <Badge variant={table.status === 'available' ? 'default' : 'secondary'}>
                          {table.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <Users className="h-4 w-4" />
                        <span>{table.capacity} seats</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(table)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDelete(table.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RestaurantTables;
