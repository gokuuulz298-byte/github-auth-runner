import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type UserRole = 'admin' | 'staff' | 'waiter';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  parentUserId: string | null;
  userId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isWaiter: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, parent_user_id')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('admin');
        setParentUserId(null);
        return;
      }

      if (data) {
        setRole(data.role as UserRole);
        setParentUserId(data.parent_user_id);
      } else {
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
    // Get initial session first (synchronous from cache)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        fetchUserRole(s.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Then listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          fetchUserRole(s.user.id).then(() => setLoading(false));
        } else {
          setRole(null);
          setParentUserId(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

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
  const userId = parentUserId || user?.id || null;

  return (
    <AuthContext.Provider value={{
      user, session, role, parentUserId, userId,
      loading, isAdmin, isStaff, isWaiter,
      signOut, refreshRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
