-- =============================================================================
-- COMPREHENSIVE FIX: RLS Consolidation, Waiter Auth, Scoped Unique Constraints
-- =============================================================================

-- 1. DROP OLD/CONFLICTING POLICIES (keeping only get_parent_user_id based ones)
-- Categories
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert categories" ON categories;

-- Counters  
DROP POLICY IF EXISTS "Users can delete own counters" ON counters;
DROP POLICY IF EXISTS "Users can update own counters" ON counters;
DROP POLICY IF EXISTS "Users can insert counters" ON counters;

-- Coupons
DROP POLICY IF EXISTS "Users can delete own coupons" ON coupons;
DROP POLICY IF EXISTS "Users can update own coupons" ON coupons;
DROP POLICY IF EXISTS "Users can insert coupons" ON coupons;

-- Customers
DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;

-- Products
DROP POLICY IF EXISTS "Users can delete own products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;

-- Product Discounts
DROP POLICY IF EXISTS "Users can delete own product discounts" ON product_discounts;
DROP POLICY IF EXISTS "Users can update own product discounts" ON product_discounts;
DROP POLICY IF EXISTS "Users can insert product discounts" ON product_discounts;

-- Invoices
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;

-- Purchases
DROP POLICY IF EXISTS "Users can delete own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can update own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert purchases" ON purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;

-- Staff - keep admin-only plus parent-based
DROP POLICY IF EXISTS "Users can delete own staff" ON staff;

-- Kitchen Orders
DROP POLICY IF EXISTS "Users can delete own kitchen orders" ON kitchen_orders;
DROP POLICY IF EXISTS "Users can update own kitchen orders" ON kitchen_orders;

-- Live Orders
DROP POLICY IF EXISTS "Users can delete own live orders" ON live_orders;
DROP POLICY IF EXISTS "Users can update own live orders" ON live_orders;

-- Restaurant Tables (keep parent-based + admin-based)
DROP POLICY IF EXISTS "Admins can delete tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Admins can insert tables" ON restaurant_tables;

-- Inventory Movements
DROP POLICY IF EXISTS "Users can view own inventory movements" ON inventory_movements;
DROP POLICY IF EXISTS "Users can insert inventory movements" ON inventory_movements;

-- Purchase Payments - need to add parent-based policies
DROP POLICY IF EXISTS "Users can view their own purchase payments" ON purchase_payments;
DROP POLICY IF EXISTS "Users can update their own purchase payments" ON purchase_payments;
DROP POLICY IF EXISTS "Users can delete their own purchase payments" ON purchase_payments;

-- 2. CREATE MISSING/FIXED POLICIES

-- Purchase Payments: Allow staff to manage parent's data
CREATE POLICY "Users can view purchase_payments via parent" ON purchase_payments
  FOR SELECT USING (created_by = public.get_parent_user_id(auth.uid()));
CREATE POLICY "Users can update purchase_payments via parent" ON purchase_payments
  FOR UPDATE USING (created_by = public.get_parent_user_id(auth.uid()));
CREATE POLICY "Users can delete purchase_payments via parent" ON purchase_payments
  FOR DELETE USING (created_by = public.get_parent_user_id(auth.uid()));

-- 3. FIX PRODUCT BARCODE UNIQUENESS - Allow same barcode across different tenants
-- First, drop the existing unique constraint on barcode
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;

-- Create a partial unique index scoped by created_by
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_per_user 
  ON products (barcode, created_by) 
  WHERE is_deleted = false;

-- 4. FIX WAITER USERNAME UNIQUENESS - Allow same username across different admin accounts
-- Drop any existing unique constraint
ALTER TABLE waiters DROP CONSTRAINT IF EXISTS waiters_username_key;

-- Create unique index scoped by created_by
CREATE UNIQUE INDEX IF NOT EXISTS idx_waiters_username_per_admin 
  ON waiters (username, created_by);

-- 5. STAFF EMAIL UNIQUENESS - Allow same email per admin (though email should be globally unique for auth)
-- Keep existing staff email constraint as-is since it uses Supabase Auth

-- 6. UPDATE PRODUCTS INSERT POLICY to use parent user id for created_by
DROP POLICY IF EXISTS "Users can create products" ON products;
CREATE POLICY "Users can create products" ON products
  FOR INSERT WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

-- 7. ENSURE PURCHASES INSERT uses parent user id  
DROP POLICY IF EXISTS "Users can create purchases" ON purchases;
CREATE POLICY "Users can create purchases" ON purchases
  FOR INSERT WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

-- 8. ADD MISSING UPDATE POLICY FOR PRODUCTS (staff should be able to update parent's products)
DROP POLICY IF EXISTS "Users can update products" ON products;
CREATE POLICY "Users can update products" ON products
  FOR UPDATE USING (created_by = public.get_parent_user_id(auth.uid()));

-- 9. ADD DELETE POLICY FOR PRODUCTS
DROP POLICY IF EXISTS "Users can delete products" ON products;
CREATE POLICY "Users can delete products" ON products
  FOR DELETE USING (created_by = public.get_parent_user_id(auth.uid()));