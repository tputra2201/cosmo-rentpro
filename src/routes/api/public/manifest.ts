import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Manifest untuk "Install aplikasi" di browser.
 * Nama aplikasi = "RenToPlay" + Versi Aplikasi yang diatur Developer
 * di Pusat Kontrol (/kontrol → Identitas aplikasi).
 */

function formatName(version: string | null | undefined): string {
  const v = (version ?? "").trim();
  if (!v) return "RenToPlay";
  const label = /^v/i.test(v) ? v : `v${v}`;
  return `RenToPlay ${label}`;
}

async function readAppVersion(): Promise<string | null> {
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
