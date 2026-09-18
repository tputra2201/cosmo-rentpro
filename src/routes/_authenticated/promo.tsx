import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Percent, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  activeGlobalPromo,
  formatRupiah,
  promoKind,
  promoKindLabel,
  PROMO_KINDS,
  useBilling,
  type Promotion,
  type PromoKind,
} from "@/lib/billing-store";
import { SetupHeading, SetupTable, DetailField } from "@/components/SetupTable";

export const Route = createFileRoute("/_authenticated/promo")({
  head: () => ({
    meta: [
      { title: "Promo — RenToPlay" },
      {
        name: "description",
        content:
          "Kelola promo diskon, bonus jam rental, buy one get one kafe, dan menu gratis untuk rental PlayStation.",
      },
      { property: "og:title", content: "Promo — RenToPlay" },
      {
        property: "og:description",
        content: "Atur diskon, bonus jam, BOGO kafe, dan menu gratis untuk transaksi rental.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PromoPage,
});

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Ringkasan isi promo sesuai jenisnya. */
function promoSummary(promo: Promotion, menuName: (id?: string) => string) {
  switch (promoKind(promo)) {
    case "bonusHours":
      return `Bayar ${promo.payHours ?? 0} jam dapat ${promo.bonusHours ?? 0} jam`;
    case "bogo":
      return `Beli ${promo.buyQty ?? 1}× ${menuName(promo.buyMenuId)} gratis ${promo.freeMenuQty ?? 1}× ${menuName(promo.freeMenuId)}`;
    case "freeMenu":
      return `Main ${promo.minHours ?? 0} jam gratis ${promo.freeMenuQty ?? 1}× ${menuName(promo.freeMenuId)}`;
    default:
      return promo.type === "percent" ? `${promo.value}%` : formatRupiah(promo.value);
  }
}

function PromoPage() {
  const { promotions, addPromotion, updatePromotion, removePromotion, menu, now } = useBilling();
  const [kind, setKind] = useState<PromoKind>("discount");
  const [name, setName] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("0");
  const [payHours, setPayHours] = useState("2");
  const [bonusHours, setBonusHours] = useState("1");
  const [buyMenuId, setBuyMenuId] = useState("");
  const [buyQty, setBuyQty] = useState("1");
  const [freeMenuId, setFreeMenuId] = useState("");
  const [freeMenuQty, setFreeMenuQty] = useState("1");
  const [minHours, setMinHours] = useState("3");
  const [startsAt, setStartsAt] = useState(dateValue(new Date()));
  const [endsAt, setEndsAt] = useState(dateValue(new Date(Date.now() + 30 * 86400000)));
  const [auto, setAuto] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const running = activeGlobalPromo(promotions, now);
  const menuName = (id?: string) => menu.find((item) => item.id === id)?.name ?? "—";

  const submit = () => {
    if (!name.trim()) {
      toast.error("Lengkapi nama promo");
      return;
    }
    const period = {
      startsAt: new Date(`${startsAt}T00:00`).getTime(),
      endsAt: new Date(`${endsAt}T23:59`).getTime(),
      active: true,
      auto,
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
    };
    const base = {
      name: name.trim(),
      kind,
      type,
      value: 0,
      minSpend: 0,
      maxDiscount: 0,
      ...period,
    };

    if (kind === "discount") {
      const amount = Number(value);
      if (amount <= 0) {
        toast.error("Isi nilai diskonnya");
        return;
      }
      addPromotion({
        ...base,
        value: amount,
        minSpend: Number(minSpend) || 0,
        maxDiscount: Number(maxDiscount) || 0,
      });
    } else if (kind === "bonusHours") {
      if (Number(payHours) <= 0 || Number(bonusHours) <= 0) {
        toast.error("Isi jam bayar dan jam bonusnya");
        return;
      }
      addPromotion({ ...base, payHours: Number(payHours), bonusHours: Number(bonusHours) });
    } else if (kind === "bogo") {
      if (!buyMenuId || !freeMenuId) {
        toast.error("Pilih menu yang dibeli dan menu gratisnya");
        return;
      }
      addPromotion({
        ...base,
        buyMenuId,
        buyQty: Math.max(1, Number(buyQty) || 1),
        freeMenuId,
        freeMenuQty: Math.max(1, Number(freeMenuQty) || 1),
      });
    } else {
      if (!freeMenuId || Number(minHours) <= 0) {
        toast.error("Isi minimal jam main dan menu hadiahnya");
        return;
      }
      addPromotion({
        ...base,
        minHours: Number(minHours),
        freeMenuId,
        freeMenuQty: Math.max(1, Number(freeMenuQty) || 1),
      });
    }

    setName("");
    setValue("");
    toast.success("Promo ditambahkan");
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Promo &amp; Happy Hour</h1>
        {running && (
          <p className="mt-2 text-sm font-semibold text-accent">Sedang berjalan: {running.name}</p>
        )}
      </header>

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="surface-panel space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Promo baru</h2>
          </div>
          <div className="space-y-1.5">
            <Label>Jenis promo</Label>
            <Select value={kind} onValueChange={(item) => setKind(item as PromoKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMO_KINDS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PROMO_KINDS.find((item) => item.id === kind)?.hint}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-name">Nama promo</Label>
            <Input
              id="promo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Happy Hour"
            />
          </div>

          {kind === "discount" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Select value={type} onValueChange={(item) => setType(item as "percent" | "fixed")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persentase</SelectItem>
                    <SelectItem value="fixed">Nominal</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "percent" ? "10%" : "Rp"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Minimal transaksi</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Maks. diskon</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {kind === "bonusHours" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bayar (jam)</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={payHours}
                  onChange={(e) => setPayHours(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dapat bonus (jam)</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={bonusHours}
                  onChange={(e) => setBonusHours(e.target.value)}
                />
              </div>
            </div>
          )}

          {kind === "bogo" && (
            <>
              <div className="space-y-1.5">
                <Label>Menu yang dibeli</Label>
                <Select value={buyMenuId} onValueChange={setBuyMenuId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {menu.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kelipatan beli</Label>
                  <Input
                    type="number"
                    min={1}
                    value={buyQty}
                    onChange={(e) => setBuyQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jumlah gratis</Label>
                  <Input
                    type="number"
                    min={1}
                    value={freeMenuQty}
                    onChange={(e) => setFreeMenuQty(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {(kind === "bogo" || kind === "freeMenu") && (
            <div className="space-y-1.5">
              <Label>Menu gratis</Label>
              <Select value={freeMenuId} onValueChange={setFreeMenuId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih menu hadiah" />
                </SelectTrigger>
                <SelectContent>
                  {menu.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "freeMenu" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Minimal main (jam)</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={minHours}
                  onChange={(e) => setMinHours(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah menu gratis</Label>
                <Input
                  type="number"
                  min={1}
                  value={freeMenuQty}
                  onChange={(e) => setFreeMenuQty(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mulai tanggal</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sampai tanggal</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mulai jam</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sampai jam</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Jam dikosongkan berarti berlaku sepanjang hari.
          </p>
          <div className="flex items-center justify-between rounded-lg bg-secondary/60 p-3">
            <div>
              <p className="text-sm font-medium">Berlaku otomatis</p>
              <p className="text-xs text-muted-foreground">
                Langsung memotong tagihan tanpa dipilih kasir.
              </p>
            </div>
            <Switch checked={auto} onCheckedChange={setAuto} aria-label="Berlaku otomatis" />
          </div>
          <Button type="submit" className="w-full">
            <Percent className="size-4" /> Simpan Promo
          </Button>
        </form>

        <div className="surface-panel p-4 sm:p-6">
          <SetupHeading title="Daftar Promo" description="Kelola status dan detail tiap promo." />
          <SetupTable<Promotion>
            items={promotions}
            getId={(p) => p.id}
            getLabel={(p) => p.name}
            columns={[
              {
                key: "name",
                header: "Nama Promo",
                render: (promo) => (
                  <div>
                    <span className="font-bold text-foreground">{promo.name}</span>
                    {promo.auto && (
                      <Badge variant="outline" className="ml-2">
                        Otomatis
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                key: "kind",
                header: "Jenis",
                hideOnMobile: true,
                render: (promo) => (
                  <span className="text-sm text-muted-foreground">
                    {promoKindLabel(promoKind(promo))}
                  </span>
                ),
              },
              {
                key: "value",
                header: "Isi Promo",
                render: (promo) => (
                  <span className="font-semibold text-accent">{promoSummary(promo, menuName)}</span>
                ),
              },
              {
                key: "status",
                header: "Status",
                hideOnMobile: true,
                render: (promo) => {
                  const current = promo.active && promo.startsAt <= now && promo.endsAt >= now;
                  return (
                    <Badge variant={current ? "default" : "secondary"}>
                      {current ? "Berlaku" : promo.active ? "Di luar periode" : "Nonaktif"}
                    </Badge>
                  );
                },
              },
            ]}
            onRemove={(promo) => removePromotion(promo.id)}
            detailTitle={(promo) => promo.name}
            detailDescription={() => "Ubah nilai, periode, dan status promo."}
            emptyText="Belum ada promo."
            renderDetail={(promo) => (
              <>
                <DetailField label="Jenis promo">
                  <p className="text-sm font-semibold">{promoKindLabel(promoKind(promo))}</p>
                </DetailField>
                <DetailField label="Isi promo">
                  <p className="font-display text-xl text-accent">{promoSummary(promo, menuName)}</p>
                </DetailField>
                {promoKind(promo) === "discount" && (
                  <DetailField label="Minimal transaksi & maks. diskon">
                    <p className="text-sm text-muted-foreground">
                      Min. {formatRupiah(promo.minSpend)}
                      {promo.maxDiscount > 0 ? ` · Maks. ${formatRupiah(promo.maxDiscount)}` : ""}
                    </p>
                  </DetailField>
                )}
                <DetailField label="Periode berlaku">
                  <p className="text-sm text-muted-foreground">
                    {new Date(promo.startsAt).toLocaleDateString("id-ID")} –{" "}
                    {new Date(promo.endsAt).toLocaleDateString("id-ID")}
                    {promo.startTime || promo.endTime
                      ? ` · ${promo.startTime || "00:00"} – ${promo.endTime || "23:59"}`
                      : " · sepanjang hari"}
                  </p>
                </DetailField>
                <DetailField label="Status aktif">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={promo.active}
                      onCheckedChange={(active) => updatePromotion(promo.id, { active })}
                      aria-label={`Aktifkan ${promo.name}`}
                    />
                    {promo.active ? "Aktif" : "Nonaktif"}
                  </label>
                </DetailField>
              </>
            )}
          />
        </div>
      </section>
    </div>
  );
}
