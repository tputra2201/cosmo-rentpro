import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export type DeveloperStore = {
  id: string;
  store_code: string;
  store_name: string;
  city: string;
  active: boolean;
  expires_at: string | null;
};

export type DeveloperContext = {
  isDeveloper: boolean;
  storeId: string | null;
  stores: DeveloperStore[];
};

type StoreRow = DeveloperStore & { current_store_id: string | null };

/**
 * Status akun Developer + daftar seluruh store yang bisa dibuka.
 * Memakai fungsi database `developer_list_stores` (bukan kunci server), jadi
 * fitur ini juga tetap jalan saat aplikasi dijalankan di PC lokal.
 */
export const getDeveloperContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeveloperContext> => {
    const ctx = context as unknown as Ctx;
    const { data, error } = await ctx.supabase.rpc("developer_list_stores");
    if (error || !data) return { isDeveloper: false, storeId: null, stores: [] };
    const rows = data as StoreRow[];
    return {
      isDeveloper: true,
      storeId: rows[0]?.current_store_id ?? null,
      stores: rows.map(({ current_store_id: _ignored, ...store }) => store),
    };
  });

/** Pindahkan akun Developer ke store lain (akses penuh seperti Installer store itu). */
export const switchDeveloperStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storeId: string }) =>
    z.object({ storeId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase.rpc("developer_switch_store", {
      _store_id: data.storeId,
    });
    if (error) throw new Error(error.message);
    return { ok: true, storeId: data.storeId };
  });
