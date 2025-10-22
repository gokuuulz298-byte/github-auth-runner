-- Create coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_discounts table for limited time discounts
CREATE TABLE public.product_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  discount_percentage NUMERIC NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create loyalty_points table
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  points NUMERIC DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- Coupon policies
CREATE POLICY "Authenticated users can view coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create coupons" ON public.coupons FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete coupons" ON public.coupons FOR DELETE USING (true);

-- Product discount policies
CREATE POLICY "Authenticated users can view product discounts" ON public.product_discounts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create product discounts" ON public.product_discounts FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update product discounts" ON public.product_discounts FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete product discounts" ON public.product_discounts FOR DELETE USING (true);

-- Loyalty points policies
CREATE POLICY "Authenticated users can view loyalty points" ON public.loyalty_points FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create loyalty points" ON public.loyalty_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update loyalty points" ON public.loyalty_points FOR UPDATE USING (true);

-- Triggers
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_discounts_updated_at BEFORE UPDATE ON public.product_discounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();