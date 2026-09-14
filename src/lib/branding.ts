import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Branding = {
  logo_url: string;
  login_title: string;
  login_note: string;
  app_name: string;
  app_version: string;
  release_date: string;
  developer_name: string;
  developer_email: string;
  developer_contact: string;
};

export const defaultBranding: Branding = {
  logo_url: "",
  login_title: "BILLING RENTAL PS",
  login_note: "",
  app_name: "",
  app_version: "",
  release_date: "",
  developer_name: "",
  developer_email: "",
  developer_contact: "",
};

const COLUMNS =
  "logo_url, login_title, login_note, app_name, app_version, release_date, developer_name, developer_email, developer_contact";

/** Contoh hasil: "RentalPro v1.0 - 081282284411" */
export function brandingSignature(b: Branding) {
  const name = b.app_name.trim();
  const version = b.app_version.trim();
  const contact = b.developer_contact.trim();
  return [[name, version].filter(Boolean).join(" "), contact]
    .filter(Boolean)
    .join(" - ");
}

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
