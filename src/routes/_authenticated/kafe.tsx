import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah, useBilling } from "@/lib/billing-store";
import { tableTotal } from "@/components/CafeTables";

export const Route = createFileRoute("/_authenticated/kafe")({
  head: () => ({
    meta: [
      { title: "Pengaturan Meja Kafe — Billing Rental PS" },
      {
        name: "description",
        content:
          "Atur nomor meja, area, dan jumlah kursi untuk layanan kafe tanpa rental PlayStation.",
      },
      { property: "og:title", content: "Pengaturan Meja Kafe" },
      {
        property: "og:description",
        content: "Tambah, ubah, atau hapus nomor meja kafe beserta area dan jumlah kursi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KafePage,
});

function KafePage() {
  const { cafeTables, addCafeTable, updateCafeTable, removeCafeTable } = useBilling();

  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newSeats, setNewSeats] = useState("");

  const openTables = cafeTables.filter((t) => t.orders.length > 0 || t.openedAt);
  const grandTotal = openTables.reduce((sum, t) => sum + tableTotal(t), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Pengaturan Meja Kafe</h1>
          <p className="mt-1 text-muted-foreground">
            Kartu meja dan pesanan kini ada di Dashboard. Di sini Anda mengatur daftar
            mejanya.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{openTables.length} meja terisi</p>
          <p className="text-xl font-bold text-neon">{formatRupiah(grandTotal)}</p>
        </div>
      </header>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Tambah Meja</h2>
        <p className="text-sm text-muted-foreground">
          Nomor meja, area, dan jumlah kursi bisa diubah kapan saja.
        </p>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            addCafeTable({
              name: newName,
              area: newArea,
              seats: Number(newSeats) || 2,
            });
            setNewName("");
            setNewArea("");
            setNewSeats("");
            toast.success("Meja ditambahkan");
          }}
        >
          <Input
            placeholder="Nomor meja (mis. Meja 05)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Area (Indoor / Outdoor)"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
          />
          <Input
            type="number"
            min={1}
            placeholder="Kursi"
            value={newSeats}
            onChange={(e) => setNewSeats(e.target.value)}
          />
          <Button type="submit">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>

        <ul className="mt-4 space-y-2">
          {cafeTables.map((t) => (
            <li
              key={t.id}
              className="grid gap-2 rounded-lg bg-secondary/60 p-3 sm:grid-cols-[1fr_1fr_120px_auto]"
            >
              <Input
                value={t.name}
                aria-label={`Nomor ${t.name}`}
                onChange={(e) => updateCafeTable(t.id, { name: e.target.value })}
              />
              <Input
                value={t.area}
                aria-label={`Area ${t.name}`}
                onChange={(e) => updateCafeTable(t.id, { area: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                value={t.seats}
                aria-label={`Kursi ${t.name}`}
                onChange={(e) =>
                  updateCafeTable(t.id, { seats: Number(e.target.value) || 1 })
                }
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!removeCafeTable(t.id)) {
                    toast.error(`${t.name} masih terisi`);
                    return;
                  }
                  toast.success(`${t.name} dihapus`);
                }}
              >
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
