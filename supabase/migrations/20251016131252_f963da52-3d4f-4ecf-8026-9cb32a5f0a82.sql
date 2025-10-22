-- Add category and price type to products
ALTER TABLE products 
ADD COLUMN category TEXT,
ADD COLUMN price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'weight'));

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Authenticated users can view customers" 
ON public.customers 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update customers" 
ON public.customers 
FOR UPDATE 
USING (true);

-- Add customer reference to invoices
ALTER TABLE invoices 
ADD COLUMN customer_id UUID REFERENCES public.customers(id),
ADD COLUMN customer_name TEXT,
ADD COLUMN customer_phone TEXT;

-- Create trigger for customers updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();