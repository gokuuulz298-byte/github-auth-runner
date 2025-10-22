-- Add discount_type and discount_amount columns to product_discounts table
ALTER TABLE product_discounts 
ADD COLUMN discount_type text DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN discount_amount numeric DEFAULT 0;

-- Update existing records to use the new structure
UPDATE product_discounts 
SET discount_type = 'percentage', 
    discount_amount = 0 
WHERE discount_type IS NULL;