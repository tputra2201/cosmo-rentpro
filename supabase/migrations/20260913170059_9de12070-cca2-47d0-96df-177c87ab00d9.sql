INSERT INTO public.store_members (user_id, store_id)
SELECT
  u.id,
  s.id
FROM auth.users AS u
CROSS JOIN public.stores AS s
WHERE lower(u.email) = lower('cosmogaming.dt4@gmail.com')
  AND s.store_code = 'COSMO-TS'
ON CONFLICT (user_id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    updated_at = now();