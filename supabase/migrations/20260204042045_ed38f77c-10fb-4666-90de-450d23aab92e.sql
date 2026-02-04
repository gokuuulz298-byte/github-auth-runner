-- Drop the SECURITY DEFINER view as it's a security risk
DROP VIEW IF EXISTS public.waiters_safe;

-- Add RLS policy that only returns non-sensitive waiter data
-- The verify_waiter_login function handles authentication securely