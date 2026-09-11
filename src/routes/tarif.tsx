import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatRupiah,
  useBilling,
  type ConsoleType,
} from "@/lib/billing-store";

export const Route = createFileRoute("/tarif")({
  head: () => ({
    meta: [
      { title: "Manajemen Tarif — Billing Rental PS" },
      {
        name: "description",
        content:
          "Atur tarif sewa per jam untuk PS3, PS4, dan PS5 serta daftar harga makanan dan minuman.",
      },
      { property: "og:title", content: "Manajemen Tarif — Billing Rental PS" },
      {
        property: "og:description",
        content: "Atur tarif per jam tiap konsol dan harga menu kasir.",
      },
    ],
  }),
  component: TarifPage,
});

function TarifPage() {
  const {
    rates,
    setRates,
    menu,
    addMenuItem,
    removeMenuItem,
    stations,
    setStationConsole,
    removeStation,
  } = useBilling();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Manajemen Tarif</h1>
        <p className="mt-1 text-muted-foreground">
          Tarif tersimpan otomatis dan dipakai saat sesi baru dimulai.
        </p>
      </header>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Tarif per Jam</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["PS3", "PS4", "PS5"] as ConsoleType[]).map((c) => (
            <div key={c} className="space-y-2">
              <Label htmlFor={`rate-${c}`}>{c}</Label>
              <Input
                id={`rate-${c}`}
                type="number"
                min={0}
                step={500}
                value={rates[c]}
                onChange={(e) =>
                  setRates({ ...rates, [c]: Number(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                {formatRupiah(rates[c])} / jam
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Konsol per TV</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-lg bg-secondary/60 p-3"
            >
              <span className="w-16 font-display font-semibold">{s.name}</span>
              <Select
                value={s.console}
                onValueChange={(v) => setStationConsole(s.id, v as ConsoleType)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["PS3", "PS4", "PS5"] as ConsoleType[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Hapus ${s.name}`}
                onClick={() => {
                  if (s.session) {
                    toast.error(`${s.name} sedang dipakai`);
                    return;
                  }
                  removeStation(s.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Menu Makanan &amp; Minuman</h2>
        <ul className="mt-4 space-y-2">
          {menu.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg bg-secondary/60 px-4 py-2.5"
            >
              <span>{m.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {formatRupiah(m.price)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Hapus ${m.name}`}
                  onClick={() => removeMenuItem(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const p = Number(price);
            if (!name.trim() || !(p > 0)) {
              toast.error("Isi nama menu dan harga yang valid");
              return;
            }
            addMenuItem(name.trim(), p);
            setName("");
            setPrice("");
            toast.success("Menu ditambahkan");
          }}
        >
          <Input
            placeholder="Nama menu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48 flex-1"
          />
          <Input
            type="number"
            min={0}
            placeholder="Harga"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-32"
          />
          <Button type="submit">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>
      </section>
    </div>
  );
}
