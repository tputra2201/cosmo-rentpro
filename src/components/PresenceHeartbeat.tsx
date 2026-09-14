import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { touchPresence } from "@/lib/presence.functions";

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

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    const device = deviceLabel();
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
  }, [userId, touch]);

  return null;
}
