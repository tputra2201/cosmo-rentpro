import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { switchDeveloperStore } from "@/lib/developer.functions";
import { clearStoreCaches, useDeveloper } from "@/lib/developer";

/** Pemindah store khusus akun Developer: satu akun bisa membuka seluruh store. */
export function DeveloperStoreSwitcher({ enabled }: { enabled: boolean }) {
  const dev = useDeveloper(enabled);
  const switchStore = useServerFn(switchDeveloperStore);
  const [busy, setBusy] = useState(false);

  if (!dev.isDeveloper) return null;

  const handleChange = async (storeId: string) => {
    if (!storeId || storeId === dev.storeId) return;
    setBusy(true);
    try {
      await switchStore({ data: { storeId } });
      clearStoreCaches();
      toast.success("Berpindah store…");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal berpindah store.");
      setBusy(false);
    }
  };

  return (
    <label className="flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
      <Building2 className="size-3 shrink-0" />
      <span className="sr-only">Pilih store</span>
      <select
        value={dev.storeId ?? ""}
        disabled={busy}
        onChange={(e) => void handleChange(e.target.value)}
        className="max-w-[9rem] truncate bg-transparent text-[11px] font-semibold text-primary outline-none"
      >
        <option value="">Pilih store…</option>
        {dev.stores.map((s) => (
          <option key={s.id} value={s.id} className="text-foreground">
            {s.store_name || s.store_code || "Tanpa nama"}
            {s.city ? ` — ${s.city}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
