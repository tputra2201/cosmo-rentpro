import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, Save, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/kontrol")({
  head: () => ({
    meta: [
      { title: "Pusat Kontrol Developer — RentalPro" },
      {
        name: "description",
        content:
          "Halaman Developer untuk memantau masa aktif aplikasi store dan mengubah seluruh data store dari jarak jauh.",
      },
      { property: "og:title", content: "Pusat Kontrol Developer — RentalPro" },
      {
        property: "og:description",
        content: "Pantau masa aktif dan kelola data store RentalPro dari jarak jauh.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ControlCenter,
});

type StoreRow = {
  id: string;
  store_code: string;
  store_name: string;
  store_email: string;
  address: string;
  city: string;
  owner_name: string;
  phone: string;
  app_version: string;
  dev_contact: string;
  expires_at: string;
};

type Form = Omit<StoreRow, "id" | "expires_at"> & { expires_date: string };

const emptyForm: Form = {
  store_code: "",
  store_name: "",
  store_email: "",
  address: "",
  city: "",
  owner_name: "",
  phone: "",
  app_version: "v1.0",
  dev_contact: "",
  expires_date: "",
};

const fields: { key: keyof Form; label: string; type?: string; wide?: boolean }[] = [
  { key: "store_code", label: "Kode Store" },
  { key: "store_name", label: "Nama Store" },
  { key: "store_email", label: "Email Store", type: "email" },
  { key: "address", label: "Alamat lengkap", wide: true },
  { key: "city", label: "Kota" },
  { key: "owner_name", label: "Nama pemilik" },
  { key: "phone", label: "Nomor HP", type: "tel" },
  { key: "app_version", label: "Versi aplikasi" },
  { key: "dev_contact", label: "Nomor kontak developer", type: "tel" },
];

const toDateInput = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

function ControlCenter() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [store, setStore] = useState<StoreRow | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  useEffect(() => {
    const saved = sessionStorage.getItem("rentalpro-control-secret");
    if (saved) setSecret(saved);
  }, []);

  const applyStore = (row: StoreRow | null) => {
    setStore(row);
    if (!row) return;
    setForm({
      store_code: row.store_code ?? "",
      store_name: row.store_name ?? "",
      store_email: row.store_email ?? "",
      address: row.address ?? "",
      city: row.city ?? "",
      owner_name: row.owner_name ?? "",
      phone: row.phone ?? "",
      app_version: row.app_version || "v1.0",
      dev_contact: row.dev_contact ?? "",
      expires_date: row.expires_at ? toDateInput(row.expires_at) : "",
    });
  };

  const load = async (key: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/public/store-control", {
        headers: { "x-control-secret": key },
      });
      if (res.status === 401) {
        toast.error("Kunci Developer salah.");
        setUnlocked(false);
        return;
      }
      if (!res.ok) {
        toast.error("Gagal memuat data store.");
        return;
      }
      const json = (await res.json()) as { store: StoreRow | null };
      applyStore(json.store);
      setUnlocked(true);
      sessionStorage.setItem("rentalpro-control-secret", key);
    } catch {
      toast.error("Tidak bisa terhubung ke pusat kontrol.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (patch?: Record<string, string>) => {
    setBusy(true);
    try {
      const body: Record<string, string> = patch ?? {
        store_code: form.store_code,
        store_name: form.store_name,
        store_email: form.store_email,
        address: form.address,
        city: form.city,
        owner_name: form.owner_name,
        phone: form.phone,
        app_version: form.app_version,
        dev_contact: form.dev_contact,
      };
      if (!patch && form.expires_date) {
        const d = new Date(`${form.expires_date}T23:59:59`);
        if (!Number.isNaN(d.getTime())) body["expires_at"] = d.toISOString();
      }
      const res = await fetch("/api/public/store-control", {
        method: "POST",
        headers: { "content-type": "application/json", "x-control-secret": secret },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(res.status === 401 ? "Kunci Developer salah." : "Gagal menyimpan.");
        return;
      }
      const json = (await res.json()) as { store: StoreRow };
      applyStore(json.store);
      toast.success("Data store tersimpan.");
    } catch {
      toast.error("Tidak bisa terhubung ke pusat kontrol.");
    } finally {
      setBusy(false);
    }
  };

  const extend = (days: number) => {
    const base = store?.expires_at ? new Date(store.expires_at) : new Date();
    const start = base.getTime() > Date.now() ? base : new Date();
    const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    void save({ expires_at: next.toISOString() });
  };

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md">
        <div className="surface-panel grid gap-4 p-6">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-neon">
            <LockKeyhole className="size-5" /> Pusat Kontrol Developer
          </h1>
          <p className="text-sm text-muted-foreground">
            Masukkan kunci Developer untuk memantau dan mengatur data store.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="secret">Kunci Developer</Label>
            <Input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && secret && void load(secret)}
              placeholder="••••••••"
            />
          </div>
          <Button disabled={!secret || busy} onClick={() => void load(secret)}>
            <ShieldCheck className="size-4" /> Masuk pusat kontrol
          </Button>
        </div>
      </div>
    );
  }

  const days = store?.expires_at ? daysUntil(store.expires_at) : null;
  const statusLabel =
    days === null
      ? "Belum diatur"
      : days <= 0
        ? "Kedaluwarsa"
        : days <= 10
          ? `Segera berakhir (${days} hari)`
          : `Aktif (${days} hari lagi)`;
  const statusTone =
    days === null || days <= 0
      ? "text-destructive"
      : days <= 10
        ? "text-warning"
        : "text-success";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-neon">
            <ShieldCheck className="size-6" /> Pusat Kontrol Developer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau masa aktif aplikasi dan ubah seluruh data store dari sini.
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => void load(secret)}>
          <RefreshCw className="size-4" /> Muat ulang
        </Button>
      </div>

      <div className="surface-panel grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Store</p>
          <p className="font-display text-lg font-bold">
            {store?.store_name?.trim() || "Belum diisi"}
          </p>
          <p className="text-xs text-muted-foreground">
            {store?.store_code?.trim() || "tanpa kode"} · {store?.city?.trim() || "-"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Masa aktif sampai
          </p>
          <p className="font-display text-lg font-bold">
            {store?.expires_at
              ? new Date(store.expires_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "-"}
          </p>
          <p className={`text-xs font-semibold ${statusTone}`}>{statusLabel}</p>
        </div>
        <div className="grid content-start gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Perpanjang cepat
          </p>
          <div className="flex flex-wrap gap-2">
            {[30, 90, 365].map((d) => (
              <Button key={d} size="sm" variant="outline" disabled={busy} onClick={() => extend(d)}>
                +{d} hari
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
        {fields.map(({ key, label, type, wide }) => (
          <div key={key} className={`grid gap-2 ${wide ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type={type ?? "text"}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={label}
            />
          </div>
        ))}
        <div className="grid gap-2">
          <Label htmlFor="expires_date">Tanggal kedaluwarsa</Label>
          <Input
            id="expires_date"
            type="date"
            value={form.expires_date}
            onChange={(e) => setForm((f) => ({ ...f, expires_date: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Button disabled={busy} onClick={() => void save()}>
            <Save className="size-4" /> Simpan perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
