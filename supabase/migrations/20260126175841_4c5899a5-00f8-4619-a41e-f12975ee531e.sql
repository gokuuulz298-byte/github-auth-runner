-- Create inventory_movements table for detailed stock ledger
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('inflow', 'outflow', 'adjustment')),
  quantity numeric NOT NULL,
  reference_type text NOT NULL CHECK (reference_type IN ('purchase', 'sale', 'return', 'adjustment')),
  reference_id uuid,
  reference_number text,
  unit_price numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  notes text,
  party_name text,
  party_phone text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own inventory movements" ON public.inventory_movements
  FOR SELECT USING (auth.uid() = created_by OR get_parent_user_id(auth.uid()) = created_by);

CREATE POLICY "Users can insert inventory movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (auth.uid() = created_by OR get_parent_user_id(auth.uid()) = created_by);

-- Create indexes for faster performance on inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON inventory_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_type ON inventory_movements(reference_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

-- Additional indexes for core tables to improve performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_counters_name ON counters(name);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_product_discounts_product_id ON product_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_discounts_is_active ON product_discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_phone ON loyalty_points(customer_phone);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_created_at ON kitchen_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_orders_status ON live_orders(status);
CREATE INDEX IF NOT EXISTS idx_live_orders_table_number ON live_orders(table_number);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_waiters_username ON waiters(username);
CREATE INDEX IF NOT EXISTS idx_returns_reference_number ON returns(reference_number);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_return_type ON returns(return_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_id ON purchase_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_bill_templates_is_active ON bill_templates(is_active);