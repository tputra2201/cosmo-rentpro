import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptView } from "@/components/CustomerDetail";
import { CompanyReport } from "@/components/reports/CompanyReport";
import { CardReport } from "@/components/reports/CardReport";
import { ShiftReport } from "@/components/reports/ShiftReport";
import { MembershipReport } from "@/components/reports/MembershipReport";
import { MethodReport } from "@/components/reports/MethodReport";
import { CashierReport } from "@/components/reports/CashierReport";
import { LogBookReport } from "@/components/reports/LogBookReport";
import { StatsReport } from "@/components/reports/StatsReport";
import { VoidReport } from "@/components/reports/VoidReport";
import { DeviceReport } from "@/components/reports/DeviceReport";
import { ReportRangePicker } from "@/components/reports/ReportRangePicker";
import { PrintReportButton } from "@/components/reports/PrintReportButton";
import { ExportExcelButton } from "@/components/reports/ExportExcelButton";
import {
  businessDateKey,
  defaultRange,
  inRange,
  rangeLabel,
  type ReportRange,
} from "@/lib/report-range";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { useStoreInfo } from "@/lib/store-info";
import { printReceipt, type PrintStore } from "@/lib/print-docs";
import { printerFor } from "@/lib/printing";
import { formatRupiah, useBilling, type HistoryRecord } from "@/lib/billing-store";


export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({
    meta: [
      { title: "Riwayat & Laporan — RenToPlay" },
      {
        name: "description",
        content:
          "Rekap pendapatan harian rental PlayStation dan penjualan makanan minuman beserta riwayat transaksi.",
      },
      { property: "og:title", content: "Riwayat & Laporan — RenToPlay" },
      {
        property: "og:description",
        content: "Rekap pendapatan harian rental dan penjualan kasir.",
      },
    ],
  }),
  component: LaporanPage,
});

function dayKey(ts: number) {
  return new Date(ts).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LaporanPage() {
  const [pickedRange, setRange] = useState<ReportRange>(() => defaultRange("day"));
  const { role } = useAuth();
  const { rolePermissions, operatingHours, businessDays, now } = useBilling();

  // Tanggal yang dipilih dibaca sebagai hari usaha: mulai jam buka store
  // sampai jam tutup keesokan harinya. Bila hari usaha itu sudah ditutup
  // lewat End of Day, batas akhirnya memakai waktu penutupan sebenarnya.
  const range = useMemo<ReportRange>(() => {
    const base: ReportRange = {
      mode: pickedRange.mode,
      from: pickedRange.from,
      to: pickedRange.to,
      hours: operatingHours,
    };
    if (base.mode !== "day" || base.from !== base.to) return base;
    const day = (businessDays ?? []).find(
      (d) => businessDateKey(d.openedAt, operatingHours) === base.from,
    );
    if (!day) return base;
    return { ...base, endOverride: day.closedAt ?? now };
  }, [pickedRange, operatingHours, businessDays, now]);

  const { store } = useStoreInfo(true);
  const storeName = store?.store_name?.trim() || "RenToPlay";

  const allow = (key: string) => can(role, key, rolePermissions);

  const tabs = [
    { value: "nota", label: "Nota Transaksi", key: "laporan.receipt" },
    { value: "company", label: "Company Report", key: "laporan.company" },
    { value: "kartu", label: "Laporan Playing Card", key: "laporan.card" },
    { value: "shift", label: "Cash Close Out", key: "laporan.shift" },
    { value: "member", label: "Laporan Membership", key: "laporan.membership" },
    { value: "qris", label: "Pembayaran QRIS", key: "laporan.qris" },
    { value: "transfer", label: "Transfer Bank", key: "laporan.transfer" },
    { value: "kasir", label: "Transaksi per Kasir", key: "laporan.kasir" },
    { value: "logbook", label: "Log Book", key: "laporan.logbook" },
    { value: "statistik", label: "Statistik", key: "laporan.statistik" },
    { value: "void", label: "Laporan VOID", key: "laporan.void" },
    { value: "perangkat", label: "Transaksi per Perangkat", key: "laporan.perangkat" },
  ].filter((t) => allow(t.key));
  const first = tabs[0]?.value ?? "nota";
  const reportRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Riwayat &amp; Laporan</h1>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportRangePicker range={range} onChange={setRange} />
        <div className="flex flex-wrap gap-2">
          {allow("laporan.cetak") && (
            <PrintReportButton targetRef={reportRef} title="Laporan" label="Cetak laporan" />
          )}
          <ExportExcelButton
            targetRef={reportRef}
            title={`Laporan ${storeName}`}
            periodText={`Periode: ${rangeLabel(range)}`}
            folderName={storeName}
          />
        </div>
      </div>

      {tabs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Levelmu belum punya hak akses ke laporan mana pun.
        </p>
      )}
      <div ref={reportRef}>
      <Tabs key={first} defaultValue={first}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:grid-cols-5">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="w-full min-w-0 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="nota" className="mt-6">
          <ReceiptReport range={range} />
        </TabsContent>
        <TabsContent value="company" className="mt-6">
          <CompanyReport range={range} />
        </TabsContent>
        <TabsContent value="kartu" className="mt-6">
          <CardReport range={range} />
        </TabsContent>
        <TabsContent value="shift" className="mt-6">
          <ShiftReport range={range} />
        </TabsContent>
        <TabsContent value="member" className="mt-6">
          <MembershipReport range={range} />
        </TabsContent>
        <TabsContent value="qris" className="mt-6">
          <MethodReport
            range={range}
            title="Pembayaran QRIS"
            match={(m) => m.toLowerCase().includes("qris")}
            emptyText="Belum ada pembayaran QRIS pada periode ini."
          />
        </TabsContent>
        <TabsContent value="transfer" className="mt-6">
          <MethodReport
            range={range}
            title="Pembayaran transfer bank"
            match={(m) => {
              const key = m.toLowerCase();
              return key.includes("transfer") || key.includes("bank");
            }}
            emptyText="Belum ada pembayaran transfer bank pada periode ini."
          />
        </TabsContent>
        <TabsContent value="kasir" className="mt-6">
          <CashierReport range={range} />
        </TabsContent>
        <TabsContent value="logbook" className="mt-6">
          <LogBookReport range={range} />
        </TabsContent>
        <TabsContent value="void" className="mt-6">
          <VoidReport range={range} />
        </TabsContent>
        <TabsContent value="perangkat" className="mt-6">
          <DeviceReport range={range} />
        </TabsContent>
        <TabsContent value="statistik" className="mt-6">
          <StatsReport range={range} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function ReceiptReport({ range }: { range: ReportRange }) {
  const { history: rawHistory, cashEntries, clearHistory } = useBilling();
  const paidTime = (h: HistoryRecord) => h.paidAt ?? h.endAt;
  const history = [...rawHistory]
    .filter((h) => inRange(paidTime(h), range))
    .sort((a, b) => paidTime(b) - paidTime(a));
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = history.find((h) => h.id === openId) ?? null;
  const todayKey = dayKey(Date.now());
  const today = history.filter((h) => dayKey(paidTime(h)) === todayKey);

  const cashToday = cashEntries.filter((e) => dayKey(e.createdAt) === todayKey);
  const cashSum = (pick: (e: (typeof cashEntries)[number]) => boolean) =>
    cashToday.filter(pick).reduce((s, e) => s + e.amount, 0);
  const otherIncome = cashSum((e) => e.direction === "in" && !e.payout);
  const expense = cashSum((e) => e.direction === "out" && !e.payout);
  const payoutIn = cashSum((e) => e.direction === "in" && e.payout);
  const payoutOut = cashSum((e) => e.direction === "out" && e.payout);

  const sum = (
    arr: typeof history,
    key: "rentalTotal" | "fnbTotal" | "total" | "addonTotal",
  ) => arr.reduce((s, h) => s + (h[key] ?? 0), 0);


  const groups = history.reduce<Record<string, typeof history>>((acc, h) => {
    const k = dayKey(paidTime(h));
    (acc[k] ||= []).push(h);
    return acc;
  }, {});


  const exportCsv = () => {
    const header = ["Tanggal", "TV", "Pelanggan", "Paket", "Pembayaran", "Durasi", "Rental", "Additional Rental", "F&B", "Total"];
    const rows = history.map((h) => [new Date(h.endAt).toLocaleString("id-ID"), h.stationName, h.customerName ?? "Umum", h.packageName ?? h.mode, h.payment ?? "Cash", h.minutes, h.rentalTotal, h.addonTotal ?? 0, h.fnbTotal, h.total]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laporan-ps-rental-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Rekap pendapatan dari sesi rental dan penjualan kasir.
        </p>
        {history.length > 0 && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Cetak</Button><Button variant="outline" onClick={exportCsv}><Download className="size-4" /> Ekspor CSV</Button><Button variant="outline" onClick={clearHistory}><Trash2 className="size-4" /> Hapus riwayat</Button></div>}
      </header>


      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Rental hari ini" value={formatRupiah(sum(today, "rentalTotal"))} />
        <Stat
          label="Additional Rental"
          value={formatRupiah(sum(today, "addonTotal"))}
        />
        <Stat label="Makanan & minuman" value={formatRupiah(sum(today, "fnbTotal"))} />
        <Stat label="Pendapatan lain" value={formatRupiah(otherIncome)} />
        <Stat label="Pengeluaran" value={formatRupiah(expense)} />
        <Stat
          label="Total pendapatan hari ini"
          value={formatRupiah(sum(today, "total") + otherIncome)}
        />
        <Stat
          label="Sisa bersih hari ini"
          value={formatRupiah(sum(today, "total") + otherIncome - expense)}
          highlight
        />
      </section>

      {(payoutIn > 0 || payoutOut > 0) && (
        <p className="text-sm text-muted-foreground">
          Perpindahan uang kas hari ini (tidak dihitung pendapatan/biaya): masuk{" "}
          {formatRupiah(payoutIn)} · keluar {formatRupiah(payoutOut)}.
        </p>
      )}

      {cashToday.length > 0 && (
        <section className="surface-panel overflow-x-auto p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Kas lain &amp; pengeluaran hari ini</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashToday.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.categoryName}</TableCell>
                  <TableCell>{e.group}</TableCell>
                  <TableCell>
                    {e.payout
                      ? e.direction === "in"
                        ? "Kas masuk"
                        : "Kas keluar"
                      : e.direction === "in"
                        ? "Pendapatan"
                        : "Pengeluaran"}
                  </TableCell>
                  <TableCell>{e.payment}</TableCell>
                  <TableCell>{e.note || "-"}</TableCell>
                  <TableCell
                    className={
                      e.direction === "in"
                        ? "text-right font-semibold text-accent"
                        : "text-right font-semibold text-destructive"
                    }
                  >
                    {e.direction === "in" ? "+" : "-"}
                    {formatRupiah(e.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {history.length === 0 ? (
        <p className="surface-panel p-10 text-center text-muted-foreground">
          Belum ada transaksi. Akhiri sebuah sesi di Dashboard untuk mencatatnya di
          sini.
        </p>
      ) : (
        Object.entries(groups).map(([day, records]) => (
          <section key={day} className="surface-panel overflow-x-auto p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{day}</h2>
              <Badge variant="outline" className="border-accent text-accent">
                {formatRupiah(sum(records, "total"))}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jam</TableHead>
                  <TableHead>TV</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead className="text-right">Durasi</TableHead>
                  <TableHead className="text-right">Rental</TableHead>
                  <TableHead className="text-right">Add. Rental</TableHead>
                  <TableHead className="text-right">F&amp;B</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap">
                      {timeOf(paidTime(h))}
                      <span className="block text-xs text-muted-foreground">
                        {timeOf(h.startAt)} – {timeOf(h.endAt)}
                        {h.ongoing ? " · masih main" : ""}
                      </span>
                    </TableCell>

                    <TableCell>
                      {h.stationName}{" "}
                      <span className="text-muted-foreground">({h.console})</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{h.customerName ?? "Umum"}<span className="block text-xs text-muted-foreground">{h.packageName ?? "-"}</span></TableCell>
                    <TableCell className="whitespace-nowrap">{h.cashierName ?? "-"}</TableCell>
                    <TableCell>
                      {h.mode === "open" ? "Sepuasnya" : "Per Jam"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {h.payment ?? "Cash"}
                    </TableCell>
                    <TableCell className="text-right">{h.minutes} mnt</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(h.rentalTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(h.addonTotal ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(h.fnbTotal)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(h.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(h.id)}>
                        <Receipt className="size-4" /> Buka
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))
      )}

      {selected && (
        <ReceiptDialog
          record={selected}
          open={Boolean(openId)}
          onOpenChange={(value) => setOpenId(value ? openId : null)}
        />
      )}
    </div>
  );
}

function ReceiptDialog({
  record,
  open,
  onOpenChange,
}: {
  record: HistoryRecord;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const {
    paymentMethods,
    updateHistoryPayment,
    removeHistory,
    rolePermissions,
    printers,
    receiptLayout,
    invoiceLayout,
  } = useBilling();
  const { role } = useAuth();
  const { store } = useStoreInfo(true);
  const printDoc = (kind: "receipt" | "invoice") => {
    if (!can(role, "cetak.struk", rolePermissions)) {
      toast.error("Levelmu belum punya hak akses mencetak struk");
      return;
    }
    const printer = printerFor(printers, kind);
    if (!printer) {
      toast.error("Printer belum diatur di menu Printer");
      return;
    }
    printReceipt({
      record,
      store: store as PrintStore,
      printer,
      layout: kind === "invoice" ? invoiceLayout : receiptLayout,
      kind,
    });
  };
  const canDelete = can(role, "laporan.hapus", rolePermissions);
  const [method, setMethod] = useState(record.payment ?? "Cash");
  const [confirm, setConfirm] = useState(false);
  const options = paymentMethods.filter((p) => p.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nota transaksi</DialogTitle>
        </DialogHeader>

        <ReceiptView record={record} />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => printDoc("receipt")}
          >
            <Printer className="size-4" /> Cetak struk
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Ubah metode pembayaran</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                {options.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                updateHistoryPayment(record.id, { payment: method, payments: [] });
                toast.success("Metode pembayaran diperbarui");
              }}
            >
              Simpan
            </Button>
            {canDelete && (
              <Button variant="destructive" onClick={() => setConfirm(true)}>
                <Trash2 className="size-4" /> Hapus nota
              </Button>
            )}
          </div>
          {record.payments && record.payments.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Nota ini dibayar dengan beberapa metode. Menyimpan metode tunggal akan
              menggantikan rincian tersebut.
            </p>
          )}
          {!canDelete && (
            <p className="text-xs text-muted-foreground">
              Hanya admin yang dapat menghapus nota.
            </p>
          )}
        </div>

        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus nota ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Nota akan dihapus dari riwayat dan laporan. Tindakan ini tidak bisa
                dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  removeHistory(record.id);
                  setConfirm(false);
                  onOpenChange(false);
                  toast.success("Nota dihapus");
                }}
              >
                Ya, hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="surface-panel p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        data-report-stat={label}
        className={
          highlight
            ? "font-display text-2xl font-bold text-accent"
            : "font-display text-2xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}
