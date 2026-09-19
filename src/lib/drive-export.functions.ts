import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

const input = z.object({
  fileName: z.string().min(1).max(200),
  folderName: z.string().min(1).max(120),
  /** Isi berkas .xlsx dalam base64. */
  base64: z.string().min(1),
});

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !driveKey) {
    throw new Error("Google Drive belum terhubung untuk aplikasi ini.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": driveKey,
  };
}

async function gateway(path: string, init: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Google Drive gagal [${res.status}]: ${text}`);
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Sambungan Google Drive sudah kedaluwarsa. Minta pemilik akun menghubungkan ulang Google Drive di Lovable, lalu coba lagi.",
      );
    }
    throw new Error(`Google Drive menolak permintaan [${res.status}]: ${text}`);
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

/** Cari folder milik aplikasi, buat kalau belum ada. */
async function folderId(name: string, parent?: string) {
  const safe = name.replace(/'/g, "\\'");
  const q = [
    `mimeType='application/vnd.google-apps.folder'`,
    `name='${safe}'`,
    "trashed=false",
    parent ? `'${parent}' in parents` : null,
  ]
    .filter(Boolean)
    .join(" and ");
  const found = (await gateway(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`,
    { method: "GET" },
  )) as { files?: { id: string }[] };
  const hit = found.files?.[0]?.id;
  if (hit) return hit;
  const created = (await gateway("/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parent ? { parents: [parent] } : {}),
    }),
  })) as { id: string };
  return created.id;
}

/** Simpan berkas laporan Excel ke Google Drive pemilik usaha. */
export const uploadReportToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    const root = await folderId("RenToPlay Reports");
    const parent = await folderId(data.folderName, root);

    const boundary = `rtp${Math.random().toString(36).slice(2)}`;
    const meta = JSON.stringify({ name: data.fileName, parents: [parent] });
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      meta,
      `--${boundary}`,
      "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Transfer-Encoding: base64",
      "",
      data.base64,
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const file = (await gateway(
      "/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    )) as { id: string; name: string; webViewLink?: string };

    return {
      name: file.name,
      link: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
      folder: `RenToPlay Reports / ${data.folderName}`,
    };
  });
