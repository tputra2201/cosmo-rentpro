import { useEffect, useState } from "react";
import { Ban, Play, Square, Plus, Trash2, Timer, Infinity as InfinityIcon, CheckCircle2, Wallet, AlertTriangle, Pause, PlayCircle, Printer as PrinterIcon } from "lucide-react";
import { OrderDraftDialog } from "@/components/OrderDraftDialog";
import { VoidDialog } from "@/components/VoidDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CustomerPicker } from "@/components/CustomerPicker";
import { CardPaymentPanel } from "@/components/CardPaymentPanel";
import { ShiftLockedNotice, useShiftGate } from "@/components/ShiftGate";
import { PaidPrintDialog } from "@/components/PaidPrintDialog";
import { labelItemsFor, printLabels, printReceipt, type PrintStore } from "@/lib/print-docs";
import { printerFor, type PrinterConfig } from "@/lib/printing";
import { useStoreInfo } from "@/lib/store-info";
import {
  CARD_PAYMENT_NAME,
  sessionBill,
  findCardByNumber,
  elapsedSeconds,
  fnbTotal,
  formatClock,
  formatRupiah,
  paidTotal,
  isPaused,
  pausedMsTotal,
  remainingSeconds,
  rentalTotal,
  rentalMinutes,
  addonAmount,
  useBilling,
  type ConsoleType,
  type DiscountType,
  type Station,
  type OrderItem,
  orderLabel,
} from "@/lib/billing-store";


const DURATIONS = [30, 60, 90, 120, 180];

export function StationDialog({
  station,
  open,
  onOpenChange,
}: {
  station: Station | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    now,
    bookings,
    rates,
    consoleTypes,
    menu,
    menuCategories,

    startSession,
    stopSession,
    settleSession,
    removeSettlement,
    addTime,
    addOrder,
    removeOrder,
    setStationConsole,
    paymentMethods,
    packages,
    defaultBonusMin,
    adjustBonusTime,
    pauseSession,
    resumeSession,
    customers,
    updateSessionCustomer,
    playingCards,
    cardDiscountPercent,
    cardMemberDiscountPercent,
    consoleDiscounts,
    promotions,
    setSessionDiscount,
    chargeCard,
    printers,
    history,
    receiptLayout,
    addonRentals,
    addSessionAddon,
    removeSessionAddon,
    stations,
    moveSession,
  } = useBilling();

  const { requireShift } = useShiftGate();
  const { store: storeInfo } = useStoreInfo(true);
  const [paidRecord, setPaidRecord] = useState<import("@/lib/billing-store").HistoryRecord | null>(
    null,
  );
  // Setelah tagihan lunas, tawarkan cetak struk walau sesi masih berjalan.
  const [wantPrint, setWantPrint] = useState(false);
  const paidHistoryId = station?.session?.historyId;
  useEffect(() => {
    if (!wantPrint || !paidHistoryId) return;
    const found = history.find((h) => h.id === paidHistoryId);
    if (!found) return;
    setWantPrint(false);
    setPaidRecord(found);
  }, [wantPrint, paidHistoryId, history]);
  const labelPrinters = printers.filter((p) => p.active);
  const labelHeading = (p: PrinterConfig) =>
    p.role === "bar" ? "BAR" : p.role === "kitchen" ? "DAPUR" : p.name;
  /** Cetak label untuk satu atau semua pesanan, sesuai printer yang diatur per menu. */
  const printOrderLabels = (orders: OrderItem[], source: string, customerName?: string) => {
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
      });
      printed += items.length;
    }
    if (printed === 0) {
      toast.error("Label belum bisa dicetak", {
        description: "Atur printer label untuk menu ini di menu Printer.",
      });
    }
  };
  const [cardNumber, setCardNumber] = useState("");
  const [editCustomer, setEditCustomer] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMember, setEditMember] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState("");
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const [moveConsole, setMoveConsole] = useState("");
  const [addonPick, setAddonPick] = useState("");
  const freeStations = stations.filter((s) => s.id !== station?.id && !s.session);


  const [payment, setPayment] = useState("");

  const [customerName, setCustomerName] = useState("Umum");
  const [customerPhone, setCustomerPhone] = useState("");
  const [member, setMember] = useState(false);
  const [packageId, setPackageId] = useState("");
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<{ method: string; amount: string }[]>([]);
  const [bonus, setBonus] = useState(String(defaultBonusMin ?? 0));
  const [confirmPay, setConfirmPay] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const bonusMin = Math.round(Number(bonus) || 0);

  const matchedCustomer =
    customers.find(
      (item) => item.name.trim().toLowerCase() === customerName.trim().toLowerCase(),
    ) ?? null;

  const activePayments = paymentMethods.filter((p) => p.active);
  const selectedPayment =
    payment || activePayments[0]?.name || "Cash";

  if (!station) return null;
  const session = station.session;
  const rate = rates[station.console] ?? 0;
  const chosenPackage = packages.find((item) => item.id === packageId);
  const upcomingBooking = session
    ? undefined
    : bookings
        .filter(
          (item) =>
            item.stationId === station.id &&
            item.status !== "cancelled" &&
            item.status !== "completed" &&
            item.endAt >= now &&
            item.startAt - 6 * 60 * 60 * 1000 <= now,
        )
        .sort((a, b) => a.startAt - b.startAt)[0];
  const cardMethodSelected = splitMode
    ? splits.some((s) => (s.method || activePayments[0]?.name || "Cash") === CARD_PAYMENT_NAME)
    : selectedPayment === CARD_PAYMENT_NAME;
  const isCardPayment = !splitMode && selectedPayment === CARD_PAYMENT_NAME;
  const cardFound = findCardByNumber(playingCards, cardNumber);
  const card = cardMethodSelected ? cardFound : undefined;
  const hasCardSettlement = Boolean(
    session?.settlements?.some(
      (settlement) =>
        settlement.payment === CARD_PAYMENT_NAME ||
        settlement.payments?.some((row) => row.method === CARD_PAYMENT_NAME),
    ),
  );
  const priceCfg = {
    consoleDiscounts,
    menu,
    promotions,
    cardDiscountPercent,
    cardMemberDiscountPercent,
  };
  const alreadyPaid = paidTotal(session);
  const billWithoutPendingCard = session
    ? sessionBill(session, now, station.console, priceCfg, {
        member: Boolean(session.member),
        card: hasCardSettlement,
      })
    : null;
  const pendingCardBill = session && cardMethodSelected && cardFound && !hasCardSettlement
    ? sessionBill(session, now, station.console, priceCfg, {
        member: Boolean(session.member),
        card: true,
      })
    : null;
  // Pemilihan kartu hanya menjadi pratinjau potongan. Jangan biarkan potongan
  // yang belum dibayar membuat pembayaran lama terlihat melunasi tagihan.
  const bill = pendingCardBill && pendingCardBill.total > alreadyPaid
    ? pendingCardBill
    : billWithoutPendingCard;
  const sessionTotal = bill ? bill.total : 0;
  const dueAmount = Math.max(0, sessionTotal - alreadyPaid);
  const isSettled = dueAmount <= 0;

  const payTarget =
    payAmount === ""
      ? dueAmount
      : Math.min(dueAmount, Math.max(0, Number(payAmount) || 0));

  const splitRows = splits.map((s) => ({
    method: s.method || activePayments[0]?.name || "Cash",
    amount: Math.max(0, Number(s.amount) || 0),
  }));
  const splitPaid = splitRows.reduce((sum, s) => sum + s.amount, 0);
  const splitRemaining = Math.max(0, payTarget - splitPaid);
  const cashReceived =
    amountPaid === "" ? payTarget : Math.max(0, Number(amountPaid) || 0);

  const cardSplit = splitMode
    ? splitRows
        .filter((s) => s.method === CARD_PAYMENT_NAME)
        .reduce((sum, s) => sum + s.amount, 0)
    : 0;
  const usesCard = cardMethodSelected;
  const cardCharge = isCardPayment ? payTarget : cardSplit;



  const resetPaymentForm = () => {
    setSplitMode(false);
    setSplits([]);
    setPayment("");
    setAmountPaid("");
    setPayAmount("");
    setCardNumber("");
  };

  const validatePayment = () => {
    if (dueAmount <= 0) {
      toast.error("Tagihan sudah lunas");
      return false;
    }
    if (payTarget <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return false;
    }
    if (usesCard) {
      if (!cardFound) {
        toast.error("Kartu belum terdaftar!", {
          description: "Scan kartu atau ketik nomor kartu yang sudah terdaftar.",
        });
        return false;
      }
      if (!cardFound.active) {
        toast.error("Kartu ini sedang diblokir");
        return false;
      }
      if (cardFound.balance + 0.5 < cardCharge) {
        toast.error("Saldo kartu tidak mencukupi!", {
          description: `Saldo ${formatRupiah(cardFound.balance)}, dibutuhkan ${formatRupiah(cardCharge)}. Top up dulu atau bagi dengan metode lain.`,
        });
        return false;
      }
    }
    if (splitMode) {
      if (splitRows.filter((s) => s.amount > 0).length === 0) {
        toast.error("Isi jumlah tiap metode pembayaran");
        return false;
      }
      if (splitPaid < payTarget) {
        toast.error(`Pembayaran masih kurang ${formatRupiah(splitRemaining)}`);
        return false;
      }
      return true;
    }
    if (isCardPayment) return true;

    if (selectedPayment === "Cash" && cashReceived < payTarget) {
      toast.error("Uang diterima masih kurang");
      return false;
    }
    return true;
  };

  const handlePay = () => {
    if (!requireShift()) return;
    if (isCardPayment) {
      if (!card) return;
      if (!chargeCard(card.id, cardCharge, `Pembayaran ${station.name}`)) {
        toast.error("Saldo Playing Card tidak mencukupi");
        return;
      }
      settleSession(station.id, {
        payment: CARD_PAYMENT_NAME,
        amount: payTarget,
        amountPaid: cardCharge,
      });
      const remaining = Math.max(0, dueAmount - payTarget);
      if (remaining <= 0) setWantPrint(true);
      toast.success("Pembayaran Playing Card diterima", {
        description: `${formatRupiah(cardCharge)} dari kartu ${card.cardNumber}${
          (bill?.discount ?? 0) > 0 ? ` · potongan ${formatRupiah(bill?.discount ?? 0)}` : ""
        }${remaining > 0 ? ` · Sisa tagihan ${formatRupiah(remaining)}` : ""}`,
      });
      resetPaymentForm();
      return;
    }
    if (splitMode) {
      const rows = splitRows.filter((s) => s.amount > 0);
      if (cardSplit > 0) {
        if (!cardFound) return;
        if (!chargeCard(cardFound.id, cardSplit, `Pembayaran ${station.name}`)) {
          toast.error("Saldo kartu tidak mencukupi!");
          return;
        }
      }
      settleSession(station.id, {
        payments: rows,
        amount: payTarget,
        amountPaid: splitPaid,
      });

    } else {
      settleSession(station.id, {
        payment: selectedPayment,
        amount: payTarget,
        amountPaid: selectedPayment === "Cash" ? cashReceived : payTarget,
      });
    }
    const sisa = Math.max(0, dueAmount - payTarget);
    if (sisa <= 0) setWantPrint(true);
    toast.success(sisa > 0 ? "Pembayaran sebagian diterima" : "Pembayaran diterima", {
      description: `${formatRupiah(payTarget)} — ${
        splitMode
          ? splitRows.filter((s) => s.amount > 0).map((s) => s.method).join(" + ")
          : selectedPayment
      }${sisa > 0 ? ` · Sisa tagihan ${formatRupiah(sisa)}` : ""}`,
    });
    resetPaymentForm();
  };

  const leftMinutes =
    session && session.mode !== "open"
      ? Math.max(0, Math.ceil(remainingSeconds(session, now) / 60))
      : 0;

  const handleEnd = () => {
    const record = stopSession(station.id);
    if (!record) {
      toast.error("Sesi belum bisa diakhiri", {
        description:
          dueAmount > 0
            ? `Sisa tagihan ${formatRupiah(dueAmount)} harus dibayar dulu`
            : "Coba tutup lalu buka kembali kartu TV ini, atau muat ulang halaman.",
      });
      return;
    }
    onOpenChange(false);
    resetPaymentForm();
    setPaidRecord(record);
    toast.success(`${record.stationName} selesai`, {
      description: `Total ${formatRupiah(record.total)} — ${record.payment}`,
    });
  };


  /** Cetak bill sementara sebelum tagihan dilunasi. */
  const printBill = () => {
    const printer = printerFor(printers, "receipt");
    if (!printer) {
      toast.error("Printer struk belum diatur di menu Printer");
      return;
    }
    if (!session || !bill) return;
    printReceipt({
      record: {
        id: `BILL-${station.id}-${Date.now()}`,
        stationName: station.name,
        console: station.console,
        mode: session.mode,
        startAt: session.startAt,
        endAt: now,
        minutes: Math.round(elapsedSeconds(session, now) / 60),
        rentalTotal: bill.rental,
        fnbTotal: bill.fnb,
        total: bill.total,
        ...(bill.discount ? { discount: bill.discount } : {}),
        ...(bill.promoName ? { promoName: bill.promoName } : {}),
        ...(session.customerName ? { customerName: session.customerName } : {}),
        orders: session.orders ?? [],
        ongoing: true,
      },
      store: storeInfo as PrintStore,
      printer,
      layout: { ...receiptLayout, showPayment: false },
      kind: "bill",
    });
  };

  return (
    <>
    <PaidPrintDialog record={paidRecord} onClose={() => setPaidRecord(null)} />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {station.name}
          </DialogTitle>
          <DialogDescription>
            {station.console} &middot; {formatRupiah(rate)} / jam
          </DialogDescription>
        </DialogHeader>

        <ShiftLockedNotice />

        {!session ? (
          <div className="space-y-5">
            {station.availability !== "available" && (
              <Badge variant="outline" className="w-full justify-center py-2 text-warning">Unit berstatus {station.availability}. Ubah status di Pengaturan terlebih dahulu.</Badge>
            )}
            {upcomingBooking && (
              <div className="flex items-start gap-2 rounded-md border border-warning/60 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  TV ini telah direservasi oleh <strong>{upcomingBooking.customerName}</strong> yang akan Check-In pada jam{" "}
                  {new Date(upcomingBooking.startAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  {upcomingBooking.customerPhone ? ` (${upcomingBooking.customerPhone})` : ""}.
                </p>
              </div>
            )}



            <div className="space-y-2">
              <p className="text-sm font-medium">Jenis konsol</p>
              <Select
                value={station.console}
                onValueChange={(v) =>
                  setStationConsole(station.id, v as ConsoleType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consoleTypes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} — {formatRupiah(rates[c] ?? 0)} / jam
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Bermain per Jam (bayar di muka)</p>
              <Select value={packageId} onValueChange={(value) => { setPackageId(value); const item = packages.find((entry) => entry.id === value); if (item) setDuration(item.durationMin); }}>
                <SelectTrigger><SelectValue placeholder="Pilih paket rental" /></SelectTrigger>
                <SelectContent>{packages.filter((item) => item.active).map((item) => <SelectItem key={item.id} value={item.id}>{item.name} — {item.durationMin} menit</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={duration === d ? "default" : "outline"}
                    onClick={() => {
                      setDuration(d);
                      setCustomDuration("");
                    }}
                  >
                    {d} mnt
                  </Button>
                ))}
                <Input
                  type="number"
                  min={1}
                  placeholder="Menit lain"
                  value={customDuration}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                    const v = Number(e.target.value);
                    if (v > 0) setDuration(v);
                  }}
                  className="h-8 w-28"
                />
              </div>
              <div className="space-y-1.5 rounded-md border border-border p-3">
                <Label htmlFor="bonus-min">Waktu ekstra (menit, boleh minus)</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setBonus(String(bonusMin - 1))}>-1</Button>
                  <Input id="bonus-min" type="number" className="h-8 w-24 text-center" value={bonus} onChange={(e) => setBonus(e.target.value)} />
                  <Button type="button" size="sm" variant="outline" onClick={() => setBonus(String(bonusMin + 1))}>+1</Button>
                  {[2, 3, 5].map((m) => (
                    <Button key={m} type="button" size="sm" variant="ghost" onClick={() => setBonus(String(m))}>+{m}</Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Total waktu main: {Math.max(0, duration + bonusMin)} menit — tarif tetap dihitung {duration} menit.</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Harga paket: {formatRupiah((rate * duration) / 60)}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <CustomerPicker
                  value={customerName}
                  onChange={setCustomerName}
                  onPick={(item) => {
                    setCustomerName(item.name);
                    setCustomerPhone(item.phone);
                    setMember(item.member);
                  }}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="customer-phone">Nomor HP</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08..."
                    inputMode="tel"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  if (!requireShift()) return;
                  startSession(station.id, "prepaid", duration, { customerName, customerPhone, member, ...(matchedCustomer ? { customerId: matchedCustomer.id } : {}), packageName: chosenPackage?.name || `${duration} Menit`, notes, bonusMin });
                  toast.success(`${station.name} mulai ${Math.max(0, duration + bonusMin)} menit`, bonusMin !== 0 ? { description: `${duration} menit + ekstra ${bonusMin} menit (tarif tetap)` } : undefined);
                }}
              >
                <Play className="size-4" /> Mulai Paket
              </Button>
            </div>

            <Separator />

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!requireShift()) return;
                startSession(station.id, "open", 0, { customerName, customerPhone, member, ...(matchedCustomer ? { customerId: matchedCustomer.id } : {}), packageName: "Open Time", notes });
                toast.success(`${station.name} mulai Main Sepuasnya`);
              }}
            >
              <InfinityIcon className="size-4" /> Mulai Main Sepuasnya
            </Button>
            <div className="space-y-1.5"><Label htmlFor="rental-notes">Catatan</Label><Input id="rental-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Permintaan pelanggan (opsional)" /></div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="surface-panel p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {session.mode === "open" ? "Waktu berjalan" : "Sisa waktu"}
              </p>
              <p className="timer-digits mt-1 text-4xl">
                {session.mode === "open"
                  ? formatClock(elapsedSeconds(session, now))
                  : formatClock(Math.max(0, remainingSeconds(session, now)))}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {session.customerName || "Umum"} · {session.member ? "Member" : "Umum"} · {session.packageName}
              </p>
              {!editCustomer ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1"
                  onClick={() => {
                    setEditName(session.customerName ?? "");
                    setEditPhone(session.customerPhone ?? "");
                    setEditMember(Boolean(session.member));
                    setEditCustomerId(session.customerId ?? "");
                    setEditCustomer(true);
                  }}
                >
                  Ubah data pelanggan
                </Button>
              ) : (
                <div className="mt-3 space-y-3 rounded-md border p-3 text-left">
                  <div className="space-y-1.5">
                    <Label>Pelanggan tersimpan</Label>
                    <Select
                      value={editCustomerId || "guest"}
                      onValueChange={(value) => {
                        if (value === "guest") {
                          setEditCustomerId("");
                          return;
                        }
                        const found = customers.find((item) => item.id === value);
                        setEditCustomerId(value);
                        if (found) {
                          setEditName(found.name);
                          setEditPhone(found.phone);
                          setEditMember(found.member);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest">Pelanggan umum</SelectItem>
                        {customers.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} · {item.phone || "tanpa nomor"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-session-name">Nama pelanggan</Label>
                    <Input
                      id="edit-session-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Umum"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-session-phone">Nomor HP</Label>
                    <Input
                      id="edit-session-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="08..."
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="edit-session-member">Member</Label>
                    <Switch id="edit-session-member" checked={editMember} onCheckedChange={setEditMember} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setEditCustomer(false)}>
                      Batal
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        updateSessionCustomer(station.id, {
                          customerName: editName.trim(),
                          customerPhone: editPhone.trim(),
                          member: editMember,
                          ...(editCustomerId ? { customerId: editCustomerId } : { customerId: undefined }),
                        });
                        setEditCustomer(false);
                        toast.success("Data pelanggan diperbarui");
                      }}
                    >
                      Simpan
                    </Button>
                  </div>
                </div>
              )}
              {isPaused(session) && (
                <p className="mt-1 text-sm font-semibold text-warning">Timer dijeda</p>
              )}
              <div className="mt-3 flex flex-col items-center gap-1">
                {isPaused(session) ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      resumeSession(station.id);
                      toast.success(`Timer ${station.name} dilanjutkan`);
                    }}
                  >
                    <PlayCircle className="size-4" /> Lanjutkan Timer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      pauseSession(station.id);
                      toast.info(`Timer ${station.name} dijeda`, {
                        description: "Waktu jeda tidak dihitung sebagai waktu main.",
                      });
                    }}
                  >
                    <Pause className="size-4" /> Jeda Timer
                  </Button>
                )}
                {pausedMsTotal(session, now) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total jeda {formatClock(Math.floor(pausedMsTotal(session, now) / 1000))}
                  </p>
                )}
                <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-2">
                  <Select value={moveTo} onValueChange={setMoveTo}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Pindah ke unit…" />
                    </SelectTrigger>
                    <SelectContent>
                      {freeStations.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Tidak ada unit kosong
                        </SelectItem>
                      ) : (
                        freeStations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} · {s.console}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={moveConsole} onValueChange={setMoveConsole}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Ganti konsol (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tetap">
                        Tetap {station.console} · {formatRupiah(session.rate)}/jam
                      </SelectItem>
                      {consoleTypes
                        .filter((c) => c !== station.console)
                        .map((c) => (
                          <SelectItem key={c} value={c}>
                            {c} · {formatRupiah(rates[c] ?? 0)}/jam
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!moveTo || moveTo === "none"}
                    onClick={() => {
                      const target = stations.find((s) => s.id === moveTo);
                      if (!target) return;
                      const newConsole =
                        moveConsole && moveConsole !== "tetap" ? moveConsole : undefined;
                      const ok = moveSession(station.id, moveTo, newConsole);
                      if (!ok) {
                        toast.error("Gagal pindah unit", {
                          description: "Unit tujuan sudah terpakai. Pilih unit lain.",
                        });
                        return;
                      }
                      setMoveTo("");
                      setMoveConsole("");
                      onOpenChange(false);
                      toast.success(`Sesi dipindah ke ${target.name}`, {
                        description: newConsole
                          ? `Konsol diganti ke ${newConsole} — tarif mengikuti harga baru.`
                          : "Waktu, pesanan, dan pembayaran ikut berpindah.",
                      });
                    }}
                  >
                    Pindah TV
                  </Button>
                </div>
              </div>

            </div>


            <div className="flex flex-wrap gap-2">
              {[15, 30, 60].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addTime(station.id, m);
                    toast.success(`Tambah ${m} menit di ${station.name}`);
                  }}
                >
                  <Timer className="size-4" /> +{m} mnt
                </Button>
              ))}
            </div>

            {session.mode === "prepaid" && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Waktu ekstra (tanpa biaya)</p>
                  <span className="text-sm text-accent">{(session.bonusMin ?? 0) >= 0 ? "+" : ""}{session.bonusMin ?? 0} mnt</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[-5, -3, -1, 1, 2, 3, 5].map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        adjustBonusTime(station.id, m);
                        toast.success(`Waktu ekstra ${m > 0 ? "+" : ""}${m} menit`, { description: "Tarif tidak berubah" });
                      }}
                    >
                      {m > 0 ? `+${m}` : m}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Paket {session.durationMin} menit — total main {Math.max(0, session.durationMin + (session.bonusMin ?? 0))} menit.</p>
              </div>
            )}

            {addonRentals.some((a) => a.active) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Additional Rental</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={addonPick} onValueChange={setAddonPick}>
                    <SelectTrigger className="w-56" aria-label="Pilih additional rental">
                      <SelectValue placeholder="Pilih additional rental…" />
                    </SelectTrigger>
                    <SelectContent>
                      {addonRentals
                        .filter((a) => a.active)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} · {formatRupiah(a.price)}
                            {a.mode === "hourly" ? "/jam" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!addonPick}
                    onClick={() => {
                      if (!requireShift()) return;
                      const picked = addonRentals.find((a) => a.id === addonPick);
                      if (!picked) return;
                      addSessionAddon(station.id, picked.id, 1);
                      setAddonPick("");
                      toast.success(`${picked.name} ditambahkan`);
                    }}
                  >
                    <Plus className="size-4" /> Tambah
                  </Button>
                </div>
                {(session.addons ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {(session.addons ?? []).map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-sm"
                      >
                        <span>
                          {a.name} × {a.qty}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {a.mode === "hourly" ? "per jam" : "sekali sewa"}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {formatRupiah(
                            addonAmount(a, rentalMinutes(session, now) / 60),
                          )}
                          <button
                            type="button"
                            onClick={() => removeSessionAddon(station.id, a.id)}
                            aria-label={`Hapus ${a.name}`}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}


            <div className="space-y-2">
              <p className="text-sm font-medium">Pesanan makanan &amp; minuman</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!requireShift()) return;
                    setOrderOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Tambah Order
                </Button>
                {!isSettled && (
                  <Button size="sm" variant="outline" onClick={printBill}>
                    <PrinterIcon className="size-4" /> Cetak Bill
                  </Button>
                )}
              </div>

              {session.orders.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {session.orders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-sm"
                    >
                      <span>
                        {orderLabel(o)} × {o.qty}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatRupiah(o.price * o.qty)}
                        {labelPrinters.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              printOrderLabels(
                                [o],
                                station.name,
                                session.customerName ?? undefined,
                              )
                            }
                            aria-label={`Cetak label ${o.name}`}
                            title="Cetak label"
                            className="text-muted-foreground transition-colors hover:text-primary"
                          >
                            <PrinterIcon className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeOrder(station.id, o.id)}
                          aria-label={`Hapus ${o.name}`}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {session.orders.length > 0 && labelPrinters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() =>
                    printOrderLabels(session.orders, station.name, session.customerName ?? undefined)
                  }
                >
                  <PrinterIcon className="size-4" /> Cetak semua label
                </Button>
              )}
            </div>


            {session && bill && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Diskon transaksi</Label>
                    <Select
                      value={session.discountType ?? "fixed"}
                      onValueChange={(v) =>
                        setSessionDiscount(station.id, { type: v as DiscountType })
                      }
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
                    <Label htmlFor="session-disc">Nilai diskon</Label>
                    <Input
                      id="session-disc"
                      type="number"
                      min={0}
                      value={session.discountValue ?? 0}
                      onChange={(e) =>
                        setSessionDiscount(station.id, {
                          value: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {!isSettled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pay-amount">Jumlah dibayar</Label>
                  <button
                    type="button"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => setPayAmount("")}
                  >
                    Bayar lunas
                  </button>
                </div>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pay-amount"
                    className="pl-9"
                    type="number"
                    min={0}
                    max={dueAmount}
                    value={payAmount === "" ? String(dueAmount) : payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Bisa bayar sebagian di depan. Sisa {formatRupiah(Math.max(0, dueAmount - payTarget))}{" "}
                  tetap jadi tagihan berjalan.
                </p>
              </div>
            )}






            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rental</span>
                <span>{formatRupiah(bill?.rental ?? rentalTotal(session, now))}</span>
              </div>
              {(bill?.addon ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Rental</span>
                  <span>{formatRupiah(bill!.addon)}</span>
                </div>
              )}
              {fnbTotal(session) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Makanan &amp; minuman</span>
                  <span>{formatRupiah(fnbTotal(session))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span>{formatRupiah(bill?.subtotal ?? sessionTotal)}</span>
              </div>
              {bill && bill.itemDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potongan tarif &amp; menu</span>
                  <span className="text-accent">-{formatRupiah(bill.itemDiscount)}</span>
                </div>
              )}
              {bill && bill.promoDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{bill.promoName}</span>
                  <span className="text-accent">-{formatRupiah(bill.promoDiscount)}</span>
                </div>
              )}
              {bill && bill.manualDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon transaksi</span>
                  <span className="text-accent">-{formatRupiah(bill.manualDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg font-semibold">
                <span>Total Tagihan</span>
                <span className="text-accent">{formatRupiah(bill?.total ?? sessionTotal)}</span>
              </div>
              {alreadyPaid > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sudah dibayar</span>
                    <span>{formatRupiah(alreadyPaid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Sisa Tagihan</span>
                    <span className={dueAmount > 0 ? "text-destructive" : "text-accent"}>
                      {dueAmount > 0 ? formatRupiah(dueAmount) : "Lunas"}
                    </span>
                  </div>
                </>
              )}
              
              

              {isSettled && paidHistoryId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const found = history.find((h) => h.id === paidHistoryId);
                    if (!found) {
                      toast.error("Nota belum tersedia");
                      return;
                    }
                    setPaidRecord(found);
                  }}
                >
                  <PrinterIcon className="size-4" /> Cetak / cetak ulang struk
                </Button>
              )}
            </div>


            {(session.settlements ?? []).length > 0 && (
              <div className="space-y-1.5 rounded-md border border-border p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-accent">
                  <CheckCircle2 className="size-4" /> Pembayaran diterima
                </p>
                <ul className="space-y-1">
                  {(session.settlements ?? []).map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">
                        {s.payment} ·{" "}
                        {new Date(s.at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatRupiah(s.amount)}
                        <button
                          type="button"
                          aria-label="Batalkan pembayaran"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => {
                            removeSettlement(station.id, s.id);
                            toast.success("Pembayaran dibatalkan");
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}


            {session.mode === "prepaid" &&
              remainingSeconds(session, now) <= 0 && (
                <Badge variant="destructive" className="w-full justify-center py-1.5">
                  Waktu habis — silakan akhiri atau tambah waktu
                </Badge>
              )}

            {!isSettled && (
            <div className="space-y-2">

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Tipe pembayaran</p>
                {activePayments.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => {
                      if (splitMode) {
                        setSplitMode(false);
                        setSplits([]);
                      } else {
                        setSplitMode(true);
                        setSplits([
                          { method: activePayments[0]?.name ?? "Cash", amount: String(payTarget) },
                          { method: activePayments[1]?.name ?? "QRIS", amount: "0" },
                        ]);
                      }
                    }}
                  >
                    {splitMode ? "Satu metode saja" : "Bagi beberapa metode"}
                  </button>
                )}
              </div>
              {activePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada tipe pembayaran aktif. Atur di menu Pembayaran.
                </p>
              ) : splitMode ? (
                <div className="space-y-2">
                  {splits.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={row.method || activePayments[0]?.name || "Cash"}
                        onValueChange={(v) =>
                          setSplits((prev) =>
                            prev.map((r, idx) => (idx === i ? { ...r, method: v } : r)),
                          )
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {activePayments.map((p) => (
                            <SelectItem key={p.id} value={p.name}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        className="flex-1"
                        value={row.amount}
                        aria-label={`Jumlah ${row.method}`}
                        onChange={(e) =>
                          setSplits((prev) =>
                            prev.map((r, idx) =>
                              idx === i ? { ...r, amount: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      {splits.length > 2 && (
                        <button
                          type="button"
                          aria-label="Hapus metode"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() =>
                            setSplits((prev) => prev.filter((_, idx) => idx !== i))
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSplits((prev) => [
                          ...prev,
                          {
                            method: activePayments[0]?.name ?? "Cash",
                            amount: String(splitRemaining),
                          },
                        ])
                      }
                    >
                      <Plus className="size-4" /> Metode lain
                    </Button>
                    <span
                      className={
                        splitRemaining > 0
                          ? "font-semibold text-destructive"
                          : "font-semibold text-accent"
                      }
                    >
                      {splitRemaining > 0
                        ? `Kurang ${formatRupiah(splitRemaining)}`
                        : `Kembalian ${formatRupiah(splitPaid - payTarget)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <Select
                  value={selectedPayment}
                  onValueChange={(v) => setPayment(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activePayments.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {usesCard && (
                <CardPaymentPanel
                  cardNumber={cardNumber}
                  onCardNumberChange={setCardNumber}
                  need={cardCharge}
                  discount={bill?.discount ?? 0}
                  inputId="pay-card-number"
                />
              )}
            </div>
            )}



            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="w-full"
                disabled={isSettled || activePayments.length === 0}
                onClick={() => {
                  if (validatePayment()) setConfirmPay(true);
                }}
              >
                <Wallet className="size-4" />
                {isSettled ? "Sudah Lunas" : `Bayar ${formatRupiah(payTarget)}`}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                disabled={!isSettled}
                onClick={() => setConfirmEnd(true)}
              >
                <Square className="size-4" /> Akhiri Sesi
              </Button>
              <Button
                variant="destructive"
                className="w-full sm:col-span-2"
                onClick={() => {
                  if (!requireShift()) return;
                  setConfirmVoid(true);
                }}
              >
                <Ban className="size-4" /> VOID Transaksi
              </Button>
            </div>
            {!isSettled && (
              <p className="text-center text-xs text-muted-foreground">
                Sesi hanya bisa diakhiri setelah seluruh tagihan lunas.
              </p>
            )}

            <AlertDialog open={confirmPay} onOpenChange={setConfirmPay}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Selesaikan pembayaran?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {station.name} — {formatRupiah(payTarget)} melalui{" "}
                    {splitMode
                      ? splitRows.filter((s) => s.amount > 0).map((s) => s.method).join(" + ") ||
                        "gabungan"
                      : selectedPayment}
                    .{" "}
                    {dueAmount - payTarget > 0
                      ? `Sisa ${formatRupiah(dueAmount - payTarget)} tetap jadi tagihan berjalan.`
                      : "Sesi rental tetap berjalan setelah pembayaran."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePay}>Ya, terima pembayaran</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Akhiri sesi rental?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {leftMinutes > 0
                      ? `Yakin akan mengakhiri sesi ini? Timer masih tersisa ${leftMinutes} menit. `
                      : ""}
                    {station.name} akan dikosongkan dan transaksi masuk ke riwayat. Tindakan ini
                    tidak bisa dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEnd}>Ya, akhiri sesi</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>
        )}
      </DialogContent>
    </Dialog>

    {session && (
      <OrderDraftDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        sourceName={station.name}
        onSend={(lines) => {
          for (const line of lines) {
            addOrder(station.id, line.item, line.qty, line.mods, line.priceAdd);
          }
        }}
      />
    )}
    </>

  );
}
