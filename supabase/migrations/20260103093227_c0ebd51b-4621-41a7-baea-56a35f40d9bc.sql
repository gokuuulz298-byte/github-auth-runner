-- Enable RLS on staff table if not already enabled
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own staff" ON public.staff;
DROP POLICY IF EXISTS "Users can create staff" ON public.staff;
DROP POLICY IF EXISTS "Users can update their own staff" ON public.staff;
DROP POLICY IF EXISTS "Users can delete their own staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;

-- Admin (creator) policies
CREATE POLICY "Admins can view their staff members"
ON public.staff
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Admins can create staff members"
ON public.staff
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their staff members"
ON public.staff
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete their staff members"
ON public.staff
FOR DELETE
USING (auth.uid() = created_by);

-- Add unique constraint on email per creator to avoid duplicates
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_email_created_by_unique;
ALTER TABLE public.staff ADD CONSTRAINT staff_email_created_by_unique UNIQUE (email, created_by);

-- Create trigger for updated_at if not exists
DROP TRIGGER IF EXISTS update_staff_updated_at ON public.staff;
CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();