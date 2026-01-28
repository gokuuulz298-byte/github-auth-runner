-- Create additional indexes for optimal performance across all components
-- These indexes cover frequently queried columns and improve JOIN operations

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON public.categories(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- Counters indexes  
CREATE INDEX IF NOT EXISTS idx_counters_created_by ON public.counters(created_by);
CREATE INDEX IF NOT EXISTS idx_counters_name ON public.counters(name);

-- Coupons indexes
CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON public.coupons(created_by);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON public.coupons(start_date, end_date);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- Invoices indexes (critical for analytics and reports)
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_counter_id ON public.invoices(counter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON public.invoices(bill_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON public.invoices(customer_phone);
CREATE INDEX IF NOT EXISTS idx_invoices_composite ON public.invoices(created_by, created_at DESC);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(stock_quantity, low_stock_threshold) WHERE is_deleted = false;

-- Product discounts indexes
CREATE INDEX IF NOT EXISTS idx_product_discounts_product ON public.product_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_discounts_active ON public.product_discounts(is_active, start_date, end_date);

-- Purchases indexes
CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON public.purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON public.purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_name);

-- Purchase payments indexes
CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase ON public.purchase_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_created_by ON public.purchase_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_date ON public.purchase_payments(payment_date DESC);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON public.suppliers(created_by);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON public.suppliers(phone);

-- Loyalty points indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_points_phone ON public.loyalty_points(customer_phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_created_by ON public.loyalty_points(created_by);

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON public.inventory_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref_type ON public.inventory_movements(reference_type);

-- Returns indexes
CREATE INDEX IF NOT EXISTS idx_returns_created_by ON public.returns(created_by);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_reference ON public.returns(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);

-- Kitchen orders indexes
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_created_by ON public.kitchen_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON public.kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_created_at ON public.kitchen_orders(created_at DESC);

-- Live orders indexes
CREATE INDEX IF NOT EXISTS idx_live_orders_created_by ON public.live_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_live_orders_status ON public.live_orders(status);
CREATE INDEX IF NOT EXISTS idx_live_orders_table ON public.live_orders(table_number);

-- Restaurant tables indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_created_by ON public.restaurant_tables(created_by);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(status);

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_staff_created_by ON public.staff(created_by);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user ON public.staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);

-- Waiters indexes
CREATE INDEX IF NOT EXISTS idx_waiters_created_by ON public.waiters(created_by);
CREATE INDEX IF NOT EXISTS idx_waiters_auth_user ON public.waiters(auth_user_id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_parent ON public.user_roles(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Bill templates indexes
CREATE INDEX IF NOT EXISTS idx_bill_templates_created_by ON public.bill_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_bill_templates_active ON public.bill_templates(is_active) WHERE is_active = true;