import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Counters = () => {
  const navigate = useNavigate();
  const [counters, setCounters] = useState<any[]>([]);
  const [newCounter, setNewCounter] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    if (isOnline) {
      fetchCounters();
    }
  }, [isOnline]);

  const fetchCounters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view counters");
        return;
      }

      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;
      setCounters(data || []);
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to fetch counters: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddCounter = async () => {
    if (!newCounter.trim()) {
      toast.error("Please enter a counter name");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase
        .from('counters')
        .insert([{ name: newCounter.trim(), created_by: user.id }]);

      if (error) throw error;

      toast.success("Counter added successfully");
      setNewCounter("");
      fetchCounters();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add counter");
    }
  };

  const handleDeleteCounter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('counters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Counter deleted successfully");
      fetchCounters();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete counter");
    }
  };

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
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCounter()}
                    className="text-sm sm:text-base"
                  />
                  <Button onClick={handleAddCounter} className="shrink-0">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
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
                        size="icon"
                        onClick={() => handleDeleteCounter(counter.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
