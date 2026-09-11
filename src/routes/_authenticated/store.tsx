import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { useStoreInfo } from "@/lib/store-info";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({
    meta: [
      { title: "Pengaturan Store — Billing Rental PS" },
      {
        name: "description",
        content:
          "Installer mengisi identitas store: kode, nama, email, alamat, kota, pemilik, dan nomor HP.",
      },
      { property: "og:title", content: "Pengaturan Store — Billing Rental PS" },
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
        <p className="mt-1 text-sm text-muted-foreground">
          Identitas outlet ini beserta masa aktif aplikasi. Semua data hanya
          bisa diubah oleh Developer dari pusat kontrol jarak jauh.
        </p>
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
