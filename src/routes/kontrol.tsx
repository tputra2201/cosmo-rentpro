import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  RefreshCw,
  Save,
  LockKeyhole,
  Plus,
  Trash2,
  Settings2,
  X,
} from "lucide-react";
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
          "Halaman Developer untuk memantau masa aktif seluruh aplikasi store dan mengubah data store dari jarak jauh.",
      },
      { property: "og:title", content: "Pusat Kontrol Developer — RentalPro" },
      {
        property: "og:description",
        content: "Pantau masa aktif dan kelola seluruh store RentalPro dari jarak jauh.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ControlCenter,
});

type RegistryRow = {
  id: string;
  label: string;
  base_url: string;
  note: string;
  store_code: string;
  store_name: string;
  city: string;
  expires_at: string | null;
  last_synced_at: string | null;
  last_status: string;
};

type StoreRow = {
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

type Form = Omit<StoreRow, "expires_at"> & { expires_date: string };

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

const statusOf = (iso: string | null) => {
  if (!iso) return { text: "Belum diketahui", tone: "text-muted-foreground" };
  const days = daysUntil(iso);
  if (days <= 0) return { text: "Kedaluwarsa", tone: "text-destructive" };
  if (days <= 10) return { text: `Segera berakhir (${days} hari)`, tone: "text-warning" };
  return { text: `Aktif (${days} hari lagi)`, tone: "text-success" };
};

function ControlCenter() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stores, setStores] = useState<RegistryRow[]>([]);
  const [selected, setSelected] = useState<RegistryRow | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [newStore, setNewStore] = useState({
    label: "",
    base_url: "",
    control_secret: "",
    note: "",
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("rentalpro-control-secret");
    if (saved) setSecret(saved);
  }, []);

  const request = async (init?: RequestInit) => {
    const res = await fetch("/api/public/store-registry", {
      ...init,
      headers: {
        "x-control-secret": secret || sessionStorage.getItem("rentalpro-control-secret") || "",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
    return res;
  };

  const load = async (key?: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/public/store-registry", {
        headers: { "x-control-secret": key ?? secret },
      });
      if (res.status === 401) {
        toast.error("Kunci Developer salah.");
        setUnlocked(false);
        return;
      }
      if (!res.ok) {
        toast.error("Gagal memuat daftar store.");
        return;
      }
      const json = (await res.json()) as { stores: RegistryRow[] };
      setStores(json.stores);
      setUnlocked(true);
      sessionStorage.setItem("rentalpro-control-secret", key ?? secret);
    } catch {
      toast.error("Tidak bisa terhubung ke pusat kontrol.");
    } finally {
      setBusy(false);
    }
  };

  const post = async (body: unknown, okMessage?: string) => {
    setBusy(true);
    try {
      const res = await request({ method: "POST", body: JSON.stringify(body) });
      if (!res.ok) {
        toast.error(res.status === 401 ? "Kunci Developer salah." : "Perintah gagal dijalankan.");
        return null;
      }
      const json = (await res.json()) as {
        store?: RegistryRow;
        remote?: StoreRow | null;
        status?: string;
        ok?: boolean;
      };
      if (json.store) {
        setStores((prev) => {
          const exists = prev.some((s) => s.id === json.store!.id);
          return exists
            ? prev.map((s) => (s.id === json.store!.id ? json.store! : s))
            : [...prev, json.store!];
        });
        setSelected((prev) => (prev && prev.id === json.store!.id ? json.store! : prev));
      }
      if (json.status && json.status !== "ok") toast.error(json.status);
      else if (okMessage) toast.success(okMessage);
      return json;
    } catch {
      toast.error("Tidak bisa terhubung ke pusat kontrol.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addStore = async () => {
    if (!newStore.base_url.trim() || !newStore.control_secret.trim()) {
      toast.error("Alamat aplikasi dan kunci kontrol store wajib diisi.");
      return;
    }
    const json = await post({ action: "create", ...newStore }, "Store ditambahkan.");
    if (json?.store) {
      setNewStore({ label: "", base_url: "", control_secret: "", note: "" });
      void post({ action: "sync", id: json.store.id });
    }
  };

  const openStore = async (row: RegistryRow) => {
    setSelected(row);
    setForm(emptyForm);
    const json = await post({ action: "sync", id: row.id });
    const remote = json?.remote;
    if (!remote) return;
    setForm({
      store_code: remote.store_code ?? "",
      store_name: remote.store_name ?? "",
      store_email: remote.store_email ?? "",
      address: remote.address ?? "",
      city: remote.city ?? "",
      owner_name: remote.owner_name ?? "",
      phone: remote.phone ?? "",
      app_version: remote.app_version || "v1.0",
      dev_contact: remote.dev_contact ?? "",
      expires_date: remote.expires_at ? toDateInput(remote.expires_at) : "",
    });
  };

  const saveStore = async () => {
    if (!selected) return;
    const patch: Record<string, string> = {
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
    if (form.expires_date) {
      const d = new Date(`${form.expires_date}T23:59:59`);
      if (!Number.isNaN(d.getTime())) patch["expires_at"] = d.toISOString();
    }
    await post({ action: "push", id: selected.id, patch }, "Data store tersimpan.");
  };

  const extend = (row: RegistryRow, days: number) => {
    const base = row.expires_at ? new Date(row.expires_at) : new Date();
    const start = base.getTime() > Date.now() ? base : new Date();
    const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    void post(
      { action: "push", id: row.id, patch: { expires_at: next.toISOString() } },
      `Masa aktif diperpanjang ${days} hari.`,
    );
  };

  const removeStore = async (row: RegistryRow) => {
    const json = await post({ action: "delete", id: row.id }, "Store dihapus dari daftar.");
    if (json) {
      setStores((prev) => prev.filter((s) => s.id !== row.id));
      setSelected((prev) => (prev?.id === row.id ? null : prev));
    }
  };

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md">
        <div className="surface-panel grid gap-4 p-6">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-neon">
            <LockKeyhole className="size-5" /> Pusat Kontrol Developer
          </h1>
          <p className="text-sm text-muted-foreground">
            Masukkan kunci Developer untuk memantau dan mengatur seluruh store.
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-neon">
            <ShieldCheck className="size-6" /> Pusat Kontrol Developer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau masa aktif seluruh aplikasi store dan ubah datanya dari jarak jauh.
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          <RefreshCw className="size-4" /> Muat ulang
        </Button>
      </div>

      <div className="surface-panel grid gap-4 p-5">
        <h2 className="font-display text-lg font-bold">Tambah store</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="label">Nama panggilan store</Label>
            <Input
              id="label"
              value={newStore.label}
              onChange={(e) => setNewStore((s) => ({ ...s, label: e.target.value }))}
              placeholder="Cosmo Gaming Makassar"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="base_url">Alamat aplikasi store</Label>
            <Input
              id="base_url"
              value={newStore.base_url}
              onChange={(e) => setNewStore((s) => ({ ...s, base_url: e.target.value }))}
              placeholder="https://nama-store.lovable.app"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="control_secret">Kunci kontrol store</Label>
            <Input
              id="control_secret"
              type="password"
              value={newStore.control_secret}
              onChange={(e) => setNewStore((s) => ({ ...s, control_secret: e.target.value }))}
              placeholder="kunci milik aplikasi store itu"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Catatan</Label>
            <Input
              id="note"
              value={newStore.note}
              onChange={(e) => setNewStore((s) => ({ ...s, note: e.target.value }))}
              placeholder="opsional"
            />
          </div>
        </div>
        <div>
          <Button disabled={busy} onClick={() => void addStore()}>
            <Plus className="size-4" /> Tambah store
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {stores.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada store terdaftar. Tambahkan store di atas.
          </p>
        )}
        {stores.map((row) => {
          const status = statusOf(row.expires_at);
          return (
            <div
              key={row.id}
              className="surface-panel grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="font-display text-lg font-bold">
                  {row.store_name?.trim() || row.label?.trim() || "Store baru"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.store_code?.trim() || "tanpa kode"} · {row.city?.trim() || "-"} ·{" "}
                  {row.base_url || "alamat belum diisi"}
                </p>
                <p className={`text-xs font-semibold ${status.tone}`}>
                  {status.text}
                  {row.expires_at
                    ? ` · sampai ${new Date(row.expires_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`
                    : ""}
                  {row.last_status && row.last_status !== "ok" ? ` · ${row.last_status}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[30, 90, 365].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => extend(row, d)}
                  >
                    +{d} hari
                  </Button>
                ))}
                <Button size="sm" disabled={busy} onClick={() => void openStore(row)}>
                  <Settings2 className="size-4" /> Kelola
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void removeStore(row)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2">
            <h2 className="font-display text-lg font-bold">
              Data store: {selected.store_name?.trim() || selected.label?.trim() || "-"}
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
              <X className="size-4" />
            </Button>
          </div>
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
            <Button disabled={busy} onClick={() => void saveStore()}>
              <Save className="size-4" /> Simpan perubahan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
