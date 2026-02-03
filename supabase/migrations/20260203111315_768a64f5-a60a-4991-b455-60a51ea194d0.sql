-- Fix RLS policies to allow staff/waiter to access parent admin's data using get_parent_user_id()

-- First, update products table policies
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

CREATE POLICY "Users can view products"
  ON products FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create products"
  ON products FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update products"
  ON products FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete products"
  ON products FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can create categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

CREATE POLICY "Users can view categories"
  ON categories FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create categories"
  ON categories FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update categories"
  ON categories FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete categories"
  ON categories FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Counters
DROP POLICY IF EXISTS "Users can view own counters" ON counters;
DROP POLICY IF EXISTS "Authenticated users can view counters" ON counters;
DROP POLICY IF EXISTS "Authenticated users can create counters" ON counters;
DROP POLICY IF EXISTS "Authenticated users can update counters" ON counters;
DROP POLICY IF EXISTS "Authenticated users can delete counters" ON counters;

CREATE POLICY "Users can view counters"
  ON counters FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create counters"
  ON counters FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update counters"
  ON counters FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete counters"
  ON counters FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;

CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Customers
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;

CREATE POLICY "Users can view customers"
  ON customers FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create customers"
  ON customers FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete customers"
  ON customers FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Coupons
DROP POLICY IF EXISTS "Users can view own coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can view coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can create coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can update coupons" ON coupons;
DROP POLICY IF EXISTS "Authenticated users can delete coupons" ON coupons;

CREATE POLICY "Users can view coupons"
  ON coupons FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create coupons"
  ON coupons FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update coupons"
  ON coupons FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete coupons"
  ON coupons FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Product Discounts
DROP POLICY IF EXISTS "Users can view own product discounts" ON product_discounts;
DROP POLICY IF EXISTS "Authenticated users can view product discounts" ON product_discounts;
DROP POLICY IF EXISTS "Authenticated users can create product discounts" ON product_discounts;
DROP POLICY IF EXISTS "Authenticated users can update product discounts" ON product_discounts;
DROP POLICY IF EXISTS "Authenticated users can delete product discounts" ON product_discounts;

CREATE POLICY "Users can view product_discounts"
  ON product_discounts FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create product_discounts"
  ON product_discounts FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update product_discounts"
  ON product_discounts FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete product_discounts"
  ON product_discounts FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Loyalty Points
DROP POLICY IF EXISTS "Users can view own loyalty points" ON loyalty_points;
DROP POLICY IF EXISTS "Users can update own loyalty points" ON loyalty_points;
DROP POLICY IF EXISTS "Users can insert own loyalty points" ON loyalty_points;
DROP POLICY IF EXISTS "Authenticated users can view loyalty points" ON loyalty_points;
DROP POLICY IF EXISTS "Authenticated users can create loyalty points" ON loyalty_points;
DROP POLICY IF EXISTS "Authenticated users can update loyalty points" ON loyalty_points;

CREATE POLICY "Users can view loyalty_points"
  ON loyalty_points FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create loyalty_points"
  ON loyalty_points FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update loyalty_points"
  ON loyalty_points FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Company Profiles
DROP POLICY IF EXISTS "Users can view their own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert their own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Users can update their own company profile" ON company_profiles;

CREATE POLICY "Users can view company_profiles"
  ON company_profiles FOR SELECT
  USING (user_id = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create company_profiles"
  ON company_profiles FOR INSERT
  WITH CHECK (user_id = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update company_profiles"
  ON company_profiles FOR UPDATE
  USING (user_id = public.get_parent_user_id(auth.uid()));

-- Live Orders
DROP POLICY IF EXISTS "Users can view live_orders" ON live_orders;
DROP POLICY IF EXISTS "Users can create live_orders" ON live_orders;
DROP POLICY IF EXISTS "Users can update live_orders" ON live_orders;
DROP POLICY IF EXISTS "Users can delete live_orders" ON live_orders;

CREATE POLICY "Users can view live_orders"
  ON live_orders FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create live_orders"
  ON live_orders FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update live_orders"
  ON live_orders FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete live_orders"
  ON live_orders FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Kitchen Orders
DROP POLICY IF EXISTS "Users can view kitchen_orders" ON kitchen_orders;
DROP POLICY IF EXISTS "Users can create kitchen_orders" ON kitchen_orders;
DROP POLICY IF EXISTS "Users can update kitchen_orders" ON kitchen_orders;

CREATE POLICY "Users can view kitchen_orders"
  ON kitchen_orders FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create kitchen_orders"
  ON kitchen_orders FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update kitchen_orders"
  ON kitchen_orders FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Restaurant Tables
DROP POLICY IF EXISTS "Users can view restaurant_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Users can create restaurant_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Users can update restaurant_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Users can delete restaurant_tables" ON restaurant_tables;

CREATE POLICY "Users can view restaurant_tables"
  ON restaurant_tables FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create restaurant_tables"
  ON restaurant_tables FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update restaurant_tables"
  ON restaurant_tables FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete restaurant_tables"
  ON restaurant_tables FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Waiters (admin can manage their waiters)
DROP POLICY IF EXISTS "Users can view waiters" ON waiters;
DROP POLICY IF EXISTS "Users can create waiters" ON waiters;
DROP POLICY IF EXISTS "Users can update waiters" ON waiters;
DROP POLICY IF EXISTS "Users can delete waiters" ON waiters;

CREATE POLICY "Users can view waiters"
  ON waiters FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create waiters"
  ON waiters FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update waiters"
  ON waiters FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete waiters"
  ON waiters FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Staff (admin can manage their staff)
DROP POLICY IF EXISTS "Users can view staff" ON staff;
DROP POLICY IF EXISTS "Users can create staff" ON staff;
DROP POLICY IF EXISTS "Users can update staff" ON staff;
DROP POLICY IF EXISTS "Users can delete staff" ON staff;

CREATE POLICY "Users can view staff"
  ON staff FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create staff"
  ON staff FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update staff"
  ON staff FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete staff"
  ON staff FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Suppliers
DROP POLICY IF EXISTS "Users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can create suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers" ON suppliers;

CREATE POLICY "Users can view suppliers"
  ON suppliers FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update suppliers"
  ON suppliers FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete suppliers"
  ON suppliers FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Purchases
DROP POLICY IF EXISTS "Users can view purchases" ON purchases;
DROP POLICY IF EXISTS "Users can create purchases" ON purchases;
DROP POLICY IF EXISTS "Users can update purchases" ON purchases;
DROP POLICY IF EXISTS "Users can delete purchases" ON purchases;

CREATE POLICY "Users can view purchases"
  ON purchases FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update purchases"
  ON purchases FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete purchases"
  ON purchases FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Expenses
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses" ON expenses;

CREATE POLICY "Users can view expenses"
  ON expenses FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update expenses"
  ON expenses FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete expenses"
  ON expenses FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Returns
DROP POLICY IF EXISTS "Users can view returns" ON returns;
DROP POLICY IF EXISTS "Users can create returns" ON returns;
DROP POLICY IF EXISTS "Users can update returns" ON returns;

CREATE POLICY "Users can view returns"
  ON returns FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create returns"
  ON returns FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update returns"
  ON returns FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Bill Templates
DROP POLICY IF EXISTS "Users can view bill_templates" ON bill_templates;
DROP POLICY IF EXISTS "Users can create bill_templates" ON bill_templates;
DROP POLICY IF EXISTS "Users can update bill_templates" ON bill_templates;
DROP POLICY IF EXISTS "Users can delete bill_templates" ON bill_templates;

CREATE POLICY "Users can view bill_templates"
  ON bill_templates FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create bill_templates"
  ON bill_templates FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update bill_templates"
  ON bill_templates FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can delete bill_templates"
  ON bill_templates FOR DELETE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Loyalty Settings
DROP POLICY IF EXISTS "Users can view loyalty_settings" ON loyalty_settings;
DROP POLICY IF EXISTS "Users can create loyalty_settings" ON loyalty_settings;
DROP POLICY IF EXISTS "Users can update loyalty_settings" ON loyalty_settings;

CREATE POLICY "Users can view loyalty_settings"
  ON loyalty_settings FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create loyalty_settings"
  ON loyalty_settings FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can update loyalty_settings"
  ON loyalty_settings FOR UPDATE
  USING (created_by = public.get_parent_user_id(auth.uid()));

-- Inventory Movements
DROP POLICY IF EXISTS "Users can view inventory_movements" ON inventory_movements;
DROP POLICY IF EXISTS "Users can create inventory_movements" ON inventory_movements;

CREATE POLICY "Users can view inventory_movements"
  ON inventory_movements FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));

CREATE POLICY "Users can create inventory_movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));

-- Purchase Payments
DROP POLICY IF EXISTS "Users can view purchase_payments" ON purchase_payments;
DROP POLICY IF EXISTS "Users can create purchase_payments" ON purchase_payments;

CREATE POLICY "Users can view purchase_payments"
  ON purchase_payments FOR SELECT
  USING (created_by = public.get_parent_user_id(auth.uid()));