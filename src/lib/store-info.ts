import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StoreInfo = {
  id: string;
  store_code: string;
  store_name: string;
  store_email: string;
  address: string;
  city: string;
  owner_name: string;
  phone: string;
  app_version: string;
  dev_contact: string;
  expires_at: string | null;
  active: boolean;
  logo_url: string;
  device_code: string;
  allowed_ips: string[];
};

const CACHE_KEY = "billing-store-info-v1";

const COLUMNS =
  "id, store_code, store_name, store_email, address, city, owner_name, phone, app_version, dev_contact, expires_at, active, logo_url, device_code, allowed_ips";

function readCache(): StoreInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as StoreInfo) : null;
  } catch {
    return null;
  }
}

/**
 * Data store milik pengguna yang sedang masuk.
 * Nilai terakhir disimpan di perangkat agar masa aktif tetap berlaku saat luring.
 */
export function useStoreInfo(enabled: boolean) {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setStore(null);
      setLoading(false);
      return;
    }
    setStore(readCache());
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("stores").select(COLUMNS).limit(1).maybeSingle();
      if (cancelled) return;
      const row = data as StoreInfo | null;
      if (row) {
        setStore(row);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(row));
        } catch {
          /* penyimpanan penuh */
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { store, loading };
}
