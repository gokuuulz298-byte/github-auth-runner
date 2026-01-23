-- Create loyalty_settings table for configurable points redemption
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  points_per_rupee NUMERIC NOT NULL DEFAULT 1,
  rupees_per_point_redeem NUMERIC NOT NULL DEFAULT 1,
  min_points_to_redeem INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(created_by)
);

-- Enable RLS
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own loyalty settings" 
ON public.loyalty_settings 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own loyalty settings" 
ON public.loyalty_settings 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own loyalty settings" 
ON public.loyalty_settings 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_loyalty_settings_updated_at
BEFORE UPDATE ON public.loyalty_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();