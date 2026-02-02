import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Users, Edit, Grid3X3, LayoutGrid, Circle, Square, Octagon } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/layout/PageHeader";
import { PageWrapper } from "@/components/layout";

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
  current_order_id: string | null;
  position_x?: number;
  position_y?: number;
  shape?: string;
  notes?: string;
}

const RestaurantTables = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user, isAdmin } = useAuthContext();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [formData, setFormData] = useState({ 
    table_number: "", 
    capacity: "4",
    shape: "rectangle",
    notes: ""
  });
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  useEffect(() => {
    if (!authLoading && userId) {
      fetchTables();
      
      // Real-time subscription for table status updates
      const channel = supabase
        .channel('restaurant-tables-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'restaurant_tables' },
          () => fetchTables()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
            capacity: parseInt(formData.capacity) || 4,
            shape: formData.shape,
            notes: formData.notes || null
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
            status: 'available',
            shape: formData.shape,
            notes: formData.notes || null,
            position_x: Math.floor(Math.random() * 400) + 50,
            position_y: Math.floor(Math.random() * 300) + 50
          }]);

        if (error) throw error;
        toast.success("Table added");
      }

      setDialogOpen(false);
      setEditingTable(null);
      setFormData({ table_number: "", capacity: "4", shape: "rectangle", notes: "" });
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || "Failed to save table");
    }
  };

  const handleEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity.toString(),
      shape: table.shape || "rectangle",
      notes: table.notes || ""
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
      case 'available': return 'bg-emerald-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-amber-500';
      case 'cleaning': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
      case 'occupied': return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'reserved': return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      case 'cleaning': return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      default: return 'bg-muted';
    }
  };

  const getShapeIcon = (shape?: string) => {
    switch (shape) {
      case 'circle': return Circle;
      case 'octagon': return Octagon;
      default: return Square;
    }
  };

  const statusCounts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <PageHeader title="Restaurant Tables" backPath="/dashboard">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="hidden sm:flex border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="h-8 px-3"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Map
            </Button>
          </div>
          
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingTable(null);
                setFormData({ table_number: "", capacity: "4", shape: "rectangle", notes: "" });
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle>
                  <DialogDescription>
                    {editingTable ? "Update table details" : "Configure a new restaurant table"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Table Number *</Label>
                      <Input
                        value={formData.table_number}
                        onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                        placeholder="e.g., T1, A1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity</Label>
                      <Input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="4"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Shape</Label>
                    <Select value={formData.shape} onValueChange={(v) => setFormData({ ...formData, shape: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rectangle">Rectangle</SelectItem>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="octagon">Octagon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g., Near window, VIP section"
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
      </PageHeader>

      <main className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
        {/* Status Legend */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Available ({statusCounts.available})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Occupied ({statusCounts.occupied})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Reserved ({statusCounts.reserved})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Cleaning ({statusCounts.cleaning})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {tables.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No tables configured yet</p>
                <p className="text-sm mt-2">Add tables to start managing your restaurant layout</p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {tables.map((table) => {
              const ShapeIcon = getShapeIcon(table.shape);
              return (
                <Card 
                  key={table.id} 
                  className={`relative overflow-hidden transition-all hover:shadow-md ${getStatusBgColor(table.status)}`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${getStatusColor(table.status)}`} />
                  <CardContent className="p-3 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShapeIcon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-bold">{table.table_number}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="h-3 w-3" />
                      <span>{table.capacity} seats</span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-[10px] ${
                        table.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                        table.status === 'occupied' ? 'bg-red-100 text-red-700' :
                        table.status === 'reserved' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {table.status}
                    </Badge>
                    {table.notes && (
                      <p className="text-[10px] text-muted-foreground mt-2 truncate">{table.notes}</p>
                    )}
                    {isAdmin && (
                      <div className="flex gap-1 mt-3">
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => handleEdit(table)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => handleDelete(table.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Visual Map View */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Floor Layout</CardTitle>
              <CardDescription>Visual representation of your restaurant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[500px] bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
                {/* Grid pattern background */}
                <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
                
                {tables.map((table, idx) => {
                  const posX = table.position_x || (50 + (idx % 5) * 120);
                  const posY = table.position_y || (50 + Math.floor(idx / 5) * 100);
                  const ShapeIcon = getShapeIcon(table.shape);
                  
                  return (
                    <div
                      key={table.id}
                      className={`absolute cursor-pointer transition-all hover:scale-110 hover:z-10 ${
                        table.shape === 'circle' ? 'rounded-full' : 
                        table.shape === 'octagon' ? 'rounded-xl' : 'rounded-lg'
                      } ${getStatusBgColor(table.status)} border-2 shadow-lg`}
                      style={{
                        left: `${Math.min(posX, 85)}%`,
                        top: `${Math.min(posY, 80)}%`,
                        transform: 'translate(-50%, -50%)',
                        width: table.capacity >= 6 ? '100px' : '80px',
                        height: table.capacity >= 6 ? '80px' : '60px',
                      }}
                      onClick={() => isAdmin && handleEdit(table)}
                    >
                      <div className="flex flex-col items-center justify-center h-full p-2">
                        <span className="font-bold text-sm">{table.table_number}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {table.capacity}
                        </div>
                      </div>
                      {/* Status indicator dot */}
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(table.status)} border-2 border-white dark:border-slate-800 shadow`} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </PageWrapper>
  );
};

export default RestaurantTables;