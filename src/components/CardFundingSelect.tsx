import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_FUNDING_METHODS, useBilling } from "@/lib/billing-store";

/**
 * Pilihan metode pembayaran untuk pembelian kartu baru dan top up saldo:
 * hanya cash, QRIS, dan transfer bank (sesuai tipe pembayaran yang aktif).
 */
export function CardFundingSelect({
  value,
  onChange,
  id,
  label = "Metode pembayaran",
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label?: string;
}) {
  const { paymentMethods } = useBilling();
  const active = paymentMethods.filter((m) => m.active).map((m) => m.name);
  const options = CARD_FUNDING_METHODS.filter(
    (name) =>
      active.some((item) => item.toLowerCase() === name.toLowerCase()) ||
      name === "Cash",
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Cash" />
        </SelectTrigger>
        <SelectContent>
          {options.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
