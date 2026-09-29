import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { touchPresence } from "@/lib/presence.functions";
import { deviceCode } from "@/lib/device-guard";
import { browserName, friendlyDeviceName, packDevice } from "@/lib/device-name";

const MODEL_KEY = "billing.device-model";

/** Merk/tipe perangkat dari browser (Android Chrome/Edge memberi nama model). */
async function deviceModel(): Promise<string> {
  try {
    const cached = localStorage.getItem(MODEL_KEY);
    if (cached) return cached;
    const uad = (navigator as unknown as {
      userAgentData?: {
        getHighEntropyValues: (h: string[]) => Promise<{ model?: string; platform?: string }>;
      };
    }).userAgentData;
    let model = "";
    if (uad) {
      const v = await uad.getHighEntropyValues(["model", "platform"]);
      model = (v.model ?? "").trim();
    }
    if (!model) {
      const m = navigator.userAgent.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/);
      if (m && m[1] && m[1] !== "K") model = m[1].trim();
    }
    if (model) localStorage.setItem(MODEL_KEY, model);
    return model;
  } catch {
    return "";
  }
}

/**
 * Menandai bahwa akun ini sedang memakai aplikasi. Dikirim saat masuk, lalu
 * setiap satu menit selama tab masih terlihat.
 */
export function PresenceHeartbeat() {
  const { session } = useAuth();
  const touch = useServerFn(touchPresence);
  const userId = session?.user.id;
  const code = typeof window === "undefined" ? "" : deviceCode();

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    let device = packDevice(`${friendlyDeviceName("", ua)} · ${browserName(ua)}`, code);
    const ping = () => {
      if (stopped || typeof document === "undefined") return;
      if (document.visibilityState === "hidden") return;
      void touch({ data: { device } }).catch(() => {
        /* luring: dicoba lagi pada denyut berikutnya */
      });
    };
    void deviceModel().then((model) => {
      device = packDevice(`${friendlyDeviceName(model, ua)} · ${browserName(ua)}`, code);
      ping();
    });
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
  }, [userId, touch, code]);

  return null;
}
