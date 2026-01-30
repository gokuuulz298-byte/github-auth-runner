-- Drop and recreate invoice number function with new format
-- Format: DDMMYY-{counter}-{bill} e.g., 300126-01-01

DROP FUNCTION IF EXISTS public.generate_invoice_number(uuid, uuid);

CREATE FUNCTION public.generate_invoice_number(p_store_id uuid, p_counter_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $function$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_date_str TEXT;
    v_counter_name TEXT;
    v_counter_num TEXT;
    v_next_number INT;
    v_invoice_number TEXT;
BEGIN
    -- Format date as DDMMYY
    v_date_str := TO_CHAR(v_today, 'DDMMYY');
    
    -- Get counter name and extract counter number
    SELECT name INTO v_counter_name
    FROM public.counters
    WHERE id = p_counter_id;
    
    -- Extract counter number (e.g., 'Counter 1' -> '01', 'Counter 12' -> '12')
    -- Default to '01' if no number found
    v_counter_num := LPAD(COALESCE(NULLIF(regexp_replace(v_counter_name, '[^0-9]', '', 'g'), ''), '1'), 2, '0');
    
    -- Get and increment the sequence number for this counter/store/date
    INSERT INTO public.invoice_sequences (store_id, counter_id, business_date, last_number)
    VALUES (p_store_id, p_counter_id, v_today, 1)
    ON CONFLICT (store_id, counter_id, business_date)
    DO UPDATE SET last_number = invoice_sequences.last_number + 1
    RETURNING last_number INTO v_next_number;
    
    -- Format: DDMMYY-CC-NN (e.g., 300126-01-01)
    v_invoice_number := v_date_str || '-' || v_counter_num || '-' || LPAD(v_next_number::TEXT, 2, '0');
    
    RETURN v_invoice_number;
END;
$function$;