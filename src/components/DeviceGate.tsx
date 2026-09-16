import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setDeviceReject, useDeviceAccess } from "@/lib/device-guard";

/**
 * Perangkat yang tidak terdaftar di data store tidak boleh masuk sama sekali,
 * kecuali levelnya Manager, Installer, atau Developer. Layar TV dan halaman
 * masuk dibiarkan apa adanya.
 */
export function DeviceGate() {
  const { checked, allowed, privileged, code } = useDeviceAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const kicking = useRef(false);

  useEffect(() => {
    if (pathname.startsWith("/tv") || pathname.startsWith("/auth")) return;
    if (!checked || allowed || privileged || kicking.current) return;
    kicking.current = true;
    void (async () => {
      setDeviceReject(code);
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
      kicking.current = false;
    })();
  }, [checked, allowed, privileged, code, pathname, navigate, queryClient]);

  return null;
}
