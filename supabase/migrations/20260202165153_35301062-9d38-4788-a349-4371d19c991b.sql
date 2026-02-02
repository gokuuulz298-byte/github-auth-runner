-- Add is_raw_material column to products table for inventory categorization
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_raw_material BOOLEAN DEFAULT false;

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_products_is_raw_material ON public.products(is_raw_material) WHERE is_deleted = false;

-- Add performance indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_created_by_deleted ON public.products(created_by) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_invoices_created_by_date ON public.invoices(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by_date ON public.expenses(created_by, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_created_by_status ON public.purchases(created_by, status);
CREATE INDEX IF NOT EXISTS idx_staff_email_active ON public.staff(email, is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(created_by, status);
CREATE INDEX IF NOT EXISTS idx_live_orders_status ON public.live_orders(created_by, status);

-- Add position coordinates for table visual map
ALTER TABLE public.restaurant_tables
ADD COLUMN IF NOT EXISTS position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'rectangle';

-- Add notes to restaurant_tables for additional info
ALTER TABLE public.restaurant_tables
ADD COLUMN IF NOT EXISTS notes TEXT;