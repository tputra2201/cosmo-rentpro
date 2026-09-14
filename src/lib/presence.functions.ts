import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function myRoles(context: Ctx): Promise<string[]> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: string }) => r.role);
}

async function storeOf(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("store_members")
    .select("store_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data as { store_id: string } | null)?.store_id ?? null;
}

/** Dipanggil berkala oleh perangkat yang sedang dipakai. */
export const touchPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ device: z.string().max(200).optional() }).parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    const storeId = await storeOf(ctx.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_presence").upsert(
      {
        user_id: ctx.userId,
        store_id: storeId,
        last_seen_at: new Date().toISOString(),
        device: data.device ?? "",
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type PresenceRow = {
  userId: string;
  storeId: string | null;
  lastSeenAt: string;
  device: string;
};

/** Kehadiran terakhir semua akun yang boleh dilihat pemanggil. */
export const listPresence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PresenceRow[]> => {
    const ctx = context as unknown as Ctx;
    const roles = await myRoles(ctx);
    if (
      !roles.includes("admin") &&
      !roles.includes("manager") &&
      !roles.includes("installer")
    ) {
      throw new Error("Hanya Manager atau Installer yang boleh melihat daftar ini.");
    }
    const seeAll = roles.includes("installer");
    const storeId = seeAll ? null : await storeOf(ctx.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("user_presence")
      .select("user_id, store_id, last_seen_at, device")
      .order("last_seen_at", { ascending: false });
    if (!seeAll) query = query.eq("store_id", storeId ?? "");
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as {
      user_id: string;
      store_id: string | null;
      last_seen_at: string;
      device: string | null;
    }[]).map((r) => ({
      userId: r.user_id,
      storeId: r.store_id,
      lastSeenAt: r.last_seen_at,
      device: r.device ?? "",
    }));
  });
