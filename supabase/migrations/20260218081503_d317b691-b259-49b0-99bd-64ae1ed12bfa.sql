-- Add assigned_counter_id to staff table for counter locking
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS assigned_counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL;

-- Add is_active to suppliers table for soft deactivation (if not exists)
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
