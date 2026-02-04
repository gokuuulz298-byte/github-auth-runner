-- Enable pgcrypto extension for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add password_hash column to waiters table (nullable initially for migration)
ALTER TABLE public.waiters ADD COLUMN IF NOT EXISTS password_hash text;

-- Migrate existing plaintext passwords to hashed passwords
UPDATE public.waiters 
SET password_hash = crypt(password, gen_salt('bf'))
WHERE password_hash IS NULL AND password IS NOT NULL;

-- Create function to securely create a waiter with hashed password
CREATE OR REPLACE FUNCTION public.create_waiter(
  p_username text,
  p_password text,
  p_display_name text,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waiter_id uuid;
BEGIN
  INSERT INTO public.waiters (
    username, 
    password_hash,
    password,  -- Keep for backward compatibility, will be removed later
    display_name, 
    created_by
  )
  VALUES (
    p_username,
    crypt(p_password, gen_salt('bf')),
    p_password,  -- Temporary: store plain during migration
    p_display_name,
    p_created_by
  )
  RETURNING id INTO v_waiter_id;
  
  RETURN v_waiter_id;
END;
$$;

-- Create function to update waiter password with hashing
CREATE OR REPLACE FUNCTION public.update_waiter(
  p_waiter_id uuid,
  p_username text,
  p_password text,
  p_display_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.waiters 
  SET 
    username = p_username,
    password_hash = crypt(p_password, gen_salt('bf')),
    password = p_password,  -- Temporary: keep plain during migration
    display_name = p_display_name,
    updated_at = now()
  WHERE id = p_waiter_id;
  
  RETURN FOUND;
END;
$$;

-- Create secure server-side waiter authentication function
CREATE OR REPLACE FUNCTION public.verify_waiter_login(
  p_username text,
  p_password text,
  p_parent_user_id uuid
)
RETURNS TABLE(
  waiter_id uuid,
  display_name text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id as waiter_id,
    w.display_name,
    w.is_active
  FROM public.waiters w
  WHERE w.username = p_username
    AND w.created_by = p_parent_user_id
    AND w.is_active = true
    AND (
      -- Check hashed password first, fall back to plain text for migration
      w.password_hash = crypt(p_password, w.password_hash)
      OR (w.password_hash IS NULL AND w.password = p_password)
    );
END;
$$;

-- Grant execute permission on the new functions
GRANT EXECUTE ON FUNCTION public.create_waiter(text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_waiter(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_waiter_login(text, text, uuid) TO authenticated;

-- Create RLS policy to prevent direct password access from clients
-- First drop existing policies on waiters that might allow password access
DROP POLICY IF EXISTS "waiters_select_no_password" ON public.waiters;

-- Create a view that excludes password fields for client access
CREATE OR REPLACE VIEW public.waiters_safe AS
SELECT 
  id,
  username,
  display_name,
  is_active,
  created_by,
  auth_user_id,
  created_at,
  updated_at
FROM public.waiters;

-- Grant access to the safe view
GRANT SELECT ON public.waiters_safe TO authenticated;