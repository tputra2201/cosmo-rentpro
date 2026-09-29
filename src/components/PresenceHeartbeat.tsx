import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { touchPresence } from "@/lib/presence.functions";
import { deviceCode } from "@/lib/device-guard";
import { useStoreInfo } from "@/lib/store-info";

const MODEL_KEY = "billing.device-model";

/** Merk/tipe perangkat dari browser (Android Chrome/Edge memberi nama model). */
async function deviceModel(): Promise<string> {
  try {
    const cached = localStorage.getItem(MODEL_KEY);
    if (cached) return cached;
    const uad = (navigator as unknown as {
      userAgentData?: { getHighEntropyValues: (h: string[]) => Promise<{ model?: string; platform?: string; platformVersion?: string }> };
    }).userAgentData;
    let model = "";
    if (uad) {
      const v = await uad.getHighEntropyValues(["model", "platform", "platformVersion"]);
      model = (v.model ?? "").trim();
    }
    if (!model) {
      const m = navigator.userAgent.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/);
      if (m && m[1] && m[1] !== "K") model = m[1].trim();
    }
    if (!model && /iPad/.test(navigator.userAgent)) model = "iPad";
    if (!model && /iPhone/.test(navigator.userAgent)) model = "iPhone";
    if (model) localStorage.setItem(MODEL_KEY, model);
    return model;
  } catch {
    return "";
  }
}

/** Nama perangkat singkat agar mudah dikenali di daftar kehadiran. */
function deviceLabel(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "iOS"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS X/i.test(ua)
          ? "Mac"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Perangkat";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${os} · ${browser}`;
}

/**
 * Menandai bahwa akun ini sedang memakai aplikasi. Dikirim saat masuk, lalu
 * setiap satu menit selama tab masih terlihat.
 */
export function PresenceHeartbeat() {
  const { session } = useAuth();
  const touch = useServerFn(touchPresence);
  const userId = session?.user.id;
  const { store } = useStoreInfo(true);
  const code = typeof window === "undefined" ? "" : deviceCode();
  const given = (store?.allowed_devices ?? []).find((d) => d.code === code)?.label?.trim() ?? "";

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let device = deviceLabel();
    void deviceModel().then((model) => {
      const base = deviceLabel();
      device = [given, model || base, given || model ? base : "", code].filter(Boolean).join(" · ");
      ping();
    });
    const ping = () => {
      if (stopped || typeof document === "undefined") return;
      if (document.visibilityState === "hidden") return;
      void touch({ data: { device } }).catch(() => {
        /* luring: dicoba lagi pada denyut berikutnya */
      });
    };
    ping();
    const timer = window.setInterval(ping, 60_000);
    window.addEventListener("visibilitychange", ping);
    window.addEventListener("focus", ping);
    window.addEventListener("online", ping);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("visibilitychange", ping);
      window.removeEventListener("focus", ping);
      window.removeEventListener("online", ping);
    };
  }, [userId, touch, given, code]);

  return null;
}
