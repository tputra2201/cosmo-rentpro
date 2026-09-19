import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  title: z.string().min(1).max(200),
  periodText: z.string().max(200).default(""),
  fileName: z.string().min(1).max(200),
  /** Isi berkas .xlsx dalam base64. */
  base64: z.string().min(1),
  extraEmail: z.string().trim().max(160).optional(),
});

const BUCKET = "reports";
const WEEK_SECONDS = 60 * 60 * 24 * 7;

function decodeBase64(base64: string) {
  const clean = base64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "laporan.xlsx";
}

/** Kirim laporan Excel ke email store lewat tautan unduh aman. */
export const emailReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: store } = await supabase
      .from("stores")
      .select("id, store_name, store_email")
      .limit(1)
      .maybeSingle();

    if (!store) throw new Error("Data store tidak ditemukan.");
    const recipient = (store.store_email ?? "").trim();
    if (!recipient) {
      throw new Error(
        "Email store belum diisi. Buka Setup → Store untuk mengisi Email Store.",
      );
    }

    const extra = (data.extraEmail ?? "").trim();
    if (extra && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extra)) {
      throw new Error("Alamat email tambahan tidak sah.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const stamp = now.getTime();
    const path = `${store.id}/${month}/${stamp}-${safeName(data.fileName)}`;

    const upload = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, decodeBase64(data.base64), {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
    if (upload.error) {
      console.error("Gagal menyimpan berkas laporan", upload.error);
      throw new Error("Gagal menyimpan berkas laporan. Coba lagi.");
    }

    const signed = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, WEEK_SECONDS);
    const downloadUrl = signed.data?.signedUrl;
    if (!downloadUrl) {
      console.error("Gagal membuat tautan unduh", signed.error);
      throw new Error("Gagal membuat tautan unduh laporan.");
    }

    const { sendTemplateEmail } = await import("./email-templates/send-email");

    const templateData = {
      storeName: store.store_name ?? "",
      reportTitle: data.title,
      periodText: data.periodText,
      createdAt: now.toLocaleString("id-ID", { timeZone: "Asia/Makassar" }),
      senderName: profile?.full_name ?? "",
      fileName: data.fileName,
      downloadUrl,
    };

    const targets = extra && extra !== recipient ? [recipient, extra] : [recipient];
    const results = await Promise.all(
      targets.map((to) =>
        sendTemplateEmail("report-ready", to, {
          templateData,
          idempotencyKey: `report-${store.id}-${stamp}-${to}`,
        }),
      ),
    );

    const suppressed = targets.filter((_, i) => !results[i]?.sent);
    return { recipients: targets, suppressed };
  });
