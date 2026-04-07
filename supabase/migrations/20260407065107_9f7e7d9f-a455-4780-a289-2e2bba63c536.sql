
CREATE OR REPLACE FUNCTION public.get_inventory_bundle(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'categories', COALESCE((SELECT json_agg(sub) FROM (SELECT * FROM categories WHERE created_by = p_user_id ORDER BY name) sub), '[]'::json),
    'billing_settings', (SELECT cp.billing_settings FROM company_profiles cp WHERE cp.user_id = p_user_id LIMIT 1),
    'total_products', (SELECT count(*) FROM products WHERE created_by = p_user_id AND is_deleted = false),
    'total_raw_materials', (SELECT count(*) FROM products WHERE created_by = p_user_id AND is_deleted = false AND is_raw_material = true)
  ) INTO result;
  RETURN result;
END;
$$;
