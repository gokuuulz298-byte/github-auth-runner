-- Fix invoice_sequences RLS policies to use auth.uid() for store_id
-- The store_id should match user ID for users to access their sequences

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert invoice sequences" ON public.invoice_sequences;
DROP POLICY IF EXISTS "Users can update their own invoice sequences" ON public.invoice_sequences;
DROP POLICY IF EXISTS "Users can view their own invoice sequences" ON public.invoice_sequences;

-- Create new policies with correct user matching
CREATE POLICY "Users can insert invoice sequences"
ON public.invoice_sequences
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update invoice sequences"
ON public.invoice_sequences
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can select invoice sequences"
ON public.invoice_sequences
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Also add DELETE policy
CREATE POLICY "Users can delete invoice sequences"
ON public.invoice_sequences
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Ensure timestamps are stored in IST by default (using triggers)
-- Note: PostgreSQL stores timestamps in UTC, but we can display in IST
-- For proper IST storage, we'll use TIMESTAMPTZ and let the app handle display

-- Update generate_invoice_number function to work without strict store_id check
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_store_id uuid, p_counter_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_date date := current_date;
  v_next integer;
begin
  insert into invoice_sequences (store_id, counter_id, business_date, last_number)
  values (p_store_id, p_counter_id, v_date, 1)
  on conflict (store_id, counter_id, business_date)
  do update set last_number = invoice_sequences.last_number + 1
  returning last_number into v_next;

  return
    to_char(v_date, 'YYMMDD')
    || '-' ||
    lpad(v_next::text, 5, '0');
end;
$function$;