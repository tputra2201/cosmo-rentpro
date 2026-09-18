import { toast } from "sonner";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShiftGate } from "@/components/ShiftGate";
import {
  activePromos,
  formatRupiah,
  promoKind,
  promoKindLabel,
  useBilling,
  type Promotion,
} from "@/lib/billing-store";

/** Ringkasan isi promo supaya kasir tahu apa yang diberikan. */
function promoValue(promo: Promotion): string {
  switch (promoKind(promo)) {
    case "bonusHours":
      return `Bayar ${promo.payHours ?? 0} jam, bonus ${promo.bonusHours ?? 0} jam`;
    case "bogo":
      return `Beli ${promo.buyQty ?? 1}, gratis ${promo.freeMenuQty ?? 1}`;
    case "freeMenu":
      return `Main ${promo.minHours ?? 0} jam, dapat ${promo.freeMenuQty ?? 1} menu gratis`;
    default:
      return promo.type === "percent"
        ? `Diskon ${promo.value}%`
        : `Diskon ${formatRupiah(promo.value)}`;
  }
}

/**
 * Daftar promo yang tanggal & jamnya sedang berlaku.
 * Kasir bisa memberikan satu atau beberapa promo sekaligus ke TV / meja kafe.
 */
export function PromoPicker({
  target,
  promoIds,
}: {
  target: { type: "station" | "table"; id: string };
  promoIds?: string[];
}) {
  const { promotions, now, givePromo, cancelPromo } = useBilling();
  const { requireShift } = useShiftGate();

  const given = (promoIds ?? [])
    .map((id) => promotions.find((p) => p.id === id))
    .filter((p): p is Promotion => Boolean(p));
  const available = activePromos(promotions, now).filter(
    (promo) =>
      !given.some((g) => g.id === promo.id) &&
      // Bonus jam rental hanya masuk akal untuk sesi TV.
      !(target.type === "table" && promoKind(promo) === "bonusHours"),
  );

  if (available.length === 0 && given.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg bg-secondary/50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Gift className="size-4 text-primary" /> Promo Berlaku
      </p>

      {given.map((promo) => (
        <div key={promo.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{promoKindLabel(promoKind(promo))}</Badge>
            <span className="font-semibold">{promo.name}</span>
            <span className="text-xs text-muted-foreground">{promoValue(promo)}</span>
          </span>
          <button
            type="button"
            className="text-xs text-destructive underline-offset-2 hover:underline"
            onClick={() => {
              cancelPromo(target, promo.id);
              toast.success(`${promo.name} dibatalkan`);
            }}
          >
            Batalkan
          </button>
        </div>
      ))}

      {available.map((promo) => (
        <div key={promo.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{promoKindLabel(promoKind(promo))}</Badge>
            <span>{promo.name}</span>
            <span className="text-xs text-muted-foreground">{promoValue(promo)}</span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (!requireShift()) return;
              if (givePromo(target, promo.id)) toast.success(`${promo.name} diberikan`);
              else toast.error("Promo ini tidak bisa diberikan sekarang");
            }}
          >
            Berikan
          </Button>
        </div>
      ))}

      {available.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Semua promo yang berlaku sudah diberikan. Bisa lebih dari satu promo sekaligus.
        </p>
      )}
    </div>
  );
}
