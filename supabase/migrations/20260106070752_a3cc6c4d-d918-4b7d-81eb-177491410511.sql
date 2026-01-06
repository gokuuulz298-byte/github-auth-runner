-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'waiter');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    parent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to get parent user id (admin id for staff/waiter)
CREATE OR REPLACE FUNCTION public.get_parent_user_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT parent_user_id FROM public.user_roles WHERE user_id = _user_id AND parent_user_id IS NOT NULL LIMIT 1),
    _user_id
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view staff/waiter roles they created" ON public.user_roles
  FOR SELECT USING (auth.uid() = parent_user_id);

CREATE POLICY "Admins can insert roles for their staff" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = parent_user_id OR (auth.uid() = user_id AND role = 'admin'));

CREATE POLICY "Admins can delete roles they created" ON public.user_roles
  FOR DELETE USING (auth.uid() = parent_user_id);

-- Add auth_user_id column to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add auth_user_id column to waiters table
ALTER TABLE public.waiters ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create restaurant_tables table for table management
CREATE TABLE public.restaurant_tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by uuid NOT NULL,
    table_number text NOT NULL,
    capacity integer DEFAULT 4,
    status text DEFAULT 'available',
    current_order_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(created_by, table_number)
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tables" ON public.restaurant_tables
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

CREATE POLICY "Admins can insert tables" ON public.restaurant_tables
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update tables" ON public.restaurant_tables
  FOR UPDATE USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

CREATE POLICY "Admins can delete tables" ON public.restaurant_tables
  FOR DELETE USING (auth.uid() = created_by);

-- Update existing RLS policies to use parent user function
-- Categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Counters
DROP POLICY IF EXISTS "Users can view own counters" ON counters;
CREATE POLICY "Users can view own counters" ON counters
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Coupons
DROP POLICY IF EXISTS "Users can view own coupons" ON coupons;
CREATE POLICY "Users can view own coupons" ON coupons
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Customers
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update own customers" ON customers;
CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Products
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Product Discounts
DROP POLICY IF EXISTS "Users can view own product discounts" ON product_discounts;
CREATE POLICY "Users can view own product discounts" ON product_discounts
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Loyalty Points
DROP POLICY IF EXISTS "Users can view own loyalty points" ON loyalty_points;
CREATE POLICY "Users can view own loyalty points" ON loyalty_points
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update own loyalty points" ON loyalty_points;
CREATE POLICY "Users can update own loyalty points" ON loyalty_points
  FOR UPDATE USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can insert own loyalty points" ON loyalty_points;
CREATE POLICY "Users can insert own loyalty points" ON loyalty_points
  FOR INSERT WITH CHECK (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Live Orders
DROP POLICY IF EXISTS "Users can view own live orders" ON live_orders;
CREATE POLICY "Users can view own live orders" ON live_orders
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can insert live orders" ON live_orders;
CREATE POLICY "Users can insert live orders" ON live_orders
  FOR INSERT WITH CHECK (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update live orders" ON live_orders;
CREATE POLICY "Users can update live orders" ON live_orders
  FOR UPDATE USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can delete live orders" ON live_orders;
CREATE POLICY "Users can delete live orders" ON live_orders
  FOR DELETE USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Kitchen Orders
DROP POLICY IF EXISTS "Users can view own kitchen orders" ON kitchen_orders;
CREATE POLICY "Users can view own kitchen orders" ON kitchen_orders
  FOR SELECT USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can insert kitchen orders" ON kitchen_orders;
CREATE POLICY "Users can insert kitchen orders" ON kitchen_orders
  FOR INSERT WITH CHECK (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update kitchen orders" ON kitchen_orders;
CREATE POLICY "Users can update kitchen orders" ON kitchen_orders
  FOR UPDATE USING (auth.uid() = created_by OR public.get_parent_user_id(auth.uid()) = created_by);

-- Add item_statuses column to kitchen_orders for per-item tracking
ALTER TABLE public.kitchen_orders ADD COLUMN IF NOT EXISTS item_statuses jsonb DEFAULT '[]'::jsonb;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_parent_user_id ON public.user_roles(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON public.staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_waiters_auth_user_id ON public.waiters(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_created_by ON public.restaurant_tables(created_by);

-- Trigger for updated_at on restaurant_tables
CREATE TRIGGER update_restaurant_tables_updated_at
BEFORE UPDATE ON public.restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();