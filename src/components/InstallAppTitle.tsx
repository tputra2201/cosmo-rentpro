import { useEffect } from "react";
import { useBranding } from "@/lib/branding";

/**
 * Nama aplikasi saat di-install dari browser:
 * "RenToPlay" + Versi Aplikasi yang diatur Developer.
 * (manifest dinamis di /api/public/manifest; di sini hanya
 * memperbarui judul khusus iOS "Add to Home Screen".)
 */
export function InstallAppTitle() {
  const branding = useBranding();
  const version = branding.app_version.trim();
  const label = version && !/^v/i.test(version) ? `v${version}` : version;
  const name = ["RenToPlay", label].filter(Boolean).join(" ");

  useEffect(() => {
    let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "apple-mobile-web-app-title");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", name);
  }, [name]);

  return null;
}
