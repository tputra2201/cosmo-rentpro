import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatRupiah, useBilling } from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/pembayaran")({
  head: () => ({
    meta: [
      { title: "Pengaturan Pembayaran — RentalPro" },
      {
        name: "description",
        content:
          "Atur tipe pembayaran rental PS: cash, QRIS, gift card, transfer bank, compliment, dan tipe lain yang bisa ditambah atau diubah kapan saja.",
      },
      {
        property: "og:title",
        content: "Pengaturan Pembayaran — RentalPro",
      },
      {
        property: "og:description",
        content:
          "Kelola daftar tipe pembayaran yang muncul saat pelanggan menyelesaikan sesi bermain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PembayaranPage,
});

function PembayaranPage() {
  const {
    paymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
    history,
  } = useBilling();
  const [name, setName] = useState("");

  const todayKey = new Date().toDateString();
  const today = history.filter(
    (h) => new Date(h.endAt).toDateString() === todayKey,
  );
  const perMethod = paymentMethods.map((p) => ({
    ...p,
    total: today
      .filter((h) => (h.payment ?? "Cash") === p.name)
      .reduce((s, h) => s + h.total, 0),
  }));

  const handleAdd = () => {
    const value = name.trim();
    if (!value) return;
    if (
      paymentMethods.some((p) => p.name.toLowerCase() === value.toLowerCase())
    ) {
      toast.error("Tipe pembayaran itu sudah ada");
      return;
    }
    addPaymentMethod(value);
    setName("");
    toast.success(`${value} ditambahkan`);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Pengaturan Pembayaran</h1>
        <p className="mt-1 text-muted-foreground">
          Tipe pembayaran yang aktif akan muncul saat mengakhiri sesi bermain.
        </p>
      </header>

      <section className="surface-panel space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-52 flex-1 space-y-1.5">
            <label htmlFor="pm-name" className="text-sm font-medium">
              Tambah tipe pembayaran
            </label>
            <Input
              id="pm-name"
              value={name}
              placeholder="Misal: OVO, Dana, Voucher Member"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="size-4" /> Tambah
          </Button>
        </div>

        <ul className="space-y-2">
          {paymentMethods.length === 0 && (
            <li className="rounded-md bg-secondary px-3 py-6 text-center text-sm text-muted-foreground">
              Belum ada tipe pembayaran.
            </li>
          )}
          {perMethod.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2.5"
            >
              <Wallet className="size-4 shrink-0 text-primary" />
              <Input
                value={p.name}
                onChange={(e) =>
                  updatePaymentMethod(p.id, { name: e.target.value })
                }
                className="h-9 min-w-40 flex-1"
                aria-label={`Nama tipe pembayaran ${p.name}`}
              />
              <span className="text-sm text-muted-foreground">
                Hari ini: {formatRupiah(p.total)}
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={p.active}
                  onCheckedChange={(v) =>
                    updatePaymentMethod(p.id, { active: v })
                  }
                  aria-label={`Aktifkan ${p.name}`}
                />
                <span className="w-16 text-sm text-muted-foreground">
                  {p.active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Hapus ${p.name}`}
                onClick={() => {
                  removePaymentMethod(p.id);
                  toast.success(`${p.name} dihapus`);
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
