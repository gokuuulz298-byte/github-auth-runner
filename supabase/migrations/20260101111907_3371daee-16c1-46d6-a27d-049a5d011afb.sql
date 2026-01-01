-- Create purchases table for purchase orders
CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  purchase_number text NOT NULL,
  supplier_name text,
  supplier_phone text,
  status text NOT NULL DEFAULT 'pending',
  items_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  expected_date timestamp with time zone,
  received_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own purchases" ON public.purchases FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own purchases" ON public.purchases FOR DELETE USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create staff table for staff accounts with module access control
CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  allowed_modules text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  show_in_bill boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create unique constraint for staff email per owner
CREATE UNIQUE INDEX staff_email_owner ON public.staff (created_by, email);

-- Enable RLS for staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff
CREATE POLICY "Users can view own staff" ON public.staff FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert staff" ON public.staff FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own staff" ON public.staff FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own staff" ON public.staff FOR DELETE USING (auth.uid() = created_by);

-- Add trigger for staff updated_at
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();