import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
          setError(error.message);
          // Still redirect to auth on error
          setTimeout(() => navigate("/auth"), 1000);
          return;
        }
        if (session) {
          navigate("/dashboard");
        } else {
          navigate("/auth");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setError("Connection failed");
        setTimeout(() => navigate("/auth"), 1000);
      }
    };
    
    checkSession();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
};

export default Index;
