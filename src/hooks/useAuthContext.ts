import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type UserRole = 'admin' | 'staff' | 'waiter';

interface UserRoleData {
  role: UserRole;
  parent_user_id: string | null;
}

interface AuthContext {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  parentUserId: string | null; // The admin's user ID (for staff/waiter)
  userId: string | null; // The effective user ID for data queries (admin's ID for staff, own ID for admin)
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isWaiter: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

export const useAuthContext = (): AuthContext => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, parent_user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        // Default to admin if no role found (for existing users)
        setRole('admin');
        setParentUserId(null);
        return;
      }

      if (data) {
        setRole(data.role as UserRole);
        setParentUserId(data.parent_user_id);
      } else {
        // No role found - assume admin (backwards compatibility)
        setRole('admin');
        setParentUserId(null);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('admin');
      setParentUserId(null);
    }
  }, []);

  const refreshRole = useCallback(async () => {
    if (user?.id) {
      await fetchUserRole(user.id);
    }
  }, [user?.id, fetchUserRole]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setParentUserId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  useEffect(() => {
    // Update loading state when role is fetched
    if (user && role !== null) {
      setLoading(false);
    }
  }, [user, role]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setParentUserId(null);
    navigate("/auth");
  };

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isWaiter = role === 'waiter';
  
  // For staff/waiter, use the admin's ID to query data
  // For admin, use their own ID
  const userId = parentUserId || user?.id || null;

  return {
    user,
    session,
    role,
    parentUserId,
    userId,
    loading,
    isAdmin,
    isStaff,
    isWaiter,
    signOut,
    refreshRole,
  };
};
