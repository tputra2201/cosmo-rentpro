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
  type AddonMode,
  type ConsoleType,
  type RoundingRule,
  type StationAvailability,
} from "@/lib/billing-store";
import { DiscountFields } from "@/components/DiscountFields";
import { SortableArea, SortableItem } from "@/components/Sortable";


export const Route = createFileRoute("/_authenticated/tarif")({
  head: () => ({
    meta: [
      { title: "Setup Price — RentalPro" },
      {
        name: "description",
        content:
          "Atur tarif sewa per jam untuk PS3, PS4, dan PS5 serta daftar harga makanan dan minuman.",
      },
      { property: "og:title", content: "Setup Price — RentalPro" },
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
    setConsoleDiscount,
    consoleDiscounts,
    removeConsoleType,
    stations,
    addStation,
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
    reorderList,
    reorderConsoleTypes,
    addonRentals,
    addAddonRental,
    updateAddonRental,
    setAddonDiscount,
    removeAddonRental,
  } = useBilling();
  const [newAddon, setNewAddon] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [newAddonMode, setNewAddonMode] = useState<AddonMode>("hourly");
  const [packageName, setPackageName] = useState("");
  const [packageDuration, setPackageDuration] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [newConsole, setNewConsole] = useState("");
  const [newConsoleRate, setNewConsoleRate] = useState("");
  const [name, setName] = useState("");
  const [booth, setBooth] = useState("");
  const [consoleType, setConsoleType] = useState<ConsoleType>(
    consoleTypes[0] ?? "PS4",
  );


  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Setup Price</h1>
      </header>
      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Jenis Konsol & Tarif per Jam</h2>
        <p className="text-sm text-muted-foreground">
          Tambah, ubah nama, atau hapus jenis konsol beserta tarifnya. Potongan harga
          diisi per jam pemakaian; kalau pelanggan member sekaligus bayar dengan Playing
          Card, dipakai potongan yang paling besar.
        </p>
        <SortableArea
          ids={consoleTypes}
          onReorder={reorderConsoleTypes}
          className="mt-4 space-y-2"
        >
          {consoleTypes.map((c) => (
            <SortableItem
              key={c}
              id={c}
              label={`konsol ${c}`}
              className="rounded-lg bg-secondary/60 p-3"
              contentClassName="grid items-center gap-2 sm:grid-cols-[1fr_160px_auto_auto]"
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
              <DiscountFields
                label={c}
                unitHint="Rp / jam"
                value={consoleDiscounts[c]}
                onChange={(patch) => setConsoleDiscount(c, patch)}
              />
            </SortableItem>
          ))}
        </SortableArea>
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
        <h2 className="text-xl font-semibold">Additional Rental</h2>
        <p className="text-sm text-muted-foreground">
          Sewa tambahan di luar konsol (stik ekstra, VR, kursi, dan lain-lain). Pilih
          cara hitungnya: mengikuti lama pemakaian (per jam) atau sekali sewa. Item aktif
          bisa dipilih di panel TV saat transaksi dan masuk kategori
          “Additional Rental” di laporan.
        </p>
        <SortableArea
          ids={addonRentals.map((item) => item.id)}
          onReorder={(activeId, overId) => reorderList("addonRentals", activeId, overId)}
          className="mt-4 space-y-2"
        >
          {addonRentals.map((item) => (
            <SortableItem
              key={item.id}
              id={item.id}
              label={`additional rental ${item.name}`}
              className="rounded-lg bg-secondary/60 p-3"
              contentClassName="grid items-center gap-2 sm:grid-cols-[1fr_140px_150px_auto_auto_auto]"
            >
              <Input
                value={item.name}
                aria-label={`Nama ${item.name}`}
                onChange={(e) => updateAddonRental(item.id, { name: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                step={500}
                value={item.price}
                aria-label={`Harga ${item.name}`}
                onChange={(e) =>
                  updateAddonRental(item.id, { price: Number(e.target.value) || 0 })
                }
              />
              <Select
                value={item.mode}
                onValueChange={(v) => updateAddonRental(item.id, { mode: v as AddonMode })}
              >
                <SelectTrigger aria-label={`Cara hitung ${item.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Per jam</SelectItem>
                  <SelectItem value="once">Sekali sewa</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {formatRupiah(item.price)}
                {item.mode === "hourly" ? " / jam" : " / sewa"}
              </span>
              <Switch
                checked={item.active}
                onCheckedChange={(active) => updateAddonRental(item.id, { active })}
                aria-label={`Aktifkan ${item.name}`}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Hapus ${item.name}`}
                onClick={() => {
                  removeAddonRental(item.id);
                  toast.success(`${item.name} dihapus`);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
              <DiscountFields
                label={item.name}
                unitHint={item.mode === "hourly" ? "Rp / jam" : "Rp / sewa"}
                value={item.discount}
                onChange={(patch) => setAddonDiscount(item.id, patch)}
              />
            </SortableItem>
          ))}
        </SortableArea>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px_150px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addAddonRental(newAddon, Number(newAddonPrice) || 0, newAddonMode)) {
              toast.error("Nama item kosong");
              return;
            }
            toast.success(`${newAddon.trim()} ditambahkan`);
            setNewAddon("");
            setNewAddonPrice("");
          }}
        >
          <Input
            placeholder="Nama item (mis. Stik Ekstra, VR)"
            value={newAddon}
            onChange={(e) => setNewAddon(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            step={500}
            placeholder="Harga"
            value={newAddonPrice}
            onChange={(e) => setNewAddonPrice(e.target.value)}
          />
          <Select value={newAddonMode} onValueChange={(v) => setNewAddonMode(v as AddonMode)}>
            <SelectTrigger aria-label="Cara hitung item baru">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Per jam</SelectItem>
              <SelectItem value="once">Sekali sewa</SelectItem>
            </SelectContent>
          </Select>
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
        <SortableArea
          ids={packages.map((item) => item.id)}
          onReorder={(activeId, overId) => reorderList("packages", activeId, overId)}
          className="mt-4 space-y-2"
        >
          {packages.map((item) => <SortableItem key={item.id} id={item.id} label={`paket ${item.name}`} className="rounded-lg bg-secondary/60 p-3" contentClassName="grid items-center gap-2 sm:grid-cols-[1fr_120px_140px_auto_auto]"><Input value={item.name} onChange={(e) => updatePackage(item.id, { name: e.target.value })} aria-label={`Nama paket ${item.name}`} /><Input type="number" min={1} value={item.durationMin} onChange={(e) => updatePackage(item.id, { durationMin: Number(e.target.value) })} aria-label={`Durasi ${item.name}`} /><Input type="number" min={0} value={item.price} onChange={(e) => updatePackage(item.id, { price: Number(e.target.value) })} aria-label={`Harga khusus ${item.name}`} /><Switch checked={item.active} onCheckedChange={(active) => updatePackage(item.id, { active })} aria-label={`Aktifkan ${item.name}`} /><Button size="icon" variant="ghost" onClick={() => removePackage(item.id)} aria-label={`Hapus ${item.name}`}><Trash2 className="size-4" /></Button></SortableItem>)}
        </SortableArea>
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_140px_auto]" onSubmit={(e) => { e.preventDefault(); const minutes = Number(packageDuration); const packageCost = Number(packagePrice); if (!packageName.trim() || minutes <= 0) { toast.error("Lengkapi nama dan durasi paket"); return; } addPackage(packageName.trim(), minutes, packageCost); setPackageName(""); setPackageDuration(""); setPackagePrice(""); }}><Input placeholder="Nama paket" value={packageName} onChange={(e) => setPackageName(e.target.value)} /><Input type="number" min={1} placeholder="Menit" value={packageDuration} onChange={(e) => setPackageDuration(e.target.value)} /><Input type="number" min={0} placeholder="Harga khusus" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} /><Button type="submit"><Plus className="size-4" /> Tambah</Button></form>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Tambah Unit TV</h2>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Nomor / nama TV wajib diisi");
              return;
            }
            addStation({ name, booth, console: consoleType });
            setName("");
            setBooth("");
            toast.success("Unit ditambahkan");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="unit-name">Nomor / Nama TV</Label>
            <Input
              id="unit-name"
              placeholder="TV 07"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-booth">Room / Booth</Label>
            <Input
              id="unit-booth"
              placeholder="VIP 3"
              value={booth}
              onChange={(e) => setBooth(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-console">Konsol</Label>
            <Select
              value={consoleType}
              onValueChange={(v) => setConsoleType(v as ConsoleType)}
            >
              <SelectTrigger id="unit-console">
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
          </div>
          <Button type="submit" className="self-end">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>
      </section>

      <section className="surface-panel p-6">
        <div className="flex items-center gap-2">
          <Tv className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">
            Pengaturan Unit TV ({stations.length})
          </h2>
        </div>
        <SortableArea
          ids={stations.map((s) => s.id)}
          onReorder={(activeId, overId) => reorderList("stations", activeId, overId)}
          className="mt-4 grid gap-3 lg:grid-cols-2"
        >
          {stations.map((s) => (
            <SortableItem
              key={s.id}
              id={s.id}
              label={s.name}
              className="rounded-lg bg-secondary/60 p-3"
              contentClassName="grid items-end gap-2 sm:grid-cols-[1fr_1fr_110px_130px_auto]"
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nomor TV</Label>
                <Input
                  value={s.name}
                  onChange={(e) => updateStation(s.id, { name: e.target.value })}
                  aria-label={`Nama ${s.name}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Room</Label>
                <Input
                  value={s.booth}
                  onChange={(e) => updateStation(s.id, { booth: e.target.value })}
                  aria-label={`Room ${s.name}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Konsol</Label>
                <Select
                  value={s.console}
                  onValueChange={(v) => setStationConsole(s.id, v as ConsoleType)}
                >
                  <SelectTrigger aria-label={`Konsol ${s.name}`}>
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
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={s.availability}
                  disabled={Boolean(s.session)}
                  onValueChange={(v) =>
                    updateStation(s.id, {
                      availability: v as StationAvailability,
                    })
                  }
                >
                  <SelectTrigger aria-label={`Status ${s.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Tersedia</SelectItem>
                    <SelectItem value="booked">Reservasi</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  toast.success(`${s.name} dihapus`);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </SortableItem>
          ))}
        </SortableArea>
      </section>


    </div>
  );
}
