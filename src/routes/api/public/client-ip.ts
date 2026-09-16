import { createFileRoute } from "@tanstack/react-router";

/** Memberi tahu perangkat alamat IP publiknya, dipakai untuk daftar IP yang diizinkan. */
export const Route = createFileRoute("/api/public/client-ip")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const forwarded = request.headers.get("x-forwarded-for") ?? "";
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-real-ip") ??
          (forwarded.split(",")[0] ?? "").trim() ??
          "";
        return Response.json(
          { ip: ip || "" },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
