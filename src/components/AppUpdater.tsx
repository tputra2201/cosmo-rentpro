import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Tab kasir sering terbuka berhari-hari tanpa dimuat ulang, sehingga tetap
 * menjalankan versi lama. Komponen ini memeriksa versi terbaru secara berkala
 * dan memuat ulang otomatis saat tidak ada dialog yang sedang dibuka.
 */
const CHECK_MS = 5 * 60 * 1000;

function scriptOf(html: string): string | null {
  const m = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
  return m?.[1] ?? null;
}

function currentScript(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
  return el?.getAttribute("src") ?? null;
}

export function AppUpdater() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const mine = currentScript();
    if (!mine) return;
    let pending = false;
    let notified = false;

    const tryReload = () => {
      if (!pending) return;
      const busy = document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (busy || document.activeElement?.tagName === "INPUT") return;
      window.location.reload();
    };

    const check = async () => {
      if (pending || !navigator.onLine) return;
      try {
        const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const latest = scriptOf(await res.text());
        if (latest && latest !== mine) {
          pending = true;
          if (!notified) {
            notified = true;
            toast.info("Versi baru aplikasi tersedia, memuat ulang otomatis…");
          }
          tryReload();
        }
      } catch {
        /* offline: coba lagi nanti */
      }
    };

    const t = window.setInterval(() => {
      void check();
      tryReload();
    }, CHECK_MS);
    const idle = window.setInterval(tryReload, 15_000);
    const onVis = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVis);
    void check();
    return () => {
      clearInterval(t);
      clearInterval(idle);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}
