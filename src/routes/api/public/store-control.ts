import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Pusat kontrol Developer (jarak jauh).
 * Semua data store — termasuk tanggal kedaluwarsa — hanya bisa diubah lewat
 * endpoint ini, dengan header `x-control-secret` berisi DEVELOPER_CONTROL_SECRET.
 */

const payloadSchema = z.object({
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

export const Route = createFileRoute("/api/public/store-control")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorize(request)) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("store_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ store: data });
      },
      POST: async ({ request }) => {
        if (!authorize(request)) return new Response("Unauthorized", { status: 401 });
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const patch = parsed.data;
        if (Object.keys(patch).length === 0) {
          return new Response("No fields to update", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing } = await supabaseAdmin
          .from("store_settings")
          .select("id")
          .limit(1)
          .maybeSingle();

        const result = existing
          ? await supabaseAdmin
              .from("store_settings")
              .update(patch as never)
              .eq("id", (existing as { id: string }).id)
              .select("*")
              .maybeSingle()
          : await supabaseAdmin
              .from("store_settings")
              .insert(patch as never)
              .select("*")
              .maybeSingle();

        if (result.error) return new Response(result.error.message, { status: 500 });
        return Response.json({ store: result.data });
      },
    },
  },
});
