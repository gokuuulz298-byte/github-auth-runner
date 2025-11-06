-- Add is_inclusive column to products table for dual GST handling
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_inclusive boolean DEFAULT true;

COMMENT ON COLUMN products.is_inclusive IS 'TRUE if price includes GST (MRP), FALSE if price is exclusive of GST';