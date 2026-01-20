-- Drop the existing unique constraint on bill_number alone
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_bill_number_key;

-- Create a new unique constraint on bill_number + created_by (per-user uniqueness)
ALTER TABLE public.invoices ADD CONSTRAINT invoices_bill_number_created_by_key UNIQUE (bill_number, created_by);

-- Create purchase_payments table for tracking partial payments on purchase orders
CREATE TABLE IF NOT EXISTS public.purchase_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add payment tracking columns to purchases table
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Enable RLS on purchase_payments
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_payments
CREATE POLICY "Users can view their own purchase payments" 
ON public.purchase_payments 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create purchase payments" 
ON public.purchase_payments 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own purchase payments" 
ON public.purchase_payments 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own purchase payments" 
ON public.purchase_payments 
FOR DELETE 
USING (auth.uid() = created_by);