import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Minus, Loader2, History, ArrowUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { format } from "date-fns";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    stock_quantity: number;
    buying_price?: number;
    unit?: string;
  } | null;
  userId: string | null;
  onSuccess: () => void;
}

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  reference_type: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  unit_price: number | null;
}

const StockAdjustmentDialog = ({
  open,
  onOpenChange,
  product,
  userId,
  onSuccess,
}: StockAdjustmentDialogProps) => {
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("adjustment");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const reasons = [
    { value: "adjustment", label: "Stock Adjustment" },
    { value: "damage", label: "Damaged/Spoiled" },
    { value: "production", label: "Used in Production" },
    { value: "correction", label: "Inventory Correction" },
    { value: "received", label: "Stock Received" },
    { value: "return", label: "Returned Stock" },
  ];

  const fetchMovements = async () => {
    if (!product?.id || !userId) return;

    setLoadingMovements(true);
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleSubmit = async () => {
    if (!product || !userId) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (adjustmentType === "remove" && qty > product.stock_quantity) {
      toast.error(`Cannot remove more than current stock (${product.stock_quantity})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newStock =
        adjustmentType === "add"
          ? product.stock_quantity + qty
          : product.stock_quantity - qty;

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", product.id);

      if (updateError) throw updateError;

      // Log movement
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          product_id: product.id,
          product_name: product.name,
          movement_type: adjustmentType === "add" ? "inflow" : "outflow",
          quantity: qty,
          reference_type: reason,
          reference_number: `ADJ-${Date.now().toString().slice(-6)}`,
          unit_price: product.buying_price || 0,
          total_value: qty * (product.buying_price || 0),
          notes: notes || null,
          created_by: userId,
        });

      if (movementError) throw movementError;

      toast.success(
        `Stock ${adjustmentType === "add" ? "increased" : "decreased"} by ${qty}`
      );
      setQuantity("");
      setNotes("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && product) {
      fetchMovements();
    }
    if (!isOpen) {
      setQuantity("");
      setNotes("");
      setShowHistory(false);
    }
    onOpenChange(isOpen);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Stock Adjustment</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs"
            >
              <History className="h-4 w-4 mr-1" />
              {showHistory ? "Hide History" : "Show History"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium">{product.name}</p>
            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
              <span>
                Current Stock:{" "}
                <strong className="text-foreground">
                  {product.stock_quantity} {product.unit || "units"}
                </strong>
              </span>
              {product.buying_price && (
                <span>
                  Unit Cost:{" "}
                  <strong className="text-foreground">
                    {formatIndianCurrency(product.buying_price)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {!showHistory ? (
            <>
              {/* Adjustment Type */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={adjustmentType === "add" ? "default" : "outline"}
                  className={`flex-1 ${adjustmentType === "add" ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => setAdjustmentType("add")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stock
                </Button>
                <Button
                  type="button"
                  variant={adjustmentType === "remove" ? "default" : "outline"}
                  className={`flex-1 ${adjustmentType === "remove" ? "bg-red-600 hover:bg-red-700" : ""}`}
                  onClick={() => setAdjustmentType("remove")}
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Remove Stock
                </Button>
              </div>

              {/* Quantity */}
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="mt-1"
                />
              </div>

              {/* Reason */}
              <div>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !quantity}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adjusting...
                  </>
                ) : (
                  `${adjustmentType === "add" ? "Add" : "Remove"} ${quantity || 0} ${product.unit || "units"}`
                )}
              </Button>
            </>
          ) : (
            /* Movement History */
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Recent Stock Movements
              </h4>
              {loadingMovements ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : movements.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No stock movements found
                </p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {movements.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 border rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={m.movement_type === "inflow" ? "default" : "destructive"}
                            className={`text-xs ${m.movement_type === "inflow" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {m.movement_type === "inflow" ? "+" : "-"}
                            {m.quantity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(m.created_at), "dd MMM yyyy, HH:mm")}
                          </span>
                        </div>
                        <p className="text-xs mt-1 capitalize">
                          {m.reference_type.replace(/_/g, " ")}
                          {m.reference_number && ` • ${m.reference_number}`}
                        </p>
                        {m.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockAdjustmentDialog;
