-- Enable RLS on invoice_sequences
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_sequences
CREATE POLICY "Users can view their own invoice sequences" 
ON public.invoice_sequences 
FOR SELECT 
USING (auth.uid() = store_id);

CREATE POLICY "Users can insert invoice sequences" 
ON public.invoice_sequences 
FOR INSERT 
WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users can update their own invoice sequences" 
ON public.invoice_sequences 
FOR UPDATE 
USING (auth.uid() = store_id);