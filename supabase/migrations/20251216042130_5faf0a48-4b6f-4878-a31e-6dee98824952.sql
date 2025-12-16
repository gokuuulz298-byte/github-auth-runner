-- Create kitchen_orders table for restaurant order management
CREATE TABLE public.kitchen_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_number TEXT NOT NULL,
  order_type TEXT DEFAULT 'takeaway',
  items_data JSONB NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered')),
  total_amount NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own kitchen orders" 
ON public.kitchen_orders 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert kitchen orders" 
ON public.kitchen_orders 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own kitchen orders" 
ON public.kitchen_orders 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own kitchen orders" 
ON public.kitchen_orders 
FOR DELETE 
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_kitchen_orders_updated_at
BEFORE UPDATE ON public.kitchen_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for kitchen_orders
ALTER TABLE public.kitchen_orders REPLICA IDENTITY FULL;