-- Add start_date and end_date columns to coupons table for time-bound coupons
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;