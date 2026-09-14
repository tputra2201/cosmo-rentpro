import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Store, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { useStoreInfo } from "@/lib/store-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Perkecil gambar agar ringan dan tetap tajam sebagai logo. */
async function toLogoDataUrl(file: File, max = 256) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tidak bisa memproses gambar");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

function LogoSection({
  storeId,
  logoUrl,
}: {
  storeId: string | undefined;
  logoUrl: string;
}) {
  const [secret, setSecret] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (logo: string) => {
    if (!storeId) return;
    if (!secret.trim()) {
      toast.error("Masukkan Kunci Developer terlebih dahulu.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/public/store-registry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-control-secret": secret.trim(),
        },
        body: JSON.stringify({ action: "update", id: storeId, logo_url: logo }),
      });
      if (!res.ok) {
        toast.error(
          res.status === 401
            ? "Kunci Developer salah."
            : "Gagal menyimpan logo. Coba lagi.",
        );
        return;
      }
      setPreview(logo);
      toast.success(logo ? "Logo store tersimpan." : "Logo store dihapus.");
    } catch {
      toast.error("Tidak ada koneksi ke server.");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5 MB.");
      return;
    }
    try {
      const data = await toLogoDataUrl(file);
      await save(data);
    } catch {
      toast.error("Gambar tidak bisa dibaca.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const current = preview ?? logoUrl;

  return (
    <div className="surface-panel grid gap-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ImageUp className="size-5" /> Logo Store
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo tampil di samping nama store pada bagian atas aplikasi. Hanya
          Developer yang bisa mengubahnya dengan memasukkan Kunci Developer.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {current ? (
          <img
            src={current}
            alt="Logo store"
            className="size-16 rounded-xl border border-border object-contain"
          />
        ) : (
          <div className="grid size-16 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            Kosong
          </div>
        )}
        <div className="grid flex-1 gap-2 sm:max-w-xs">
          <Label htmlFor="control-secret">Kunci Developer</Label>
          <Input
            id="control-secret"
            type="password"
            value={secret}
            autoComplete="off"
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Kunci Developer"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <Button
          disabled={busy || !storeId}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Menyimpan…" : "Unggah Logo"}
        </Button>
        {current && (
          <Button
            variant="outline"
            disabled={busy || !storeId}
            onClick={() => void save("")}
          >
            Hapus Logo
          </Button>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({
    meta: [
      { title: "Pengaturan Store — RentalPro" },
      {
        name: "description",
        content:
          "Installer mengisi identitas store: kode, nama, email, alamat, kota, pemilik, dan nomor HP.",
      },
      { property: "og:title", content: "Pengaturan Store — RentalPro" },
      {
        property: "og:description",
        content: "Data identitas outlet rental PlayStation yang diatur oleh Installer.",
      },
    ],
  }),
  component: StorePage,
});

type StoreForm = {
  store_code: string;
  store_name: string;
  store_email: string;
  address: string;
  city: string;
  owner_name: string;
  phone: string;
  app_version: string;
  dev_contact: string;
};

const empty: StoreForm = {
  store_code: "",
  store_name: "",
  store_email: "",
  address: "",
  city: "",
  owner_name: "",
  phone: "",
  app_version: "v1.0",
  dev_contact: "",
};

const fields: {
  key: keyof StoreForm;
  label: string;
  type?: string;
  wide?: boolean;
  hint?: string;
}[] = [
  { key: "store_code", label: "Kode Store" },
  { key: "store_name", label: "Nama Store" },
  { key: "store_email", label: "Email Store", type: "email" },
  { key: "address", label: "Alamat lengkap", wide: true },
  { key: "city", label: "Kota" },
  { key: "owner_name", label: "Nama pemilik" },
  { key: "phone", label: "Nomor HP", type: "tel" },
  {
    key: "app_version",
    label: "Versi aplikasi",
    hint: "Tampil di pojok kiri atas, contoh: v1.0",
  },
  {
    key: "dev_contact",
    label: "Nomor kontak developer",
    type: "tel",
    hint: "Contoh: 081282284411",
  },
];

function StorePage() {
  const { store, loading } = useStoreInfo(true);
  const form: StoreForm = store
    ? {
        store_code: store.store_code ?? "",
        store_name: store.store_name ?? "",
        store_email: store.store_email ?? "",
        address: store.address ?? "",
        city: store.city ?? "",
        owner_name: store.owner_name ?? "",
        phone: store.phone ?? "",
        app_version: store.app_version || "v1.0",
        dev_contact: store.dev_contact ?? "",
      }
    : empty;
  const expiresAt = store?.expires_at ?? null;

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-neon">
          <Store className="size-6" /> Data Store
        </h1>
      </div>

      <div className="surface-panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Masa aktif aplikasi sampai
          </p>
          <p className="font-display text-xl font-bold">{expiryLabel}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Perpanjangan dilakukan oleh Developer.
        </p>
      </div>

      <LogoSection storeId={store?.id} logoUrl={store?.logo_url ?? ""} />

      <div className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
        {loading && (
          <p className="text-sm text-muted-foreground sm:col-span-2">Memuat data store…</p>
        )}
        {!loading &&
          fields.map(({ key, label, type, wide, hint }) => (
            <div key={key} className={`grid gap-2 ${wide ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type={type ?? "text"}
                value={form[key]}
                readOnly
                disabled
                placeholder={label}
              />
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
          ))}
      </div>
    </div>
  );
}
