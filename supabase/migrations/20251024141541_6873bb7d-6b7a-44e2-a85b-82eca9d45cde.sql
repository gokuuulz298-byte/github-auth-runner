-- Add HSN code and separate tax fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS hsn_code text,
ADD COLUMN IF NOT EXISTS product_tax numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst numeric DEFAULT 0;