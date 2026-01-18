import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/hooks/useAuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const Categories = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user } = useAuthContext();
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && userId && isOnline) {
      fetchCategories();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, userId, user, isOnline]);

  const fetchCategories = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to fetch categories: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !userId) {
      toast.error("Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategory.trim(), created_by: userId }]);

      if (error) throw error;

      toast.success("Category added successfully");
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading categories..." />
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
          <h1 className="text-2xl font-bold">Categories</h1>
          {!isOnline && (
            <span className="ml-auto bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm">
              Offline Mode
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Add New Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div>
                <Label htmlFor="category-name" className="text-sm sm:text-base">Category Name</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="category-name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter category name"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    className="text-sm sm:text-base"
                  />
                  <Button 
                    onClick={handleAddCategory} 
                    className="shrink-0"
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{isSubmitting ? 'Adding...' : 'Add'}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">All Categories</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
                    No categories added yet
                  </p>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="font-medium text-sm sm:text-base">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={deletingId === category.id}
                      >
                        <Trash2 className={`h-4 w-4 text-destructive ${deletingId === category.id ? 'animate-pulse' : ''}`} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Categories;
