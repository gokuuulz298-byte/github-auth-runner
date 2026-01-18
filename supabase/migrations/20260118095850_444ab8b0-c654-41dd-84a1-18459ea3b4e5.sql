-- Add tamil_name column to products table for bilingual support
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tamil_name text;

-- Add comment for clarity
COMMENT ON COLUMN public.products.tamil_name IS 'Product name in Tamil for bilingual bill printing';