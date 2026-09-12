import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDeveloperContext, type DeveloperContext } from "./developer.functions";

const EMPTY: DeveloperContext = { isDeveloper: false, storeId: null, stores: [] };

/** Status akun Developer (akses penuh ke semua store) untuk pengguna yang sedang masuk. */
export function useDeveloper(enabled: boolean) {
  const fetchContext = useServerFn(getDeveloperContext);
  const query = useQuery({
    queryKey: ["developer-context"],
    queryFn: () => fetchContext(),
    enabled,
    staleTime: 60_000,
  });
  return query.data ?? EMPTY;
}

/** Bersihkan salinan data store di perangkat sebelum berpindah store. */
export function clearStoreCaches() {
  if (typeof window === "undefined") return;
  for (const key of [
    "billing-ps-state-v1",
    "billing-store-info-v1",
    "billing-sync-outbox-v1",
    "billing-sync-shadow-v1",
    "billing-sync-since-v1",
    "billing-sync-store-v1",
  ]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* penyimpanan tidak tersedia */
    }
  }
}
