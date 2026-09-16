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
  useBilling,
  type Promotion,
} from "@/lib/billing-store";
import { SetupHeading, SetupTable, DetailField } from "@/components/SetupTable";

export const Route = createFileRoute("/_authenticated/promo")({
  head: () => ({
    meta: [
      { title: "Promo — RenToPlay" },
      {
        name: "description",
        content:
          "Kelola promo dan happy hour rental PlayStation berdasarkan tanggal, jam, dan minimal transaksi.",
      },
      { property: "og:title", content: "Promo — RenToPlay" },
      {
        property: "og:description",
        content: "Atur diskon nominal atau persentase untuk transaksi rental dan kafe.",
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

function PromoPage() {
  const { promotions, addPromotion, updatePromotion, removePromotion, now } = useBilling();
  const [name, setName] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("0");
  const [startsAt, setStartsAt] = useState(dateValue(new Date()));
  const [endsAt, setEndsAt] = useState(dateValue(new Date(Date.now() + 30 * 86400000)));
  const [auto, setAuto] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const running = activeGlobalPromo(promotions, now);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Promo &amp; Happy Hour</h1>
        {running && (
          <p className="mt-2 text-sm font-semibold text-accent">
            Sedang berjalan: {running.name}
          </p>
        )}
      </header>

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="surface-panel space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const amount = Number(value);
            if (!name.trim() || amount <= 0) {
              toast.error("Lengkapi nama dan nilai promo");
              return;
            }
            addPromotion({
              name: name.trim(),
              type,
              value: amount,
              minSpend: Number(minSpend) || 0,
              maxDiscount: Number(maxDiscount) || 0,
              startsAt: new Date(`${startsAt}T00:00`).getTime(),
              endsAt: new Date(`${endsAt}T23:59`).getTime(),
              active: true,
              auto,
              ...(startTime ? { startTime } : {}),
              ...(endTime ? { endTime } : {}),
            });
            setName("");
            setValue("");
            toast.success("Promo ditambahkan");
          }}
        >
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Promo baru</h2>
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
                key: "value",
                header: "Nilai",
                render: (promo) => (
                  <span className="font-semibold text-accent">
                    {promo.type === "percent" ? `${promo.value}%` : formatRupiah(promo.value)}
                  </span>
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
                <DetailField label="Nilai promo">
                  <p className="font-display text-xl text-accent">
                    {promo.type === "percent" ? `${promo.value}%` : formatRupiah(promo.value)}
                  </p>
                </DetailField>
                <DetailField label="Minimal transaksi & maks. diskon">
                  <p className="text-sm text-muted-foreground">
                    Min. {formatRupiah(promo.minSpend)}
                    {promo.maxDiscount > 0 ? ` · Maks. ${formatRupiah(promo.maxDiscount)}` : ""}
                  </p>
                </DetailField>
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
