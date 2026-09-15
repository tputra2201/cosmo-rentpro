import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Manifest untuk "Install aplikasi" di browser.
 * Nama aplikasi = "RenToPlay" + Versi Aplikasi yang diatur Developer
 * di Pusat Kontrol (/kontrol → Identitas aplikasi).
 */

type Identity = { name: string; version: string; icon: string };

function formatName(identity: Identity): string {
  const base = identity.name.trim() || "RenToPlay";
  const v = identity.version.trim();
  if (!v) return base;
  const label = /^v/i.test(v) ? v : `v${v}`;
  return `${base} ${label}`;
}

async function readIdentity(): Promise<Identity> {
  const url = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("app_branding")
      .select("app_version")
      .eq("id", "default")
      .maybeSingle();
    return data?.app_version ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/manifest")({
  server: {
    handlers: {
      GET: async () => {
        const version = await readAppVersion();
        const manifest = {
          id: "/",
          name: formatName(version),
          short_name: "RenToPlay",
          description:
            "Aplikasi kasir dan timer rental PlayStation: monitor TV, tarif, dan laporan.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#060f1e",
          theme_color: "#060f1e",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          ],
        };
        return new Response(JSON.stringify(manifest), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
