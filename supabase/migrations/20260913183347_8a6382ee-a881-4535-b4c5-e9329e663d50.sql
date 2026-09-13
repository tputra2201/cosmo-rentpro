UPDATE public.store_data AS d
SET deleted = true,
    updated_at = now()
FROM public.stores AS s
WHERE d.store_id = s.id
  AND s.store_code = 'COSMO-DT'
  AND d.kind = 'station'
  AND d.entity_id IN (
    'tv-1789165743438',
    'tv-1789165747373',
    'tv-1789172500955',
    'tv-1789172522003',
    'tv-1789172532314',
    'tv-1789172553091',
    'tv-1789172571962',
    'tv-1789172625154',
    'tv-1789172652378',
    'tv-1789172676739'
  );