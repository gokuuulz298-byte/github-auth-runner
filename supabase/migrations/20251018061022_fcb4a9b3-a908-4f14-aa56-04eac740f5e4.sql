-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update categories"
  ON public.categories FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.categories FOR DELETE
  USING (true);

-- Create counters table
CREATE TABLE IF NOT EXISTS public.counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for counters
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

-- RLS policies for counters
CREATE POLICY "Authenticated users can view counters"
  ON public.counters FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create counters"
  ON public.counters FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update counters"
  ON public.counters FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete counters"
  ON public.counters FOR DELETE
  USING (true);

-- Add counter_id to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS counter_id UUID REFERENCES public.counters(id);

-- Add triggers for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_counters_updated_at
  BEFORE UPDATE ON public.counters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();