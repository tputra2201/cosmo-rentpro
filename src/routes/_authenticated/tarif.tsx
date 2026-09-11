import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  type RoundingRule,
  type StationAvailability,
} from "@/lib/billing-store";
import { ThemePicker } from "@/components/ThemePicker";


export const Route = createFileRoute("/_authenticated/tarif")({
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
    consoleTypes,
    addConsoleType,
    renameConsoleType,
    setConsoleRate,
    removeConsoleType,
    stations,
    setStationConsole,
    removeStation,
    updateStation,
    packages,
    addPackage,
    updatePackage,
    removePackage,
    roundingRule,
    setRoundingRule,
    defaultBonusMin,
    setDefaultBonusMin,
  } = useBilling();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [packageName, setPackageName] = useState("");
  const [packageDuration, setPackageDuration] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [newConsole, setNewConsole] = useState("");
  const [newConsoleRate, setNewConsoleRate] = useState("");


  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Manajemen Tarif</h1>
        <p className="mt-1 text-muted-foreground">
          Tarif tersimpan otomatis dan dipakai saat sesi baru dimulai.
        </p>
      </header>

      <ThemePicker />



      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Jenis Konsol & Tarif per Jam</h2>
        <p className="text-sm text-muted-foreground">
          Tambah, ubah nama, atau hapus jenis konsol beserta tarifnya.
        </p>
        <ul className="mt-4 space-y-2">
          {consoleTypes.map((c) => (
            <li
              key={c}
              className="grid items-center gap-2 rounded-lg bg-secondary/60 p-3 sm:grid-cols-[1fr_160px_auto_auto]"
            >
              <Input
                defaultValue={c}
                aria-label={`Nama konsol ${c}`}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (!next || next === c) {
                    e.target.value = c;
                    return;
                  }
                  if (!renameConsoleType(c, next)) {
                    e.target.value = c;
                    toast.error("Nama konsol sudah dipakai");
                  }
                }}
              />
              <Input
                type="number"
                min={0}
                step={500}
                value={rates[c] ?? 0}
                aria-label={`Tarif ${c}`}
                onChange={(e) => setConsoleRate(c, Number(e.target.value) || 0)}
              />
              <span className="text-xs text-muted-foreground">
                {formatRupiah(rates[c] ?? 0)} / jam
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Hapus ${c}`}
                onClick={() => {
                  if (!removeConsoleType(c))
                    toast.error(
                      "Konsol masih dipakai unit TV atau minimal satu konsol harus ada",
                    );
                  else toast.success(`Konsol ${c} dihapus`);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addConsoleType(newConsole, Number(newConsoleRate) || 0)) {
              toast.error("Nama konsol kosong atau sudah ada");
              return;
            }
            toast.success(`Konsol ${newConsole.trim()} ditambahkan`);
            setNewConsole("");
            setNewConsoleRate("");
          }}
        >
          <Input
            placeholder="Nama konsol (mis. PS2, Nintendo)"
            value={newConsole}
            onChange={(e) => setNewConsole(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            step={500}
            placeholder="Tarif / jam"
            value={newConsoleRate}
            onChange={(e) => setNewConsoleRate(e.target.value)}
          />
          <Button type="submit">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>
      </section>

      <section className="surface-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Paket Rental</h2><p className="text-sm text-muted-foreground">Paket aktif muncul saat memulai sesi.</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="default-bonus" className="text-sm text-muted-foreground">Waktu ekstra default (menit)</Label>
              <Input id="default-bonus" type="number" className="w-24" value={defaultBonusMin} onChange={(e) => setDefaultBonusMin(Number(e.target.value) || 0)} />
            </div>
            <Select value={roundingRule} onValueChange={(value) => setRoundingRule(value as RoundingRule)}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minute">Hitung per menit</SelectItem><SelectItem value="30-minutes">Bulatkan 30 menit</SelectItem><SelectItem value="hour">Bulatkan per jam</SelectItem></SelectContent></Select>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {packages.map((item) => <li key={item.id} className="grid items-center gap-2 rounded-lg bg-secondary/60 p-3 sm:grid-cols-[1fr_120px_140px_auto_auto]"><Input value={item.name} onChange={(e) => updatePackage(item.id, { name: e.target.value })} aria-label={`Nama paket ${item.name}`} /><Input type="number" min={1} value={item.durationMin} onChange={(e) => updatePackage(item.id, { durationMin: Number(e.target.value) })} aria-label={`Durasi ${item.name}`} /><Input type="number" min={0} value={item.price} onChange={(e) => updatePackage(item.id, { price: Number(e.target.value) })} aria-label={`Harga khusus ${item.name}`} /><Switch checked={item.active} onCheckedChange={(active) => updatePackage(item.id, { active })} aria-label={`Aktifkan ${item.name}`} /><Button size="icon" variant="ghost" onClick={() => removePackage(item.id)} aria-label={`Hapus ${item.name}`}><Trash2 className="size-4" /></Button></li>)}
        </ul>
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_140px_auto]" onSubmit={(e) => { e.preventDefault(); const minutes = Number(packageDuration); const packageCost = Number(packagePrice); if (!packageName.trim() || minutes <= 0) { toast.error("Lengkapi nama dan durasi paket"); return; } addPackage(packageName.trim(), minutes, packageCost); setPackageName(""); setPackageDuration(""); setPackagePrice(""); }}><Input placeholder="Nama paket" value={packageName} onChange={(e) => setPackageName(e.target.value)} /><Input type="number" min={1} placeholder="Menit" value={packageDuration} onChange={(e) => setPackageDuration(e.target.value)} /><Input type="number" min={0} placeholder="Harga khusus" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} /><Button type="submit"><Plus className="size-4" /> Tambah</Button></form>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Konsol per TV</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((s) => (
            <div
              key={s.id}
               className="grid gap-2 rounded-lg bg-secondary/60 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
               <div className="grid grid-cols-2 gap-2 sm:block"><Input value={s.name} onChange={(e) => updateStation(s.id, { name: e.target.value })} aria-label={`Nama ${s.name}`} /><Input value={s.booth} onChange={(e) => updateStation(s.id, { booth: e.target.value })} aria-label={`Booth ${s.name}`} className="sm:mt-2" /></div>
              <Select
                value={s.console}
                onValueChange={(v) => setStationConsole(s.id, v as ConsoleType)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consoleTypes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Select value={s.availability} onValueChange={(value) => updateStation(s.id, { availability: value as StationAvailability })} disabled={Boolean(s.session)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">Tersedia</SelectItem><SelectItem value="booked">Booking</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent></Select>
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

    </div>
  );
}
