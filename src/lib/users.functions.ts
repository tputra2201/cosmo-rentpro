import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Hanya Admin yang boleh mengelola pengguna.");
}

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "kasir";
  createdAt: string;
};

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error(error.message);

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const roleById = new Map<string, "admin" | "kasir">();
    for (const r of roles ?? []) {
      const current = roleById.get(r.user_id);
      if (current === "admin") continue;
      roleById.set(r.user_id, r.role as "admin" | "kasir");
    }

    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName: nameById.get(u.id) ?? "",
      role: roleById.get(u.id) ?? "kasir",
      createdAt: u.created_at,
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(1),
        role: z.enum(["admin", "kasir"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const id = created.user!.id;

    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id, full_name: data.fullName, must_change_password: true } as never,
        { onConflict: "id" },
      );
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: id, role: data.role });
    if (roleError) throw new Error(roleError.message);
    return { id };
  });


export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        fullName: z.string().min(1).optional(),
        role: z.enum(["admin", "kasir"]).optional(),
        password: z.string().min(6).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.fullName) {
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: data.id, full_name: data.fullName }, { onConflict: "id" });
      await supabaseAdmin.auth.admin.updateUserById(data.id, {
        user_metadata: { full_name: data.fullName },
      });
    }
    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: data.id, must_change_password: true } as never,
          { onConflict: "id" },
        );
    }

    if (data.role) {
      if (data.role !== "admin" && data.id === (context as unknown as Ctx).userId) {
        throw new Error("Kamu tidak bisa menurunkan level akunmu sendiri.");
      }
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.id, role: data.role });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    if (data.id === ctx.userId) throw new Error("Kamu tidak bisa menghapus akunmu sendiri.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
