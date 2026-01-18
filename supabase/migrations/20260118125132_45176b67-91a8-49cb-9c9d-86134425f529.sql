-- Add company_name_tamil column to company_profiles
ALTER TABLE public.company_profiles 
ADD COLUMN IF NOT EXISTS company_name_tamil TEXT;