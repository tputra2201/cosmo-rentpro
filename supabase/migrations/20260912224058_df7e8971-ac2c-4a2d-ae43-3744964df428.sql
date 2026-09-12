REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.developer_accounts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.store_members FROM anon, authenticated;
REVOKE ALL ON public.developer_accounts FROM anon;
REVOKE ALL ON public.store_members FROM anon;
GRANT ALL ON public.developer_accounts TO service_role;
GRANT ALL ON public.store_members TO service_role;

DROP POLICY IF EXISTS "No client writes to developer accounts" ON public.developer_accounts;
CREATE POLICY "No client writes to developer accounts"
ON public.developer_accounts
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (current_setting('request.method', true) IS NULL OR true)
WITH CHECK (false);

DROP POLICY IF EXISTS "No client writes to store members" ON public.store_members;
CREATE POLICY "No client writes to store members"
ON public.store_members
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates to developer accounts" ON public.developer_accounts;
CREATE POLICY "No client updates to developer accounts"
ON public.developer_accounts
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "No client deletes to developer accounts" ON public.developer_accounts;
CREATE POLICY "No client deletes to developer accounts"
ON public.developer_accounts
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "No client updates to store members" ON public.store_members;
CREATE POLICY "No client updates to store members"
ON public.store_members
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "No client deletes to store members" ON public.store_members;
CREATE POLICY "No client deletes to store members"
ON public.store_members
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);