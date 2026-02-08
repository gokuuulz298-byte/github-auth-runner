-- Enforce global uniqueness for waiter usernames (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS waiters_username_unique_ci
ON public.waiters (lower(username));

-- Allow staff/waiters (parent-scoped) to insert purchase payments
-- Existing policy only allowed created_by = auth.uid(), which breaks staff CRUD.
DROP POLICY IF EXISTS "Users can create purchase payments" ON public.purchase_payments;
CREATE POLICY "Users can create purchase payments"
ON public.purchase_payments
FOR INSERT
TO authenticated
WITH CHECK (created_by = public.get_parent_user_id(auth.uid()));
