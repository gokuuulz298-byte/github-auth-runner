-- ============================================
-- EDUVANCA BILLING POS SYSTEM - DATABASE SETUP
-- ============================================
-- This SQL file contains all necessary database tables, policies, and configurations
-- Run these statements in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- COMPANY PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    gstin TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    thank_you_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS Policies for company_profiles
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company profile"
    ON public.company_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own company profile"
    ON public.company_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company profile"
    ON public.company_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all categories"
    ON public.categories FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can delete own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- ============================================
-- COUNTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for counters
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all counters"
    ON public.counters FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert counters"
    ON public.counters FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own counters"
    ON public.counters FOR UPDATE
    USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can delete own counters"
    ON public.counters FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    buying_price DECIMAL(10,2),
    stock_quantity DECIMAL(10,3) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    category TEXT,
    price_type TEXT DEFAULT 'quantity',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on barcode for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- RLS Policies for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all products"
    ON public.products FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert products"
    ON public.products FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update all products"
    ON public.products FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own products"
    ON public.products FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- RLS Policies for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all customers"
    ON public.customers FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert customers"
    ON public.customers FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update all customers"
    ON public.customers FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own customers"
    ON public.customers FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- ============================================
-- LOYALTY POINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_phone TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    points INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on customer_phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_loyalty_points_phone ON public.loyalty_points(customer_phone);

-- RLS Policies for loyalty_points
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all loyalty points"
    ON public.loyalty_points FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert loyalty points"
    ON public.loyalty_points FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update loyalty points"
    ON public.loyalty_points FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- ============================================
-- COUPONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all coupons"
    ON public.coupons FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert coupons"
    ON public.coupons FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own coupons"
    ON public.coupons FOR UPDATE
    USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can delete own coupons"
    ON public.coupons FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- ============================================
-- PRODUCT DISCOUNTS TABLE (Limited Time Offers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_percentage DECIMAL(5,2) NOT NULL,
    discount_amount DECIMAL(10,2),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_discounts_product ON public.product_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_discounts_dates ON public.product_discounts(start_date, end_date);

-- RLS Policies for product_discounts
ALTER TABLE public.product_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all product discounts"
    ON public.product_discounts FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert product discounts"
    ON public.product_discounts FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own product discounts"
    ON public.product_discounts FOR UPDATE
    USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can delete own product discounts"
    ON public.product_discounts FOR DELETE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2),
    items_data JSONB NOT NULL,
    synced BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON public.invoices(bill_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- RLS Policies for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own invoices"
    ON public.invoices FOR UPDATE
    USING (auth.uid() = created_by OR created_by IS NULL);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON public.company_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counters_updated_at BEFORE UPDATE ON public.counters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON public.loyalty_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_discounts_updated_at BEFORE UPDATE ON public.product_discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- Your database is now ready for the Eduvanca Billing POS System!
-- Make sure to update your Supabase credentials in the .env file
