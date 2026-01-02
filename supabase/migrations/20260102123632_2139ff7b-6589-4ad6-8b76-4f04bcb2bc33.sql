-- Create expenses table for tracking business expenses
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  expense_date timestamp with time zone NOT NULL DEFAULT now(),
  category text NOT NULL,
  description text,
  amount numeric NOT NULL,
  payment_mode text DEFAULT 'cash',
  receipt_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();