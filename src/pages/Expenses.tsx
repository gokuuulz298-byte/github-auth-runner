import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Receipt, Trash2, Edit2, X, Check, Calendar, Wallet, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Loader2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import LoadingSpinner from "@/components/LoadingSpinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Skeleton } from "@/components/ui/skeleton";

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
  "Rent", "Utilities", "Salaries", "Supplies", "Marketing",
  "Maintenance", "Transportation", "Food & Beverages", "Insurance", "Taxes", "Miscellaneous",
];

const Expenses = () => {
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [previousMonthExpenses, setPreviousMonthExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  const [formData, setFormData] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    description: "",
    amount: "",
    payment_mode: "cash",
    receipt_number: "",
  });

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetchExpenses();
    }
  }, [selectedMonth, userId]);

  const fetchExpenses = async () => {
    try {
      if (!userId) return;

      const monthDate = parseISO(selectedMonth + "-01");
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("created_by", userId)
        .gte("expense_date", start.toISOString())
        .lte("expense_date", end.toISOString())
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as Expense[]);

      const prevMonthDate = subMonths(monthDate, 1);
      const prevStart = startOfMonth(prevMonthDate);
      const prevEnd = endOfMonth(prevMonthDate);

      const { data: prevData } = await supabase
        .from("expenses")
        .select("*")
        .eq("created_by", userId)
        .gte("expense_date", prevStart.toISOString())
        .lte("expense_date", prevEnd.toISOString());

      setPreviousMonthExpenses((prevData || []) as Expense[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ expense_date: format(new Date(), "yyyy-MM-dd"), category: "", description: "", amount: "", payment_mode: "cash", receipt_number: "" });
    setAddDialogOpen(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formData.category || !formData.amount) { toast.error("Please fill required fields"); return; }
    setIsSubmitting(true);
    try {
      if (!userId) return;
      const { error } = await supabase.from("expenses").insert({
        created_by: userId, expense_date: formData.expense_date, category: formData.category,
        description: formData.description || null, amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode, receipt_number: formData.receipt_number || null,
      });
      if (error) throw error;
      toast.success("Expense added successfully");
      resetForm();
      fetchExpenses();
    } catch (error) { console.error(error); toast.error("Failed to add expense"); } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.category || !formData.amount) { toast.error("Please fill required fields"); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("expenses").update({
        expense_date: formData.expense_date, category: formData.category,
        description: formData.description || null, amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode, receipt_number: formData.receipt_number || null,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Expense updated successfully");
      resetForm();
      fetchExpenses();
    } catch (error) { console.error(error); toast.error("Failed to update expense"); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Expense deleted successfully");
      setDeleteId(null);
      fetchExpenses();
    } catch (error) { console.error(error); toast.error("Failed to delete expense"); }
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      expense_date: format(parseISO(expense.expense_date), "yyyy-MM-dd"),
      category: expense.category, description: expense.description || "",
      amount: expense.amount.toString(), payment_mode: expense.payment_mode || "cash",
      receipt_number: expense.receipt_number || "",
    });
    setAddDialogOpen(true);
  };

  const openDetail = (expense: Expense) => { setSelectedExpense(expense); setDetailDialogOpen(true); };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const categoryTotals = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount.toString()); return acc; }, {} as Record<string, number>);
  const prevCategoryTotals = previousMonthExpenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount.toString()); return acc; }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategories = sortedCategories.slice(0, 3);
  const remainingCategories = sortedCategories.slice(3);

  const getPercentageChange = (category: string, currentAmount: number) => {
    const prevAmount = prevCategoryTotals[category] || 0;
    if (prevAmount === 0) return null;
    return ((currentAmount - prevAmount) / prevAmount) * 100;
  };

  // Shimmer loader for expenses list
  const ExpensesShimmer = () => (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );

  if (loading && expenses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading expenses..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold">Expenses</h1>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md bg-background text-xs sm:text-sm w-[120px] sm:w-auto"
            />
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={() => { resetForm(); setAddDialogOpen(true); }}>
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
            <CardContent className="p-3 sm:pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-red-600" />
                <p className="text-xs text-muted-foreground">Total Expenses</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
            </CardContent>
          </Card>
          {topCategories.map(([category, total]) => {
            const change = getPercentageChange(category, total);
            return (
              <Card key={category}>
                <CardContent className="p-3 sm:pt-4">
                  <p className="text-xs text-muted-foreground truncate">{category}</p>
                  <p className="text-lg sm:text-xl font-bold">₹{total.toFixed(2)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {change === null ? (
                      <span className="text-[10px] text-blue-500 font-medium">New this month</span>
                    ) : change > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-red-500" />
                        <span className="text-[10px] text-red-500">+{change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-green-500" />
                        <span className="text-[10px] text-green-500">{change.toFixed(1)}%</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Expandable All Categories */}
        {remainingCategories.length > 0 && (
          <Collapsible open={categoriesExpanded} onOpenChange={setCategoriesExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full flex items-center justify-between">
                <span>View All Categories ({sortedCategories.length})</span>
                {categoriesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {sortedCategories.map(([category, total]) => {
                  const prevAmount = prevCategoryTotals[category] || 0;
                  const change = getPercentageChange(category, total);
                  return (
                    <Card key={category} className="relative">
                      <CardContent className="p-3 sm:pt-4 pb-3">
                        <p className="text-xs text-muted-foreground truncate font-medium">{category}</p>
                        <p className="text-base sm:text-lg font-bold">₹{total.toFixed(2)}</p>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-[10px] text-muted-foreground">Last: ₹{prevAmount.toFixed(2)}</p>
                          {change !== null && (
                            <span className={`text-[10px] font-medium ${change > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {change > 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Expenses List / Grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-5 w-5" />
              {format(parseISO(selectedMonth + "-01"), "MMMM yyyy")} Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ExpensesShimmer />
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No expenses recorded for this month</p>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {expenses.map((expense) => (
                  <Card
                    key={expense.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openDetail(expense)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                          <Receipt className="h-4 w-4 text-red-600" />
                        </div>
                        <span className="font-bold text-red-600 text-lg">₹{parseFloat(expense.amount.toString()).toFixed(2)}</span>
                      </div>
                      <p className="font-medium text-sm">{expense.category}</p>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{expense.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">{format(parseISO(expense.expense_date), "MMM dd")}</span>
                        <span className="text-xs text-muted-foreground capitalize">{expense.payment_mode}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); startEdit(expense); }}>
                          <Edit2 className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(expense.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => openDetail(expense)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <Receipt className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{expense.category}</p>
                          <span className="text-xs text-muted-foreground">{format(parseISO(expense.expense_date), "MMM dd")}</span>
                        </div>
                        {expense.description && <p className="text-xs text-muted-foreground truncate">{expense.description}</p>}
                        <p className="text-xs text-muted-foreground capitalize">{expense.payment_mode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-red-600">₹{parseFloat(expense.amount.toString()).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); startEdit(expense); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(expense.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setAddDialogOpen(open); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {editingId ? "Edit Expense" : "Add New Expense"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} />
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={formData.payment_mode} onValueChange={(v) => setFormData({ ...formData, payment_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Receipt Number</Label>
                <Input value={formData.receipt_number} onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })} placeholder="Optional" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional notes" rows={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => (editingId ? handleUpdate(editingId) : handleAdd())} className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" />{editingId ? "Updating..." : "Adding..."}</>) : (<><Check className="h-4 w-4 mr-1" />{editingId ? "Update" : "Add"} Expense</>)}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={isSubmitting}><X className="h-4 w-4 mr-1" />Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Expense Details</DialogTitle></DialogHeader>
            {selectedExpense && (
              <div className="space-y-4">
                <div className="text-center py-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">₹{parseFloat(selectedExpense.amount.toString()).toFixed(2)}</p>
                  <p className="text-muted-foreground">{selectedExpense.category}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{format(parseISO(selectedExpense.expense_date), "PPP")}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Payment Mode</p>
                    <p className="font-medium capitalize">{selectedExpense.payment_mode}</p>
                  </div>
                  {selectedExpense.receipt_number && (
                    <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground">Receipt Number</p>
                      <p className="font-medium">{selectedExpense.receipt_number}</p>
                    </div>
                  )}
                  {selectedExpense.description && (
                    <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedExpense.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setDetailDialogOpen(false); startEdit(selectedExpense); }}>
                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { setDetailDialogOpen(false); setDeleteId(selectedExpense.id); }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Expenses;
