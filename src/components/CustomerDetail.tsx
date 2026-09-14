import { useMemo, useState } from "react";
import { CreditCard, History, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  cardDiscountPercentFor,
  formatRupiah,
  useBilling,
  type Customer,
  type HistoryRecord,
  type PlayingCard,
} from "@/lib/billing-store";

const CARD_TYPE_LABEL: Record<string, string> = {
  purchase: "Pembelian kartu",
  topup: "Top-up",
  payment: "Pembayaran",
  adjust: "Penyesuaian",
};

const sameText = (a: string, b: string) =>
  Boolean(a.trim()) && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Kartu Playing Card milik seorang pelanggan. */
export function cardsOfCustomer(cards: PlayingCard[], customer: Customer) {
  return cards.filter(
    (card) =>
      card.customerId === customer.id ||
      (customer.phone.trim() !== "" && card.customerPhone.trim() === customer.phone.trim()) ||
      sameText(card.customerName, customer.name),
  );
}

/** Seluruh nota transaksi yang selesai milik seorang pelanggan. */
export function receiptsOfCustomer(history: HistoryRecord[], customer: Customer) {
  return history.filter(
    (item) =>
      item.customerId === customer.id ||
      (customer.phone.trim() !== "" && (item.customerPhone ?? "").trim() === customer.phone.trim()) ||
      sameText(item.customerName ?? "", customer.name),
  );
}

const dt = (ms: number) => new Date(ms).toLocaleString("id-ID");

export function CustomerDetailDialog({
  customer,
  open,
  onOpenChange,
  initialTab = "kunjungan",
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initialTab?: "kunjungan" | "kartu";
}) {
  const { history, playingCards, cardEntries, cardDiscountPercent, cardMemberDiscountPercent } =
    useBilling();
  const [receipt, setReceipt] = useState<HistoryRecord | null>(null);

  const cards = useMemo(() => cardsOfCustomer(playingCards, customer), [playingCards, customer]);
  const receipts = useMemo(() => receiptsOfCustomer(history, customer), [history, customer]);
  const spent = receipts.reduce((sum, item) => sum + item.total, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) setReceipt(null);
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={customer.member ? "default" : "secondary"}>
            {customer.member ? "Member" : "Umum"}
          </Badge>
          <span>{customer.phone || "Tanpa nomor HP"}</span>
          <span>· {receipts.length} kunjungan</span>
          <span>· belanja {formatRupiah(spent)}</span>
        </div>

        {receipt ? (
          <ReceiptView record={receipt} onBack={() => setReceipt(null)} />
        ) : (
          <Tabs defaultValue={initialTab}>
            <TabsList className="flex w-full flex-wrap">
              <TabsTrigger value="kunjungan">
                <History className="size-4" /> Kunjungan &amp; Nota
              </TabsTrigger>
              <TabsTrigger value="kartu">
                <CreditCard className="size-4" /> Playing Card
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kunjungan" className="mt-4 space-y-2">
              {receipts.length === 0 ? (
                <p className="rounded-md bg-secondary px-3 py-6 text-center text-sm text-muted-foreground">
                  Belum ada transaksi yang selesai.
                </p>
              ) : (
                receipts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReceipt(item)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold">
                        {item.kind === "cafe" ? item.tableName || "Kafe" : item.stationName}
                      </span>{" "}
                      · {item.minutes} menit
                      <span className="block text-xs text-muted-foreground">
                        {dt(item.endAt)} · {item.payment || "Belum ada metode"}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 font-semibold">
                      {formatRupiah(item.total)}
                      <Receipt className="size-4 text-muted-foreground" />
                    </span>
                  </button>
                ))
              )}
            </TabsContent>

            <TabsContent value="kartu" className="mt-4 space-y-3">
              {cards.length === 0 ? (
                <p className="rounded-md bg-secondary px-3 py-6 text-center text-sm text-muted-foreground">
                  Pelanggan ini belum punya Playing Card.
                </p>
              ) : (
                cards.map((card) => {
                  const cardHistory = cardEntries.filter((e) => e.cardId === card.id);
                  return (
                    <div key={card.id} className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display text-lg font-semibold">
                          {card.cardNumber}
                          {card.cardCode?.trim() ? (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-primary">
                              Kode: {card.cardCode.trim()}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-right">
                          <span className="block text-xs text-muted-foreground">Saldo</span>
                          <span className="font-display text-lg font-semibold text-accent">
                            {formatRupiah(card.balance)}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {card.active ? "Aktif" : "Diblokir"} · potongan{" "}
                        {cardDiscountPercentFor(card, {
                          cardDiscountPercent,
                          cardMemberDiscountPercent,
                        })}
                        %
                      </p>

                      <Separator />
                      <p className="text-sm font-semibold">
                        Riwayat pemakaian kartu {card.cardNumber}
                      </p>
                      {cardHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Belum ada transaksi untuk kartu ini.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {cardHistory.slice(0, 100).map((entry) => (
                            <li
                              key={entry.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                            >
                              <span className="min-w-0">
                                {CARD_TYPE_LABEL[entry.type] ?? entry.type} · {entry.note}
                                <span className="block text-xs text-muted-foreground">
                                  {dt(entry.createdAt)} · saldo {formatRupiah(entry.balanceAfter)}
                                </span>
                              </span>
                              <span
                                className={
                                  entry.amount < 0
                                    ? "font-semibold text-destructive"
                                    : "font-semibold text-accent"
                                }
                              >
                                {entry.amount < 0 ? "-" : "+"}
                                {formatRupiah(Math.abs(entry.amount))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}

            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ReceiptView({ record, onBack }: { record: HistoryRecord; onBack?: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold">Nota transaksi</p>
        {onBack && (
          <Button size="sm" variant="outline" onClick={onBack}>
            Kembali
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">No. {record.id}</p>

      <div className="space-y-1">
        <Row label="Waktu mulai" value={dt(record.startAt)} />
        <Row label="Waktu selesai" value={dt(record.endAt)} />
        <Row
          label={record.kind === "cafe" ? "Meja" : "Unit"}
          value={record.kind === "cafe" ? record.tableName || "Kafe" : record.stationName}
        />
        {record.packageName && <Row label="Paket" value={record.packageName} />}
        <Row label="Durasi" value={`${record.minutes} menit`} />
      </div>

      {record.orders && record.orders.length > 0 && (
        <>
          <Separator />
          <p className="font-semibold">Pesanan</p>
          <ul className="space-y-1">
            {record.orders.map((order, index) => (
              <li key={`${order.name}-${index}`} className="flex justify-between gap-3">
                <span className="truncate text-muted-foreground">
                  {order.name} × {order.qty}
                </span>
                <span>{formatRupiah(order.price * order.qty)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {record.addons && record.addons.length > 0 && (
        <>
          <Separator />
          <p className="font-semibold">Additional Rental</p>
          <ul className="space-y-1">
            {record.addons.map((addon, index) => (
              <li key={`${addon.name}-${index}`} className="flex justify-between gap-3">
                <span className="truncate text-muted-foreground">
                  {addon.name} × {addon.qty}
                  {addon.mode === "hourly" ? " / jam" : ""}
                </span>
                <span>
                  {formatRupiah(addonAmount(addon, Math.max(0, record.minutes) / 60))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Separator />
      <div className="space-y-1">
        <Row label="Rental" value={formatRupiah(record.rentalTotal)} />
        {record.addonTotal ? (
          <Row label="Additional Rental" value={formatRupiah(record.addonTotal)} />
        ) : null}
        <Row label="Makanan & minuman" value={formatRupiah(record.fnbTotal)} />
        {record.discount ? (
          <Row
            label={`Potongan${record.promoName ? ` (${record.promoName})` : ""}`}
            value={`- ${formatRupiah(record.discount)}`}
          />
        ) : null}
        <Row label="Total" value={formatRupiah(record.total)} strong />
        {record.payments && record.payments.length > 0 ? (
          record.payments.map((split, index) => (
            <Row key={`${split.method}-${index}`} label={split.method} value={formatRupiah(split.amount)} />
          ))
        ) : (
          <Row label="Metode bayar" value={record.payment || "-"} />
        )}
        {record.amountPaid !== undefined && (
          <Row label="Dibayar" value={formatRupiah(record.amountPaid)} />
        )}
        {record.change !== undefined && record.change > 0 && (
          <Row label="Kembalian" value={formatRupiah(record.change)} />
        )}
        {record.pointsEarned ? (
          <Row label="Poin didapat" value={String(record.pointsEarned)} />
        ) : null}
        {record.cashierName ? (
          <Row label="Kasir" value={record.cashierName} />
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display font-semibold" : ""}>{value}</span>
    </div>
  );
}
