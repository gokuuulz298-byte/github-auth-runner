
-- RPC: Single-call data bundle for ModernBilling (8 queries → 1)
CREATE OR REPLACE FUNCTION public.get_billing_bundle(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'products', COALESCE((SELECT json_agg(sub) FROM (SELECT * FROM products WHERE created_by = p_user_id AND is_deleted = false AND COALESCE(is_raw_material, false) = false ORDER BY name) sub), '[]'::json),
    'categories', COALESCE((SELECT json_agg(sub) FROM (SELECT * FROM categories WHERE created_by = p_user_id ORDER BY name) sub), '[]'::json),
    'company_profile', (SELECT row_to_json(cp) FROM company_profiles cp WHERE cp.user_id = p_user_id LIMIT 1),
    'counters', COALESCE((SELECT json_agg(sub) FROM (SELECT * FROM counters WHERE created_by = p_user_id ORDER BY name) sub), '[]'::json),
    'coupons', COALESCE((SELECT json_agg(sub) FROM (SELECT * FROM coupons WHERE created_by = p_user_id AND is_active = true) sub), '[]'::json),
    'product_discounts', COALESCE((SELECT json_agg(sub) FROM (SELECT * FROM product_discounts WHERE created_by = p_user_id AND is_active = true) sub), '[]'::json),
    'active_template', (SELECT row_to_json(bt) FROM bill_templates bt WHERE bt.created_by = p_user_id AND bt.is_active = true LIMIT 1),
    'loyalty_settings', (SELECT row_to_json(ls) FROM loyalty_settings ls WHERE ls.created_by = p_user_id LIMIT 1)
  ) INTO result;
  RETURN result;
END;
$$;

-- RPC: Single-call data bundle for Dashboard (3 queries → 1)
CREATE OR REPLACE FUNCTION public.get_dashboard_bundle(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'company_name', (SELECT cp.company_name FROM company_profiles cp WHERE cp.user_id = p_user_id LIMIT 1),
    'billing_settings', (SELECT cp.billing_settings FROM company_profiles cp WHERE cp.user_id = p_user_id LIMIT 1),
    'low_stock_products', COALESCE((
      SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'stock_quantity', p.stock_quantity, 'low_stock_threshold', p.low_stock_threshold))
      FROM products p
      WHERE p.created_by = p_user_id AND p.is_deleted = false AND p.stock_quantity <= COALESCE(p.low_stock_threshold, 10)
    ), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;
