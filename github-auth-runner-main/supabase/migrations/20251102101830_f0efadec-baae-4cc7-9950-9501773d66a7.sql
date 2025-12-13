-- Add soft delete column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for faster queries filtering deleted products
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON public.products(is_deleted) WHERE is_deleted = false;

-- Update existing products to ensure they are not marked as deleted
UPDATE public.products SET is_deleted = false WHERE is_deleted IS NULL;