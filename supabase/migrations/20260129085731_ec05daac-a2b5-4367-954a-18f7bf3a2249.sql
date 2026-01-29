-- Update invoice number generator to include counter code (prevents duplicates across counters)
-- New format: DDMMYY-C{counter}-NN (e.g., 290126-C1-01)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_store_id uuid, p_counter_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_date date := current_date;
  v_next integer;
  v_counter_name text;
  v_counter_digits text;
  v_counter_code text;
begin
  -- derive a stable, human-friendly counter code
  select c.name into v_counter_name
  from public.counters c
  where c.id = p_counter_id;

  v_counter_digits := regexp_replace(coalesce(v_counter_name, ''), '\\D', '', 'g');

  if v_counter_digits is null or v_counter_digits = '' then
    -- fallback: use first 4 chars of UUID
    v_counter_code := 'C' || substring(p_counter_id::text from 1 for 4);
  else
    v_counter_code := 'C' || v_counter_digits;
  end if;

  insert into public.invoice_sequences (store_id, counter_id, business_date, last_number)
  values (p_store_id, p_counter_id, v_date, 1)
  on conflict (store_id, counter_id, business_date)
  do update set last_number = public.invoice_sequences.last_number + 1
  returning last_number into v_next;

  return
    to_char(v_date, 'DDMMYY')
    || '-' || v_counter_code
    || '-' || lpad(v_next::text, 2, '0');
end;
$$;