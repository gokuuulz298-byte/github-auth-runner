-- Allow public read access for staff login verification
CREATE POLICY "Allow staff login verification"
ON public.staff
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public read access for waiter login verification  
CREATE POLICY "Allow waiter login verification"
ON public.waiters
FOR SELECT
TO anon, authenticated
USING (true);