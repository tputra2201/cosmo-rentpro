import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useBranding } from "@/lib/branding";

/**
 * Judul dan ikon website mengikuti Identitas aplikasi di /kontrol:
 * Nama Aplikasi (+ Versi) sebagai judul tab, dan Ikon Aplikasi
 * sebagai favicon serta ikon "Add to Home Screen".
 */
export function InstallAppTitle() {
  const branding = useBranding();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const version = branding.app_version.trim();
  const label = version && !/^v/i.test(version) ? `v${version}` : version;
  const appName = branding.app_name.trim() || "RenToPlay";
  const name = [appName, label].filter(Boolean).join(" ");
  const icon = branding.app_icon_url.trim();

  useEffect(() => {
    document.title = name;
    setMeta("apple-mobile-web-app-title", appName);
  }, [name, appName, pathname]);

  useEffect(() => {
    const href = icon || "/favicon.png";
    setIcon("icon", href);
    setIcon("apple-touch-icon", href);
  }, [icon, pathname]);

  return null;
}

function setMeta(nameAttr: string, content: string) {
  let meta = document.querySelector(`meta[name="${nameAttr}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", nameAttr);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function setIcon(rel: string, href: string) {
  document
    .querySelectorAll(`link[rel="${rel}"]`)
    .forEach((el) => el.parentNode?.removeChild(el));
  const link = document.createElement("link");
  link.setAttribute("rel", rel);
  link.setAttribute("href", href);
  document.head.appendChild(link);
}
