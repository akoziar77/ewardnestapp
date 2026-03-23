
-- Fix 1: Remove dangerous INSERT policy on merchant_users that lets any user self-insert
DROP POLICY IF EXISTS "Users can create own merchant membership" ON public.merchant_users;

-- Replace with: only allow insert if the user is creating a merchant_users row for a merchant they just created (no existing members)
-- Or via service role / admin only
CREATE POLICY "Service role can insert merchant memberships"
ON public.merchant_users
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role' OR is_admin());

-- Fix 2: Remove dangerous INSERT policy on merchants that lets any authenticated user create merchants
DROP POLICY IF EXISTS "Authenticated users can create merchants" ON public.merchants;

-- Replace with: only service role or admin can create merchants
CREATE POLICY "Only admins or service role can create merchants"
ON public.merchants
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role' OR is_admin());
