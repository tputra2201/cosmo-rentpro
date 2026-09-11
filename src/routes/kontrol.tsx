import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { passwordSetupUrl } from "@/lib/app-url";
import {
  ShieldCheck,
  RefreshCw,
  Save,
  LockKeyhole,
  Plus,
  Trash2,
  Settings2,
  X,
  UserPlus,
  Users,
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
          "Halaman Developer untuk membuat store baru, memantau masa aktif, dan mengubah data seluruh store dari satu tempat.",
      },
      { property: "og:title", content: "Pusat Kontrol Developer — RentalPro" },
      {
        property: "og:description",
        content: "Kelola seluruh store RentalPro dan masa aktifnya dari satu halaman.",
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
  note: string;
  active: boolean;
  expires_at: string | null;
  members?: number;
};

type Form = {
  store_code: string;
  store_name: string;
  store_email: string;
  address: string;
  city: string;
  owner_name: string;
  phone: string;
  app_version: string;
  dev_contact: string;
  note: string;
  expires_date: string;
};

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
  note: "",
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
  { key: "note", label: "Catatan", wide: true },
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

const SECRET_KEY = "rentalpro-control-secret";

function ControlCenter() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [selected, setSelected] = useState<StoreRow | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [newStore, setNewStore] = useState({
    store_name: "",
    store_code: "",
    city: "",
    expires_date: "",
  });
  const [invite, setInvite] = useState({ email: "", full_name: "" });

  useEffect(() => {
    const saved = sessionStorage.getItem(SECRET_KEY);
    if (saved) setSecret(saved);
  }, []);

  const key = () => secret || sessionStorage.getItem(SECRET_KEY) || "";

  const load = async (provided?: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/public/store-registry", {
        headers: { "x-control-secret": provided ?? key() },
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
      const json = (await res.json()) as { stores: StoreRow[] };
      setStores(json.stores);
      setUnlocked(true);
      sessionStorage.setItem(SECRET_KEY, provided ?? key());
    } catch {
      toast.error("Tidak bisa terhubung ke pusat kontrol.");
    } finally {
      setBusy(false);
    }
  };

  const post = async (body: unknown, okMessage?: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/public/store-registry", {
        method: "POST",
        headers: { "x-control-secret": key(), "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error(
          res.status === 401 ? "Kunci Developer salah." : text || "Perintah gagal.",
        );
        return null;
      }
      const json = (await res.json()) as {
        store?: StoreRow;
        ok?: boolean;
        invited?: boolean;
      };
      if (json.store) {
        setStores((prev) => {
          const exists = prev.some((s) => s.id === json.store!.id);
          return exists
            ? prev.map((s) => (s.id === json.store!.id ? { ...s, ...json.store! } : s))
            : [...prev, json.store!];
        });
        setSelected((prev) =>
          prev && prev.id === json.store!.id ? { ...prev, ...json.store! } : prev,
        );
      }
      if (okMessage) toast.success(okMessage);
      return json;
    } catch {
      toast.error("Tidak bisa terhubung ke pusat kontrol.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addStore = async () => {
    if (!newStore.store_name.trim()) {
      toast.error("Nama store wajib diisi.");
      return;
    }
    const payload: Record<string, unknown> = {
      action: "create",
      store_name: newStore.store_name,
      store_code: newStore.store_code,
      city: newStore.city,
    };
    if (newStore.expires_date) {
      const d = new Date(`${newStore.expires_date}T23:59:59`);
      if (!Number.isNaN(d.getTime())) payload["expires_at"] = d.toISOString();
    }
    const json = await post(payload, "Store baru dibuat.");
    if (json?.store) {
      setNewStore({ store_name: "", store_code: "", city: "", expires_date: "" });
      openStore(json.store);
    }
  };

  const openStore = (row: StoreRow) => {
    setSelected(row);
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
      note: row.note ?? "",
      expires_date: row.expires_at ? toDateInput(row.expires_at) : "",
    });
    setInvite({ email: "", full_name: "" });
  };

  const saveStore = async () => {
    if (!selected) return;
    const payload: Record<string, unknown> = {
      action: "update",
      id: selected.id,
      store_code: form.store_code,
      store_name: form.store_name,
      store_email: form.store_email,
      address: form.address,
      city: form.city,
      owner_name: form.owner_name,
      phone: form.phone,
      app_version: form.app_version,
      dev_contact: form.dev_contact,
      note: form.note,
    };
    if (form.expires_date) {
      const d = new Date(`${form.expires_date}T23:59:59`);
      if (!Number.isNaN(d.getTime())) payload["expires_at"] = d.toISOString();
    }
    await post(payload, "Data store tersimpan.");
  };

  const extend = (row: StoreRow, days: number) =>
    void post(
      { action: "extend", id: row.id, days },
      `Masa aktif diperpanjang ${days} hari.`,
    );

  const removeStore = async (row: StoreRow) => {
    const json = await post({ action: "delete", id: row.id }, "Store dihapus.");
    if (json) {
      setStores((prev) => prev.filter((s) => s.id !== row.id));
      setSelected((prev) => (prev?.id === row.id ? null : prev));
    }
  };

  const assignAdmin = async () => {
    if (!selected || !invite.email.trim()) {
      toast.error("Email pengelola wajib diisi.");
      return;
    }
    const json = await post({
      action: "assign",
      id: selected.id,
      email: invite.email.trim(),
      full_name: invite.full_name.trim(),
      role: "installer",
      redirect_to: passwordSetupUrl(),
    });
    if (json?.ok) {
      toast.success(
        json.emailSent === "reset"
          ? "Akun ini sekarang mengelola store tersebut. Tautan buat sandi baru sudah dikirim ke emailnya."
          : "Undangan terkirim. Pengelola membuat sandi lewat tautan di email.",
      );
      setInvite({ email: "", full_name: "" });
      void load();
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
            Masukkan kunci Developer untuk membuat dan mengatur seluruh store.
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
            Satu aplikasi untuk semua store. Buat store baru, atur datanya, dan pantau
            masa aktifnya dari sini.
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          <RefreshCw className="size-4" /> Muat ulang
        </Button>
      </div>

      <div className="surface-panel grid gap-4 p-5">
        <h2 className="font-display text-lg font-bold">Buat store baru</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new_name">Nama store</Label>
            <Input
              id="new_name"
              value={newStore.store_name}
              onChange={(e) => setNewStore((s) => ({ ...s, store_name: e.target.value }))}
              placeholder="Cosmo Gaming Makassar"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new_code">Kode store</Label>
            <Input
              id="new_code"
              value={newStore.store_code}
              onChange={(e) => setNewStore((s) => ({ ...s, store_code: e.target.value }))}
              placeholder="CGM-01"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new_city">Kota</Label>
            <Input
              id="new_city"
              value={newStore.city}
              onChange={(e) => setNewStore((s) => ({ ...s, city: e.target.value }))}
              placeholder="Makassar"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new_exp">Masa aktif sampai</Label>
            <Input
              id="new_exp"
              type="date"
              value={newStore.expires_date}
              onChange={(e) =>
                setNewStore((s) => ({ ...s, expires_date: e.target.value }))
              }
            />
          </div>
        </div>
        <div>
          <Button disabled={busy} onClick={() => void addStore()}>
            <Plus className="size-4" /> Buat store
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {stores.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada store. Buat store pertama di atas.
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
                  {row.store_name?.trim() || "Store baru"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.store_code?.trim() || "tanpa kode"} · {row.city?.trim() || "-"} ·{" "}
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {row.members ?? 0} akun
                  </span>
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
                <Button size="sm" disabled={busy} onClick={() => openStore(row)}>
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
              Data store: {selected.store_name?.trim() || "-"}
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
              <X className="size-4" />
            </Button>
          </div>
          {fields.map(({ key: field, label, type, wide }) => (
            <div key={field} className={`grid gap-2 ${wide ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={field}>{label}</Label>
              <Input
                id={field}
                type={type ?? "text"}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
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

          <div className="grid gap-4 border-t border-border pt-4 sm:col-span-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="font-display text-base font-bold">
                Pengelola pertama store ini
              </h3>
              <p className="text-xs text-muted-foreground">
                Undangan dikirim ke email tersebut; dia membuat sandinya sendiri lalu
                menjadi Installer store ini.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv_email">Email pengelola</Label>
              <Input
                id="inv_email"
                type="email"
                value={invite.email}
                onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                placeholder="pemilik@contoh.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv_name">Nama pengelola</Label>
              <Input
                id="inv_name"
                value={invite.full_name}
                onChange={(e) => setInvite((s) => ({ ...s, full_name: e.target.value }))}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="sm:col-span-2">
              <Button variant="outline" disabled={busy} onClick={() => void assignAdmin()}>
                <UserPlus className="size-4" /> Kirim undangan pengelola
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
