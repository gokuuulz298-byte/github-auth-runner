-- Add buying_price column to products table for profit calculations
ALTER TABLE products ADD COLUMN buying_price numeric DEFAULT 0;

COMMENT ON COLUMN products.buying_price IS 'Purchase/cost price of the product for profit calculation';