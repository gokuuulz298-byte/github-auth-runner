-- Clear all existing data from all tables
DELETE FROM invoices;
DELETE FROM loyalty_points;
DELETE FROM product_discounts;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM coupons;
DELETE FROM counters;
DELETE FROM categories;
DELETE FROM company_profiles;
DELETE FROM profiles;

-- Add created_by column to loyalty_points
ALTER TABLE loyalty_points ADD COLUMN IF NOT EXISTS created_by uuid;

-- Update RLS policies to ensure complete data isolation per user

-- Categories: Only view own categories
DROP POLICY IF EXISTS "Users can view all categories" ON categories;
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = created_by);

-- Counters: Only view own counters
DROP POLICY IF EXISTS "Users can view all counters" ON counters;
CREATE POLICY "Users can view own counters" ON counters
  FOR SELECT USING (auth.uid() = created_by);

-- Coupons: Only view own coupons
DROP POLICY IF EXISTS "Users can view all coupons" ON coupons;
CREATE POLICY "Users can view own coupons" ON coupons
  FOR SELECT USING (auth.uid() = created_by);

-- Customers: Only view own customers
DROP POLICY IF EXISTS "Users can view all customers" ON customers;
CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update all customers" ON customers;
CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (auth.uid() = created_by);

-- Products: Only view own products
DROP POLICY IF EXISTS "Users can view all products" ON products;
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update all products" ON products;
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (auth.uid() = created_by);

-- Product Discounts: Only view own product discounts
DROP POLICY IF EXISTS "Users can view all product discounts" ON product_discounts;
CREATE POLICY "Users can view own product discounts" ON product_discounts
  FOR SELECT USING (auth.uid() = created_by);

-- Invoices: Only view own invoices
DROP POLICY IF EXISTS "Users can view all invoices" ON invoices;
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = created_by);

-- Loyalty Points: Only view own loyalty points
DROP POLICY IF EXISTS "Users can view all loyalty points" ON loyalty_points;
CREATE POLICY "Users can view own loyalty points" ON loyalty_points
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update loyalty points" ON loyalty_points;
CREATE POLICY "Users can update own loyalty points" ON loyalty_points
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can insert loyalty points" ON loyalty_points;
CREATE POLICY "Users can insert own loyalty points" ON loyalty_points
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Create index on created_by columns for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);
CREATE INDEX IF NOT EXISTS idx_counters_created_by ON counters(created_by);
CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON coupons(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_product_discounts_created_by ON product_discounts(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_created_by ON loyalty_points(created_by);