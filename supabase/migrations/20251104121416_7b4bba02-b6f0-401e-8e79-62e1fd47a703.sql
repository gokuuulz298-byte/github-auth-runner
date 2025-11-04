-- Add image_url column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for faster image queries
CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url) WHERE image_url IS NOT NULL;