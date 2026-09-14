import { useEffect, useMemo, useState } from "react";
import { Coffee, Plus, Printer, Trash2, Utensils, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardPaymentPanel } from "@/components/CardPaymentPanel";
import { ShiftLockedNotice, useShiftGate } from "@/components/ShiftGate";
import {
  CARD_PAYMENT_NAME,
  cafeBill,
  findCardByNumber,
  formatRupiah,
  useBilling,
  type CafeTable,
  type DiscountType,
  type HistoryRecord,
  type OrderItem,
} from "@/lib/billing-store";
import { SortableArea, SortableItem } from "@/components/Sortable";
import { PaidPrintDialog } from "@/components/PaidPrintDialog";
import { labelItemsFor, printLabels } from "@/lib/print-docs";
import type { PrinterConfig } from "@/lib/printing";

export function tableTotal(table: CafeTable) {
  return table.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
}

export function CafeTables({ allowDelete = false }: { allowDelete?: boolean }) {
  const {
    cafeTables,
    menu,
    menuCategories,
    paymentMethods,
    updateCafeTable,
    removeCafeTable,
    addCafeOrder,
    removeCafeOrder,
    clearCafeTable,
    payCafeTable,
    reorderList,
    playingCards,
    cardDiscountPercent,
    cardMemberDiscountPercent,
    consoleDiscounts,
    promotions,
    now,
    chargeCard,
    printers,
  } = useBilling();
  const { requireShift } = useShiftGate();
  const [paidRecord, setPaidRecord] = useState<HistoryRecord | null>(null);
  const labelPrinters = printers.filter((p) => p.active);
  const labelHeading = (p: PrinterConfig) =>
    p.role === "bar" ? "BAR" : p.role === "kitchen" ? "DAPUR" : p.name;
  /** Cetak label untuk satu atau semua pesanan meja, sesuai printer per menu. */
  const printOrderLabels = (
    orders: OrderItem[],
    source: string,
    customerName?: string,
    note?: string,
  ) => {
    let printed = 0;
    for (const printer of labelPrinters) {
      const items = labelItemsFor(orders, menu, printer.id);
      if (items.length === 0) continue;
      printLabels({
        printer,
        items,
        heading: labelHeading(printer),
        source,
        ...(customerName ? { customerName } : {}),
        ...(note ? { note } : {}),
      });
      printed += items.length;
    }
    if (printed === 0) {
      toast.error("Label belum bisa dicetak", {
        description: "Atur printer label untuk menu ini di menu Printer.",
      });
    }
  };

  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("semua");
  const [payMethod, setPayMethod] = useState("");
  const [received, setReceived] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [discType, setDiscType] = useState<DiscountType>("fixed");
  const [discValue, setDiscValue] = useState("");
  const [cardPart, setCardPart] = useState("");
  const [restPay, setRestPay] = useState("");

  // Setiap kali meja lain dibuka atau dialog ditutup, form kembali kosong.
  useEffect(() => {
    setCategory("semua");
    setPayMethod("");
    setReceived("");
    setCardNumber("");
    setDiscType("fixed");
    setDiscValue("");
    setCardPart("");
    setRestPay("");
  }, [openId]);


  const activeMethods = paymentMethods.filter((p) => p.active);
  const otherMethods = activeMethods.filter((m) => m.name !== CARD_PAYMENT_NAME);
  const table = cafeTables.find((t) => t.id === openId) ?? null;
  const visibleMenu = useMemo(
    () => (category === "semua" ? menu : menu.filter((m) => m.category === category)),
    [menu, category],
  );

  const isCardPayment = payMethod === CARD_PAYMENT_NAME;
  const card = isCardPayment ? findCardByNumber(playingCards, cardNumber) : undefined;
  const manualDisc = { type: discType, value: Math.max(0, Number(discValue) || 0) };
  const bill = cafeBill(
    table?.orders ?? [],
    now,
    { consoleDiscounts, menu, promotions, cardDiscountPercent, cardMemberDiscountPercent },
    { member: Boolean(card?.member), card: Boolean(isCardPayment && card) },
    manualDisc,
  );
  const total = bill.total;
  const cardCharge = isCardPayment
    ? Math.min(total, Math.max(0, cardPart === "" ? total : Number(cardPart) || 0))
    : total;
  const restAmount = isCardPayment ? Math.max(0, total - cardCharge) : 0;
  const restMethod = restPay || otherMethods[0]?.name || "Cash";


  const receivedValue = Number(received) || 0;
  const change = Math.max(0, receivedValue - total);
  const shortage = Math.max(0, total - receivedValue);

  return (
    <>
      <ShiftLockedNotice className="mb-3" />
      <SortableArea
        ids={cafeTables.map((t) => t.id)}
        onReorder={(activeId, overId) => reorderList("cafeTables", activeId, overId)}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      >
        {cafeTables.map((t) => {
          const filled = t.orders.length > 0 || Boolean(t.openedAt);
          return (
            <SortableItem
              key={t.id}
              id={t.id}
              handle={false}
              label={t.name}
              className={`surface-panel p-3 ${filled ? "border-primary/50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-extrabold uppercase tracking-wide text-primary">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.area} · {t.seats} kursi
                  </p>
                </div>
                <Badge variant={filled ? "default" : "secondary"} className="text-[10px]">
                  {filled ? "Terisi" : "Kosong"}
                </Badge>
              </div>

              <p className="mt-3 font-display text-2xl font-extrabold text-neon">
                {formatRupiah(tableTotal(t))}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t.orders.length} item{t.customerName ? ` · ${t.customerName}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setOpenId(t.id);
                    setCategory("semua");
                    setPayMethod(activeMethods[0]?.name ?? "");
                    setReceived("");
                  }}
                >
                  <Utensils className="size-4" /> Pesanan
                </Button>
                {allowDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Hapus ${t.name}`}
                    onClick={() => {
                      if (!removeCafeTable(t.id)) {
                        toast.error(`${t.name} masih terisi`);
                        return;
                      }
                      toast.success(`${t.name} dihapus`);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </SortableItem>
          );
        })}
      </SortableArea>

      <Dialog open={Boolean(table)} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {table && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Coffee className="size-5 text-primary" />
                  {table.name}
                </DialogTitle>
                <DialogDescription>
                  {table.area} · {table.seats} kursi
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cafe-customer">Nama pelanggan</Label>
                    <Input
                      id="cafe-customer"
                      value={table.customerName}
                      placeholder="Pelanggan Kafe"
                      onChange={(e) =>
                        updateCafeTable(table.id, { customerName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cafe-notes">Catatan</Label>
                    <Input
                      id="cafe-notes"
                      value={table.notes}
                      placeholder="mis. tanpa gula"
                      onChange={(e) => updateCafeTable(table.id, { notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Menu</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant={category === "semua" ? "default" : "outline"}
                      onClick={() => setCategory("semua")}
                    >
                      Semua
                    </Button>
                    {menuCategories.map((c) => (
                      <Button
                        key={c}
                        size="sm"
                        variant={category === c ? "default" : "outline"}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleMenu.map((item) => (
                      <Button
                        key={item.id}
                        size="sm"
                        variant="secondary"
                        className="h-auto justify-between py-2"
                        onClick={() => {
                          if (!requireShift()) return;
                          addCafeOrder(table.id, item, 1);
                          toast.success(`${item.name} ditambahkan`);
                        }}
                      >
                        <span className="flex flex-col items-start text-left">
                          <span className="truncate">{item.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatRupiah(item.price)}
                          </span>
                        </span>
                        <Plus className="size-3.5 shrink-0" />
                      </Button>
                    ))}
                    {visibleMenu.length === 0 && (
                      <p className="col-span-2 text-sm text-muted-foreground">
                        Belum ada menu pada kategori ini.
                      </p>
                    )}
                  </div>
                </div>

                {table.orders.length > 0 && (
                  <ul className="space-y-1">
                    {table.orders.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-sm"
                      >
                        <span>
                          {o.name} × {o.qty}
                        </span>
                        <span className="flex items-center gap-2">
                          {formatRupiah(o.price * o.qty)}
                          {labelPrinters.length > 0 && (
                            <button
                              type="button"
                              aria-label={`Cetak label ${o.name}`}
                              title="Cetak label"
                              className="text-muted-foreground transition-colors hover:text-primary"
                              onClick={() =>
                                printOrderLabels(
                                  [o],
                                  table.name,
                                  table.customerName ?? undefined,
                                  table.notes ?? undefined,
                                )
                              }
                            >
                              <Printer className="size-3.5" />
                            </button>
                          )}
                          <button
                            aria-label={`Hapus ${o.name}`}
                            onClick={() => removeCafeOrder(table.id, o.id)}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {table.orders.length > 0 && labelPrinters.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      printOrderLabels(
                        table.orders,
                        table.name,
                        table.customerName ?? undefined,
                        table.notes ?? undefined,
                      )
                    }
                  >
                    <Printer className="size-4" /> Cetak semua label
                  </Button>
                )}

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatRupiah(bill.subtotal)}</span>
                    </div>
                    {bill.itemDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Potongan menu</span>
                        <span className="text-neon">-{formatRupiah(bill.itemDiscount)}</span>
                      </div>
                    )}
                    {bill.promoDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{bill.promoName}</span>
                        <span className="text-neon">-{formatRupiah(bill.promoDiscount)}</span>
                      </div>
                    )}
                    {bill.manualDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diskon transaksi</span>
                        <span className="text-neon">-{formatRupiah(bill.manualDiscount)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="size-4 text-primary" /> Total
                    </span>
                    <span className="text-neon">{formatRupiah(total)}</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Diskon transaksi</Label>
                      <Select
                        value={discType}
                        onValueChange={(v) => setDiscType(v as DiscountType)}
                      >
                        <SelectTrigger aria-label="Jenis diskon transaksi">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Rupiah</SelectItem>
                          <SelectItem value="percent">Persen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cafe-disc">Nilai diskon</Label>
                      <Input
                        id="cafe-disc"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={discValue}
                        onChange={(e) => setDiscValue(e.target.value)}
                      />
                    </div>
                  </div>

                  {activeMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Belum ada tipe pembayaran aktif. Atur di menu Pembayaran.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Metode pembayaran</Label>
                        <Select value={payMethod} onValueChange={setPayMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih metode" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeMethods.map((m) => (
                              <SelectItem key={m.id} value={m.name}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cafe-received">
                          {isCardPayment ? "Nominal tercatat" : "Uang diterima"}
                        </Label>
                        <Input
                          id="cafe-received"
                          type="number"
                          min={0}
                          value={received === "" ? total : received}
                          onChange={(e) => setReceived(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {isCardPayment && (
                    <div className="space-y-3">
                      <CardPaymentPanel
                        cardNumber={cardNumber}
                        onCardNumberChange={setCardNumber}
                        need={cardCharge}
                        discount={bill.discount}
                        inputId="cafe-card-number"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="cafe-card-part">Dibayar dengan kartu</Label>
                          <Input
                            id="cafe-card-part"
                            type="number"
                            min={0}
                            max={total}
                            value={cardPart === "" ? String(total) : cardPart}
                            onChange={(e) => setCardPart(e.target.value)}
                          />
                        </div>
                        {restAmount > 0 && (
                          <div className="space-y-1.5">
                            <Label>Sisa {formatRupiah(restAmount)} dibayar dengan</Label>
                            <Select value={restMethod} onValueChange={setRestPay}>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih metode" />
                              </SelectTrigger>
                              <SelectContent>
                                {otherMethods.map((m) => (
                                  <SelectItem key={m.id} value={m.name}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {isCardPayment
                      ? card
                        ? `Kartu ${formatRupiah(cardCharge)}${
                            restAmount > 0
                              ? ` + ${restMethod} ${formatRupiah(restAmount)}`
                              : ""
                          }`
                        : "Scan atau ketik nomor kartu yang sudah terdaftar."
                      : received === "" || shortage === 0
                      ? `Kembalian: ${formatRupiah(received === "" ? 0 : change)}`
                      : `Kurang: ${formatRupiah(shortage)}`}
                  </p>

                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    clearCafeTable(table.id);
                    toast.success(`Pesanan ${table.name} dibatalkan`);
                    setOpenId(null);
                  }}
                >
                  Batalkan pesanan
                </Button>
                <Button
                  disabled={table.orders.length === 0 || activeMethods.length === 0}
                  onClick={() => {
                    if (isCardPayment) {
                      if (!card) {
                        toast.error("Kartu belum terdaftar!", {
                          description: "Scan kartu atau ketik nomor kartu yang sudah terdaftar.",
                        });
                        return;
                      }
                      if (!card.active) {
                        toast.error("Kartu ini sedang diblokir");
                        return;
                      }
                      if (card.balance + 0.5 < cardCharge) {
                        toast.error("Saldo kartu tidak mencukupi!", {
                          description: `Saldo ${formatRupiah(card.balance)}, dibutuhkan ${formatRupiah(cardCharge)}. Top up dulu atau bagi dengan metode lain.`,
                        });
                        return;
                      }
                      if (restAmount > 0 && otherMethods.length === 0) {
                        toast.error("Belum ada metode lain untuk sisa tagihan");
                        return;
                      }
                      if (cardCharge > 0 && !chargeCard(card.id, cardCharge, `Pembayaran ${table.name}`)) {
                        toast.error("Saldo kartu tidak mencukupi!");
                        return;
                      }
                      if (!requireShift()) return;
                      const cardRecord = payCafeTable(table.id, {
                        ...(restAmount > 0
                          ? {
                              payments: [
                                { method: CARD_PAYMENT_NAME, amount: cardCharge },
                                { method: restMethod, amount: restAmount },
                              ],
                            }
                          : { payment: CARD_PAYMENT_NAME }),
                        amountPaid: total,
                        member: Boolean(card.member),
                        discount: manualDisc,
                      });
                      if (!cardRecord) {
                        toast.error("Pembayaran gagal diproses");
                        return;
                      }
                      toast.success(`${table.name} lunas ${formatRupiah(cardRecord.total)}`, {
                        description: `Playing Card ${card.cardNumber} · dipotong ${formatRupiah(cardCharge)}${
                          restAmount > 0 ? ` · ${restMethod} ${formatRupiah(restAmount)}` : ""
                        }${bill.discount > 0 ? ` · potongan ${formatRupiah(bill.discount)}` : ""}`,
                      });
                      setReceived("");
                      setCardNumber("");
                      setDiscValue("");
                      setCardPart("");
                      setRestPay("");
                      setOpenId(null);
                      setPaidRecord(cardRecord);
                      return;
                    }

                    const paid = received === "" ? total : receivedValue;
                    if (paid + 0.5 < total) {
                      toast.error("Uang diterima kurang dari total tagihan");
                      return;
                    }
                    if (!requireShift()) return;
                    const record = payCafeTable(table.id, {
                      payment: payMethod || activeMethods[0]?.name || "Cash",
                      amountPaid: paid,
                      discount: manualDisc,
                    });
                    if (!record) {
                      toast.error("Pembayaran gagal diproses");
                      return;
                    }
                    toast.success(`${table.name} lunas ${formatRupiah(record.total)}`, {
                      description: `${record.payment} · kembalian ${formatRupiah(record.change ?? 0)}`,
                    });
                    setReceived("");
                    setDiscValue("");
                    setOpenId(null);
                    setPaidRecord(record);
                  }}
                >
                  Bayar &amp; selesaikan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PaidPrintDialog record={paidRecord} onClose={() => setPaidRecord(null)} />
    </>
  );
}
