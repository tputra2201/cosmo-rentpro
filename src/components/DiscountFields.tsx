import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emptyItemDiscount, type ItemDiscount } from "@/lib/billing-store";

/**
 * Pengaturan potongan harga untuk satu barang/jasa yang dijual.
 * Dipakai di Manajemen Tarif (per jenis konsol) dan Kafe (per menu).
 */
export function DiscountFields({
  value,
  onChange,
  label,
  unitHint,
}: {
  value: ItemDiscount | undefined;
  onChange: (patch: Partial<ItemDiscount>) => void;
  label: string;
  unitHint: string;
}) {
  const current = { ...emptyItemDiscount, ...value };
  const isPercent = current.type === "percent";
  const suffix = isPercent ? "%" : unitHint;

  return (
    <div className="col-span-full mt-1 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
      <span className="text-xs text-muted-foreground">Potongan:</span>
      <Select
        value={current.type}
        onValueChange={(next) => onChange({ type: next as ItemDiscount["type"] })}
      >
        <SelectTrigger className="h-8 w-24" aria-label={`Jenis potongan ${label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fixed">Rupiah</SelectItem>
          <SelectItem value="percent">Persen</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Playing Card</span>
        <Input
          className="h-8 w-24"
          type="number"
          min={0}
          value={current.card}
          aria-label={`Potongan Playing Card ${label}`}
          onChange={(e) => onChange({ card: Math.max(0, Number(e.target.value) || 0) })}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Member</span>
        <Input
          className="h-8 w-24"
          type="number"
          min={0}
          value={current.member}
          aria-label={`Potongan member ${label}`}
          onChange={(e) => onChange({ member: Math.max(0, Number(e.target.value) || 0) })}
        />
      </div>
      <span className="text-xs text-muted-foreground">{suffix}</span>
    </div>
  );
}
