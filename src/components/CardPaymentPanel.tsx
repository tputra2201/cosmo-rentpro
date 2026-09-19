import { useState } from "react";
import { Link2, PlusCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
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
import { CardScanInput } from "@/components/CardScanInput";
import { CardFundingSelect } from "@/components/CardFundingSelect";
import { findCardByNumber, formatRupiah, useBilling } from "@/lib/billing-store";

/**
 * Panel pengecekan Playing Card saat pembayaran:
 * cek pendaftaran kartu, tampilkan pemegang & saldo, dan top up langsung.
 */
export function CardPaymentPanel({
  cardNumber,
  onCardNumberChange,
  need,
  discount = 0,
  inputId = "pay-card-number",
}: {
  cardNumber: string;
  onCardNumberChange: (value: string) => void;
  need: number;
  discount?: number;
  inputId?: string;
}) {
  const { playingCards, topupCard, updatePlayingCard } = useBilling();
  const card = findCardByNumber(playingCards, cardNumber);
  const shortage = card ? Math.max(0, need - card.balance) : 0;
  const notEnough = Boolean(card && card.balance + 0.5 < need);
  const [topup, setTopup] = useState("");
  const [topupPay, setTopupPay] = useState("Cash");
  const [linkId, setLinkId] = useState("");

  const linkUid = () => {
    const target = playingCards.find((c) => c.id === linkId);
    const uid = cardNumber.trim().toUpperCase();
    if (!target || !uid) return;
    updatePlayingCard(target.id, { cardUid: uid });
    setLinkId("");
    toast.success(`Nomor ${uid} ditautkan ke kartu ${target.cardNumber}`, {
      description: "Tap berikutnya langsung dikenali.",
    });
  };


  const doTopup = () => {
    if (!card) return;
    const amount = Math.round(Number(topup) || 0);
    if (amount <= 0) {
      toast.error("Nominal top up harus lebih dari 0");
      return;
    }
    if (!topupCard(card.id, amount, "Top up saat pembayaran", topupPay)) {
      toast.error("Top up gagal diproses");
      return;
    }
    setTopup("");
    toast.success(`Top up ${formatRupiah(amount)} berhasil · ${topupPay}`, {
      description: `Saldo kartu ${card.cardNumber} kini ${formatRupiah(card.balance + amount)}`,
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <CardScanInput
        value={cardNumber}
        onChange={onCardNumberChange}
        label="Kartu Playing Card"
        id={inputId}
      />

      {cardNumber.trim() === "" ? (
        <p className="text-xs text-muted-foreground">
          Tempelkan kartu ke alat pembaca, atau ketik nomor kartunya.
        </p>
      ) : !card ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Kartu belum terdaftar!
          <span className="mt-1 block break-all text-xs font-normal">
            Nomor terbaca: {cardNumber.trim()} — daftarkan nomor ini di menu Playing Card, atau
            pilih metode pembayaran lain.
          </span>
        </p>

      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{card.cardNumber}</span>
                <span className="block truncate text-xs font-semibold uppercase tracking-wider text-primary">
                  Kode: {card.cardCode?.trim() || "-"}
                </span>
                <span className="block truncate text-muted-foreground">
                  {card.customerName || "Tanpa nama"}
                  {card.member ? " · Member" : ""}
                </span>
                <span className="block truncate text-muted-foreground">
                  {card.customerPhone || "Tanpa nomor HP"}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-xs text-muted-foreground">Saldo</span>
              <span className="font-semibold text-accent">{formatRupiah(card.balance)}</span>
            </span>
          </div>

          {!card.active && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 font-semibold text-destructive">
              Kartu ini sedang diblokir!
            </p>
          )}

          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total potongan</span>
              <span className="text-accent">-{formatRupiah(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Dipotong dari saldo</span>
            <span>{formatRupiah(need)}</span>
          </div>

          {notEnough && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 font-semibold text-destructive">
              Saldo kartu tidak mencukupi! Kurang {formatRupiah(shortage)} — top up dulu, atau
              bagi pembayaran dengan metode lain.
            </p>
          )}

          <div className="space-y-1.5 border-t border-border pt-2">
            <Label htmlFor={`${inputId}-topup`}>Top up saldo sekarang</Label>
            <div className="flex gap-2">
              <Input
                id={`${inputId}-topup`}
                type="number"
                min={0}
                placeholder={shortage > 0 ? String(shortage) : "0"}
                value={topup}
                onChange={(e) => setTopup(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={doTopup}>
                <PlusCircle className="size-4" /> Top up
              </Button>
            </div>
            <CardFundingSelect
              id={`${inputId}-topup-pay`}
              value={topupPay}
              onChange={setTopupPay}
              label="Dibayar dengan"
            />
            {shortage > 0 && (
              <button
                type="button"
                className="text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => setTopup(String(shortage))}
              >
                Isi sejumlah kekurangan ({formatRupiah(shortage)})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
