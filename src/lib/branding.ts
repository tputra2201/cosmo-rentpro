import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Branding = {
  logo_url: string;
  login_title: string;
  login_note: string;
};

export const defaultBranding: Branding = {
  logo_url: "",
  login_title: "BILLING RENTAL PS",
  login_note: "",
};

const CACHE_KEY = "billing-branding-v1";

function readCache(): Branding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Branding) : null;
  } catch {
    return null;
  }
}

/** Tampilan halaman masuk yang diatur Developer dari pusat kontrol. */
export function useBranding() {
  const [branding, setBranding] = useState<Branding>(defaultBranding);

  useEffect(() => {
    const cached = readCache();
    if (cached) setBranding({ ...defaultBranding, ...cached });
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_branding")
        .select("logo_url, login_title, login_note")
        .eq("id", "default")
        .maybeSingle();
      if (cancelled || !data) return;
      const row = { ...defaultBranding, ...(data as Branding) };
      setBranding(row);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(row));
      } catch {
        /* penyimpanan penuh */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return branding;
}
