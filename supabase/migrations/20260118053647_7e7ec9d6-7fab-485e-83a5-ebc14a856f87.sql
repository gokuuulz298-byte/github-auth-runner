-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    notes TEXT,
    mapped_products TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own suppliers" 
ON public.suppliers 
FOR SELECT 
USING (auth.uid() = created_by OR 
       created_by = (SELECT parent_user_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own suppliers" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (auth.uid() = created_by OR 
            created_by = (SELECT parent_user_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own suppliers" 
ON public.suppliers 
FOR UPDATE 
USING (auth.uid() = created_by OR 
       created_by = (SELECT parent_user_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own suppliers" 
ON public.suppliers 
FOR DELETE 
USING (auth.uid() = created_by OR 
       created_by = (SELECT parent_user_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Add low stock threshold to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Create index
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON public.suppliers(created_by);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(stock_quantity, low_stock_threshold) WHERE is_deleted = false;