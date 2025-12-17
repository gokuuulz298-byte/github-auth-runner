-- Create waiters table for restaurant staff management
CREATE TABLE public.waiters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  display_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create unique constraint for username per user
CREATE UNIQUE INDEX waiters_username_owner ON public.waiters (created_by, username);

-- Enable RLS
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waiters
CREATE POLICY "Users can view own waiters" ON public.waiters FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert waiters" ON public.waiters FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own waiters" ON public.waiters FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own waiters" ON public.waiters FOR DELETE USING (auth.uid() = created_by);

-- Create live_orders table for waiter orders
CREATE TABLE public.live_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  waiter_name text,
  order_type text DEFAULT 'dine-in',
  table_number text,
  items_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_name text,
  customer_phone text,
  status text DEFAULT 'active',
  total_amount numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for live_orders
ALTER TABLE public.live_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_orders
CREATE POLICY "Users can view own live orders" ON public.live_orders FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert live orders" ON public.live_orders FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own live orders" ON public.live_orders FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own live orders" ON public.live_orders FOR DELETE USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_waiters_updated_at BEFORE UPDATE ON public.waiters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_live_orders_updated_at BEFORE UPDATE ON public.live_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_orders;