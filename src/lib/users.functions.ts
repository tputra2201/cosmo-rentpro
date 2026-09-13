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

async function assertAdmin(context: Ctx) {
  const roles = await myRoles(context);
  if (
    !roles.includes("admin") &&
    !roles.includes("manager") &&
    !roles.includes("installer")
  ) {
    throw new Error("Hanya Manager atau Installer yang boleh mengelola pengguna.");
  }
}

async function assertInstaller(context: Ctx) {
  const roles = await myRoles(context);
  if (!roles.includes("installer")) {
    throw new Error("Hanya Installer yang boleh mengatur level Installer.");
  }
}

/** Store tempat akun ini terdaftar. */
async function myStoreId(context: Ctx): Promise<string | null> {
  const { data } = await context.supabase
    .from("store_members")
    .select("store_id")
    .limit(1)
    .maybeSingle();
  return (data as { store_id: string } | null)?.store_id ?? null;
}

async function assertSameStore(context: Ctx, targetId: string) {
  const storeId = await myStoreId(context);
  if (!storeId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("store_members")
    .select("store_id")
    .eq("user_id", targetId)
    .maybeSingle();
  const target = (data as { store_id: string } | null)?.store_id ?? null;
  if (target && target !== storeId) {
    throw new Error("Pengguna ini bukan bagian dari store kamu.");
  }
}

/** Semua akun Developer (disembunyikan dari Installer & level lain). */
async function developerIds(): Promise<Set<string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("developer_accounts").select("user_id");
  return new Set(
    ((data ?? []) as { user_id: string }[]).map((r) => r.user_id),
  );
}

async function assertNotDeveloper(context: Ctx, targetId: string) {
  const devs = await developerIds();
  if (devs.has(targetId) && targetId !== context.userId) {
    throw new Error("Akun Developer tidak bisa diubah atau dihapus dari sini.");
  }
}

export type AppRole =
  | "installer"
  | "manager"
  | "admin"
  | "finance"
  | "kasir"
  | "operator";

const roleSchema = z.enum([
  "installer",
  "manager",
  "admin",
  "finance",
  "kasir",
  "operator",
]);

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  createdAt: string;
  pending: boolean;
  storeId: string | null;
  storeName: string;

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

    const roles0 = await myRoles(context as unknown as Ctx);
    const seeAllStores = roles0.includes("installer");
    const storeId = seeAllStores
      ? null
      : await myStoreId(context as unknown as Ctx);
    const { data: members } = await supabaseAdmin
      .from("store_members")
      .select("user_id, store_id");
    const { data: storeRows } = await supabaseAdmin
      .from("stores")
      .select("id, store_name");
    const storeNameById = new Map(
      ((storeRows ?? []) as { id: string; store_name: string }[]).map((s) => [
        s.id,
        s.store_name,
      ]),
    );
    const memberStore = new Map(
      ((members ?? []) as { user_id: string; store_id: string }[]).map((m) => [
        m.user_id,
        m.store_id,
      ]),
    );

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const roleById = new Map<string, AppRole>();
    const rank: Record<string, number> = { installer: 3, admin: 2, kasir: 1 };
    for (const r of roles ?? []) {
      const current = roleById.get(r.user_id);
      if (current && (rank[current] ?? 0) >= (rank[r.role] ?? 0)) continue;
      roleById.set(r.user_id, r.role as AppRole);
    }

    const devs = await developerIds();
    const iamDeveloper = devs.has((context as unknown as Ctx).userId);

    return list.users
      .filter((u) => {
        // Akun Developer hanya terlihat oleh Developer sendiri.
        if (devs.has(u.id) && !iamDeveloper) return false;
        const target = memberStore.get(u.id) ?? null;
        // Tanpa store tidak pernah tampil.
        if (!target) return false;
        // Installer melihat semua store, staf lain hanya store sendiri.
        return seeAllStores ? true : target === storeId;
      })
      .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName: nameById.get(u.id) ?? "",
      role: roleById.get(u.id) ?? "kasir",
      createdAt: u.created_at,
      pending: !u.last_sign_in_at,
      storeId: memberStore.get(u.id) ?? null,
      storeName:
        storeNameById.get(memberStore.get(u.id) ?? "") ?? "Tanpa store",

    }));
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        fullName: z.string().min(1),
        role: roleSchema,
        redirectTo: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.role === "installer") await assertInstaller(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { full_name: data.fullName },
        redirectTo: data.redirectTo,
      },
    );
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

    // Staf baru otomatis terikat ke store milik pengundang.
    const storeId = await myStoreId(context as unknown as Ctx);
    if (storeId) {
      await supabaseAdmin
        .from("store_members")
        .upsert({ user_id: id, store_id: storeId } as never, { onConflict: "user_id" });
    }
    return { id };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });



export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        fullName: z.string().min(1).optional(),
        role: roleSchema.optional(),
        password: z.string().min(6).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    await assertNotDeveloper(context as unknown as Ctx, data.id);
    await assertSameStore(context as unknown as Ctx, data.id);
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
      if (data.role === "installer") await assertInstaller(context as unknown as Ctx);
      if (
        data.role !== "admin" &&
        data.role !== "manager" &&
        data.role !== "installer" &&
        data.id === (context as unknown as Ctx).userId
      ) {
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
    await assertSameStore(ctx, data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Dipanggil setelah pengguna berhasil mengganti kata sandinya sendiri. */
export const markPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: ctx.userId, must_change_password: false } as never,
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
