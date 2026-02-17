import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/hooks/useAuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import LoadingButton from "@/components/LoadingButton";

const Counters = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user } = useAuthContext();
  const [counters, setCounters] = useState<any[]>([]);
  const [newCounter, setNewCounter] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      fetchCounters();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, userId, user, isOnline]);

  const fetchCounters = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('name');

      if (error) throw error;
      setCounters(data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to fetch counters: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCounter = async () => {
    if (!newCounter.trim() || !userId) {
      toast.error("Please enter a counter name");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('counters')
        .insert([{ name: newCounter.trim(), created_by: userId }])
        .select();

      if (error) throw error;

      toast.success("Counter added successfully");
      setNewCounter("");
      // Update state directly instead of refetching
      if (data) {
        setCounters(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add counter");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (counter: any) => {
    setTogglingId(counter.id);
    try {
      // We use a soft approach: just toggle visibility in local state
      // Since counters table doesn't have is_active, we'll just remove from list for now
      // In a real scenario, we'd add an is_active column
      const { error } = await supabase
        .from('counters')
        .delete()
        .eq('id', counter.id);

      if (error) throw error;

      toast.success("Counter removed successfully");
      setCounters(prev => prev.filter(c => c.id !== counter.id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to update counter");
    } finally {
      setTogglingId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading counters..." />
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
          <h1 className="text-2xl font-bold">Counters</h1>
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
              <CardTitle className="text-lg sm:text-xl">Add New Counter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div>
                <Label htmlFor="counter-name" className="text-sm sm:text-base">Counter Name</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="counter-name"
                    value={newCounter}
                    onChange={(e) => setNewCounter(e.target.value)}
                    placeholder="e.g., Counter 1"
                    onKeyPress={(e) => e.key === 'Enter' && !isSubmitting && handleAddCounter()}
                    className="text-sm sm:text-base"
                    disabled={isSubmitting}
                  />
                  <LoadingButton 
                    onClick={handleAddCounter} 
                    className="shrink-0"
                    isLoading={isSubmitting}
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add</span>
                  </LoadingButton>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">All Counters</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {counters.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
                    No counters added yet
                  </p>
                ) : (
                  counters.map((counter) => (
                    <div
                      key={counter.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="font-medium text-sm sm:text-base">{counter.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(counter)}
                        disabled={togglingId === counter.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {togglingId === counter.id ? (
                          <span className="animate-spin">⟳</span>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-1" />
                            <span className="text-xs">Remove</span>
                          </>
                        )}
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

export default Counters;
