UPDATE public.store_data AS d
SET payload = jsonb_set(d.payload, '{name}', to_jsonb(('Zero ' || lpad(substring(d.entity_id from '[0-9]+$'), 2, '0'))::text), true),
    updated_at = now()
FROM public.stores AS s
WHERE d.store_id = s.id
  AND s.store_code = 'COSMO-DT'
  AND d.kind = 'cafe_table'
  AND d.entity_id IN ('meja-1', 'meja-2', 'meja-3', 'meja-4');