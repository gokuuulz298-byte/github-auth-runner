import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface StaffSession {
  id: string;
  email: string;
  display_name: string;
  allowed_modules: string[];
  show_in_bill: boolean;
  created_by: string;
  type?: 'staff' | 'waiter';
}

interface AuthContext {
  user: User | null;
  session: Session | null;
  staffSession: StaffSession | null;
  isStaff: boolean;
  isAdmin: boolean;
  userId: string | null; // The effective user ID for data queries (admin's ID for staff)
  loading: boolean;
  signOut: () => Promise<void>;
}

export const useAuthContext = (): AuthContext => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for staff session first
    const storedStaffSession = sessionStorage.getItem('staffSession');
    if (storedStaffSession) {
      try {
        const parsed = JSON.parse(storedStaffSession);
        setStaffSession(parsed);
        setLoading(false);
        return;
      } catch {
        sessionStorage.removeItem('staffSession');
      }
    }

    // Check for admin session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear staff session if exists
    sessionStorage.removeItem('staffSession');
    setStaffSession(null);
    
    // Sign out from Supabase if logged in as admin
    if (session) {
      await supabase.auth.signOut();
    }
    
    navigate("/auth");
  };

  const isStaff = !!staffSession;
  const isAdmin = !!user && !staffSession;
  
  // For staff, use the admin's ID (created_by) to query data
  // For admin, use their own ID
  const userId = staffSession ? staffSession.created_by : user?.id ?? null;

  return {
    user,
    session,
    staffSession,
    isStaff,
    isAdmin,
    userId,
    loading,
    signOut,
  };
};
