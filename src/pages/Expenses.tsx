import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Receipt, Trash2, Edit2, X, Check, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  payment_mode: string;
  receipt_number: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Supplies",
  "Marketing",
  "Maintenance",
  "Transportation",
  "Food & Beverages",
  "Insurance",
  "Taxes",
  "Miscellaneous",
];

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  
  const [formData, setFormData] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    description: "",
    amount: "",
    payment_mode: "cash",
    receipt_number: "",
  });

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth]);

  const fetchExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthDate = parseISO(selectedMonth + "-01");
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("created_by", user.id)
        .gte("expense_date", start.toISOString())
        .lte("expense_date", end.toISOString())
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      expense_date: format(new Date(), "yyyy-MM-dd"),
      category: "",
      description: "",
      amount: "",
      payment_mode: "cash",
      receipt_number: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formData.category || !formData.amount) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("expenses").insert({
        created_by: user.id,
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description || null,
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
        receipt_number: formData.receipt_number || null,
      });

      if (error) throw error;

      toast.success("Expense added successfully");
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add expense");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.category || !formData.amount) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          expense_date: formData.expense_date,
          category: formData.category,
          description: formData.description || null,
          amount: parseFloat(formData.amount),
          payment_mode: formData.payment_mode,
          receipt_number: formData.receipt_number || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Expense updated successfully");
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update expense");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", deleteId);
      if (error) throw error;

      toast.success("Expense deleted successfully");
      setDeleteId(null);
      fetchExpenses();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete expense");
    }
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      expense_date: format(parseISO(expense.expense_date), "yyyy-MM-dd"),
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount.toString(),
      payment_mode: expense.payment_mode || "cash",
      receipt_number: expense.receipt_number || "",
    });
    setIsAdding(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount.toString());
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Expenses</h1>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            />
            {!isAdding && !editingId && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
            </CardContent>
          </Card>
          {Object.entries(categoryTotals).slice(0, 3).map(([category, total]) => (
            <Card key={category}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground truncate">{category}</p>
                <p className="text-xl font-bold">₹{total.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isAdding ? "Add New Expense" : "Edit Expense"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={formData.payment_mode} onValueChange={(v) => setFormData({ ...formData, payment_mode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Receipt Number</Label>
                  <Input
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional notes"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => (editingId ? handleUpdate(editingId) : handleAdd())}>
                  <Check className="h-4 w-4 mr-1" />
                  {editingId ? "Update" : "Add"}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")} Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No expenses recorded for this month</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Receipt className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{expense.category}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(expense.expense_date), "MMM dd")}
                          </span>
                        </div>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground truncate">{expense.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground capitalize">{expense.payment_mode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-red-600">₹{parseFloat(expense.amount.toString()).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(expense)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this expense? This action cannot be undone.
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
      </main>
    </div>
  );
};

export default Expenses;