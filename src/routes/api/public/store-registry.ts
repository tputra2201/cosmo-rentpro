import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Pusat kontrol Developer untuk seluruh store dalam satu aplikasi bersama.
 * Hanya bisa diakses dengan header `x-control-secret` = DEVELOPER_CONTROL_SECRET.
 */

const storeFields = {
  store_code: z.string().max(64).optional(),
  store_name: z.string().max(200).optional(),
  store_email: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  owner_name: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  app_version: z.string().max(40).optional(),
  dev_contact: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
  logo_url: z.string().max(400000).optional(),
  active: z.boolean().optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
};

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...storeFields }),
  z.object({ action: z.literal("update"), id: z.string().uuid(), ...storeFields }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({
    action: z.literal("extend"),
    id: z.string().uuid(),
    days: z.number().int().min(1).max(3650),
  }),
  z.object({
    action: z.literal("branding"),
    logo_url: z.string().max(400000).optional(),
    login_title: z.string().max(200).optional(),
    login_note: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal("developer-account"),
    email: z.string().email(),
    full_name: z.string().max(200).default("Developer"),
    redirect_to: z.string().url(),
  }),
  z.object({
    action: z.literal("developer-remove"),
    user_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("assign"),
    id: z.string().uuid(),
    email: z.string().email(),
    full_name: z.string().max(200).default(""),
    role: z.enum(["installer", "admin", "kasir"]).default("installer"),
    redirect_to: z.string().url(),
  }),
]);

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorize(request: Request) {
  const secret = process.env["DEVELOPER_CONTROL_SECRET"] ?? "";
  const provided =
    request.headers.get("x-control-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return secret.length > 0 && timingSafeEqual(secret, provided);
}

const columns =
  "id, store_code, store_name, store_email, address, city, owner_name, phone, app_version, dev_contact, note, active, expires_at, created_at, logo_url";

export const Route = createFileRoute("/api/public/store-registry")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorize(request)) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [{ data, error }, { data: members }] = await Promise.all([
          supabaseAdmin.from("stores").select(columns).order("created_at"),
          supabaseAdmin.from("store_members").select("store_id"),
        ]);
        if (error) return new Response(error.message, { status: 500 });
        const counts = new Map<string, number>();
        for (const row of (members ?? []) as { store_id: string }[]) {
          counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1);
        }
        const stores = ((data ?? []) as { id: string }[]).map((row) => ({
          ...row,
          members: counts.get(row.id) ?? 0,
        }));
        return Response.json({ stores });
      },
      POST: async ({ request }) => {
        if (!authorize(request)) return new Response("Unauthorized", { status: 401 });
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const body = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (body.action === "create") {
          const { action: _a, ...values } = body;
          const { data, error } = await supabaseAdmin
            .from("stores")
            .insert(values as never)
            .select(columns)
            .maybeSingle();
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ store: { ...(data as object), members: 0 } });
        }

        if (body.action === "update" || body.action === "extend") {
          let values: Record<string, unknown>;
          if (body.action === "extend") {
            const { data: current } = await supabaseAdmin
              .from("stores")
              .select("expires_at")
              .eq("id", body.id)
              .maybeSingle();
            const currentIso = (current as { expires_at: string } | null)?.expires_at;
            const base = currentIso ? new Date(currentIso) : new Date();
            const start = base.getTime() > Date.now() ? base : new Date();
            values = {
              expires_at: new Date(
                start.getTime() + body.days * 24 * 60 * 60 * 1000,
              ).toISOString(),
            };
          } else {
            const { action: _a, id: _id, ...rest } = body;
            values = rest;
          }
          const { data, error } = await supabaseAdmin
            .from("stores")
            .update(values as never)
            .eq("id", body.id)
            .select(columns)
            .maybeSingle();
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ store: data });
        }

        if (body.action === "delete") {
          const { error } = await supabaseAdmin.from("stores").delete().eq("id", body.id);
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ ok: true });
        }

        if (body.action === "branding") {
          const { action: _a, ...values } = body;
          const { data, error } = await supabaseAdmin
            .from("app_branding")
            .upsert({ id: "default", ...values } as never, { onConflict: "id" })
            .select("logo_url, login_title, login_note")
            .maybeSingle();
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ branding: data });
        }

        // assign: tautkan / undang akun sebagai pengelola store ini
        const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (listError) return new Response(listError.message, { status: 500 });
        const email = body.email.toLowerCase();
        const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
        let userId = existing?.id;
        let invited = false;
        let emailSent: "invite" | "reset" | null = null;

        if (!userId) {
          const { data: created, error: inviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(body.email, {
              data: { full_name: body.full_name },
              redirectTo: body.redirect_to,
            });
          if (inviteError) return new Response(inviteError.message, { status: 500 });
          userId = created.user!.id;
          invited = true;
          emailSent = "invite";
        } else if (!existing?.last_sign_in_at) {
          // Akun sudah ada tapi belum pernah masuk: kirim ulang undangan.
          const { error: reinviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(body.email, {
              data: { full_name: body.full_name },
              redirectTo: body.redirect_to,
            });
          if (reinviteError) return new Response(reinviteError.message, { status: 500 });
          emailSent = "invite";
        } else {
          // Akun aktif: kirim tautan buat sandi baru agar bisa langsung masuk.
          const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
            body.email,
            { redirectTo: body.redirect_to },
          );
          if (resetError) return new Response(resetError.message, { status: 500 });
          emailSent = "reset";
        }

        await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            ...(body.full_name ? { full_name: body.full_name } : {}),
            ...(invited ? { must_change_password: true } : {}),
          } as never,
          { onConflict: "id" },
        );
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: body.role } as never);
        if (roleError) return new Response(roleError.message, { status: 500 });
        const { error: memberError } = await supabaseAdmin
          .from("store_members")
          .upsert({ user_id: userId, store_id: body.id } as never, {
            onConflict: "user_id",
          });
        if (memberError) return new Response(memberError.message, { status: 500 });

        return Response.json({ ok: true, invited, emailSent });
      },
    },
  },
});
