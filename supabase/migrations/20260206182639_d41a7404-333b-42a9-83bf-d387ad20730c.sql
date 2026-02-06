-- Fix waiter RPCs: pgcrypto lives in the `extensions` schema, but our SECURITY DEFINER functions had search_path limited to `public`, causing gen_salt()/crypt() to be missing.

CREATE OR REPLACE FUNCTION public.create_waiter(
  p_username text,
  p_password text,
  p_display_name text,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_waiter_id uuid;
BEGIN
  INSERT INTO public.waiters (
    username,
    password_hash,
    password, -- Keep for backward compatibility, will be removed later
    display_name,
    created_by
  )
  VALUES (
    p_username,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_password,
    p_display_name,
    p_created_by
  )
  RETURNING id INTO v_waiter_id;

  RETURN v_waiter_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_waiter(
  p_waiter_id uuid,
  p_username text,
  p_password text,
  p_display_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.waiters
  SET
    username = p_username,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    password = p_password, -- Keep for backward compatibility, will be removed later
    display_name = p_display_name,
    updated_at = now()
  WHERE id = p_waiter_id;

  RETURN FOUND;
END;
$$;

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
SET search_path = public, extensions
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
      w.password_hash = extensions.crypt(p_password, w.password_hash)
      OR (w.password_hash IS NULL AND w.password = p_password)
    );
END;
$$;
