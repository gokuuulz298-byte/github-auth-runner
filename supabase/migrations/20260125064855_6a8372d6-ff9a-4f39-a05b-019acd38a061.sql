-- Create indexes for faster query performance
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_counter_id ON public.invoices(counter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON public.invoices(customer_phone);

CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON public.products(is_deleted);

CREATE INDEX IF NOT EXISTS idx_categories_created_by ON public.categories(created_by);

CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON public.purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_name ON public.purchases(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON public.purchases(payment_status);

CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON public.suppliers(created_by);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_phone ON public.loyalty_points(customer_phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_created_by ON public.loyalty_points(created_by);

CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON public.coupons(created_by);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);

CREATE INDEX IF NOT EXISTS idx_product_discounts_product_id ON public.product_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_discounts_is_active ON public.product_discounts(is_active);

CREATE INDEX IF NOT EXISTS idx_kitchen_orders_created_by ON public.kitchen_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON public.kitchen_orders(status);

CREATE INDEX IF NOT EXISTS idx_live_orders_created_by ON public.live_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_live_orders_status ON public.live_orders(status);

CREATE INDEX IF NOT EXISTS idx_counters_created_by ON public.counters(created_by);

CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_id ON public.purchase_payments(purchase_id);

-- Create returns table for managing product returns
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  return_number TEXT NOT NULL,
  return_type TEXT NOT NULL CHECK (return_type IN ('purchase_return', 'sales_return')),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('invoice', 'purchase')),
  reference_id UUID NOT NULL,
  reference_number TEXT NOT NULL,
  supplier_name TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount_type TEXT NOT NULL CHECK (amount_type IN ('refund', 'credit', 'exchange')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for returns table
CREATE INDEX IF NOT EXISTS idx_returns_created_by ON public.returns(created_by);
CREATE INDEX IF NOT EXISTS idx_returns_return_type ON public.returns(return_type);
CREATE INDEX IF NOT EXISTS idx_returns_reference_id ON public.returns(reference_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_return_date ON public.returns(return_date DESC);

-- Enable RLS on returns table
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- RLS policies for returns
CREATE POLICY "Users can view own returns" 
ON public.returns FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert returns" 
ON public.returns FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own returns" 
ON public.returns FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own returns" 
ON public.returns FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();