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
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('name');

      if (error) throw error;
      setCounters(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch counters");
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

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Counter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="counter-name">Counter Name</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="counter-name"
                    value={newCounter}
                    onChange={(e) => setNewCounter(e.target.value)}
                    placeholder="Enter counter name (e.g., Counter 1, Main Counter)"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCounter()}
                  />
                  <Button onClick={handleAddCounter}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Counters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {counters.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No counters added yet
                  </p>
                ) : (
                  counters.map((counter) => (
                    <div
                      key={counter.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="font-medium">{counter.name}</span>
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
