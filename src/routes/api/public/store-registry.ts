import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Daftar pusat semua aplikasi store yang dipantau Developer.
 * Hanya bisa diakses dengan header `x-control-secret` = DEVELOPER_CONTROL_SECRET.
 */

const storePatch = z.object({
  store_code: z.string().max(64).optional(),
  store_name: z.string().max(200).optional(),
  store_email: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  owner_name: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  app_version: z.string().max(40).optional(),
  dev_contact: z.string().max(40).optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    label: z.string().max(200).default(""),
    base_url: z.string().max(300).default(""),
    control_secret: z.string().max(300).default(""),
    note: z.string().max(500).default(""),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().uuid(),
    label: z.string().max(200).optional(),
    base_url: z.string().max(300).optional(),
    control_secret: z.string().max(300).optional(),
    note: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("sync"), id: z.string().uuid() }),
  z.object({ action: z.literal("push"), id: z.string().uuid(), patch: storePatch }),
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

type StoreRow = Record<string, unknown> & {
  store_code?: string;
  store_name?: string;
  city?: string;
  expires_at?: string;
};

const publicColumns =
  "id,label,base_url,note,store_code,store_name,city,expires_at,last_synced_at,last_status,created_at";

async function remoteCall(
  row: { base_url: string; control_secret: string },
  init?: { method: "POST"; body: unknown },
) {
  const base = row.base_url.replace(/\/+$/, "");
  if (!base) throw new Error("Alamat aplikasi store belum diisi.");
  const url = `${base}/api/public/store-control`;
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "x-control-secret": row.control_secret,
      ...(init ? { "content-type": "application/json" } : {}),
    },
    ...(init ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!res.ok) throw new Error(`Store menolak (${res.status}).`);
  const json = (await res.json()) as { store: StoreRow | null };
  return json.store;
}

export const Route = createFileRoute("/api/public/store-registry")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorize(request)) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("developer_stores")
          .select(publicColumns)
          .order("created_at", { ascending: true });
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ stores: data ?? [] });
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
            .from("developer_stores")
            .insert(values as never)
            .select(publicColumns)
            .maybeSingle();
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ store: data });
        }

        if (body.action === "update") {
          const { action: _a, id, ...values } = body;
          const { data, error } = await supabaseAdmin
            .from("developer_stores")
            .update(values as never)
            .eq("id", id)
            .select(publicColumns)
            .maybeSingle();
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ store: data });
        }

        if (body.action === "delete") {
          const { error } = await supabaseAdmin
            .from("developer_stores")
            .delete()
            .eq("id", body.id);
          if (error) return new Response(error.message, { status: 500 });
          return Response.json({ ok: true });
        }

        // sync / push
        const { data: row, error: rowError } = await supabaseAdmin
          .from("developer_stores")
          .select("id,base_url,control_secret")
          .eq("id", body.id)
          .maybeSingle();
        if (rowError) return new Response(rowError.message, { status: 500 });
        if (!row) return new Response("Store tidak ditemukan", { status: 404 });

        const target = row as { id: string; base_url: string; control_secret: string };
        let remote: StoreRow | null = null;
        let status = "ok";
        try {
          remote =
            body.action === "push"
              ? await remoteCall(target, { method: "POST", body: body.patch })
              : await remoteCall(target);
        } catch (err) {
          status = err instanceof Error ? err.message : "Gagal terhubung";
        }

        const cache = {
          last_synced_at: new Date().toISOString(),
          last_status: status,
          ...(remote
            ? {
                store_code: remote.store_code ?? "",
                store_name: remote.store_name ?? "",
                city: remote.city ?? "",
                expires_at: remote.expires_at ?? null,
              }
            : {}),
        };

        const { data: updated, error: updateError } = await supabaseAdmin
          .from("developer_stores")
          .update(cache as never)
          .eq("id", target.id)
          .select(publicColumns)
          .maybeSingle();
        if (updateError) return new Response(updateError.message, { status: 500 });
        return Response.json({ store: updated, remote, status });
      },
    },
  },
});
