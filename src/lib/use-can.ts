import { useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useBilling } from "@/lib/billing-store";
import { can } from "@/lib/permissions";

/**
 * Pemeriksa hak akses per level untuk tombol & fitur di dalam halaman.
 * Contoh: const allow = useCan(); allow("sesi.void")
 */
export function useCan() {
  const { role } = useAuth();
  const { rolePermissions } = useBilling();
  return useCallback(
    (key: string) => can(role, key, rolePermissions),
    [role, rolePermissions],
  );
}
