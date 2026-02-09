/**
 * Helper hook that returns the tenant-aware user ID from useAuthContext.
 * 
 * For admin users: returns their own auth.uid()
 * For staff/waiter users: returns the parent admin's user ID
 * 
 * All database queries should use this resolved ID for `created_by` / `user_id`
 * filters to ensure staff and waiter accounts can access the admin's data.
 */
import { useAuthContext } from "@/hooks/useAuthContext";

export const useTenantId = () => {
  const { userId, user, loading } = useAuthContext();
  return { tenantId: userId, authUser: user, loading };
};
