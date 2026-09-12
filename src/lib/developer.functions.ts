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

async function isDeveloper(context: Ctx) {
  const { data } = await context.supabase
    .from("developer_accounts")
    .select("user_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  return Boolean(data);
}

/** Status akun Developer + daftar seluruh store yang bisa dibuka. */
export const getDeveloperContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeveloperContext> => {
    const ctx = context as unknown as Ctx;
    if (!(await isDeveloper(ctx))) {
      return { isDeveloper: false, storeId: null, stores: [] };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: stores }, { data: member }] = await Promise.all([
      supabaseAdmin
        .from("stores")
        .select("id, store_code, store_name, city, active, expires_at")
        .order("store_name"),
      supabaseAdmin
        .from("store_members")
        .select("store_id")
        .eq("user_id", ctx.userId)
        .maybeSingle(),
    ]);
    return {
      isDeveloper: true,
      storeId: (member as { store_id: string } | null)?.store_id ?? null,
      stores: (stores ?? []) as DeveloperStore[],
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
    if (!(await isDeveloper(ctx))) {
      throw new Error("Hanya akun Developer yang boleh berpindah store.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store) throw new Error("Store tidak ditemukan.");
    const { error } = await supabaseAdmin
      .from("store_members")
      .upsert({ user_id: ctx.userId, store_id: data.storeId } as never, {
        onConflict: "user_id",
      });
    if (error) throw new Error(error.message);
    return { ok: true, storeId: data.storeId };
  });
