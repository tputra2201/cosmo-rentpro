import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const IDLE_MS = 5 * 60 * 1000;
const EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
  "click",
  "visibilitychange",
] as const;

export function IdleLogout() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Halaman tampilan TV dibiarkan tetap menyala (tidak ada interaksi di sana).
  const exempt = pathname.startsWith("/tv") || pathname.startsWith("/auth");

  useEffect(() => {
    if (!session || exempt) return;

    const logout = async () => {
      // Saat internet mati, masuk kembali tidak mungkin dilakukan. Jangan
      // keluarkan kasir: tunda sampai koneksi kembali.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        reset();
        return;
      }
      toast.info("Keluar otomatis", {
        description: "Tidak ada aktivitas selama 5 menit.",
      });
      await signOut();
      navigate({ to: "/auth", replace: true });
    };

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void logout(), IDLE_MS);
    };

    reset();
    for (const ev of EVENTS) window.addEventListener(ev, reset, { passive: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const ev of EVENTS) window.removeEventListener(ev, reset);
    };
  }, [session, exempt, navigate, signOut]);

  return null;
}
