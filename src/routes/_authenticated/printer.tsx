import { createFileRoute } from "@tanstack/react-router";
import { Plus, Printer as PrinterIcon, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBilling } from "@/lib/billing-store";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { useStoreInfo } from "@/lib/store-info";
import { printLabels, printReceipt, type PrintStore } from "@/lib/print-docs";
import {
  PAPER_LABEL,
  PAPER_OPTIONS,
  PRINTER_ROLES,
  PRINTER_ROLE_LABEL,
  PRINT_MODES,
  PRINT_MODE_LABEL,
  isAndroidPrintAvailable,
  pairedAndroidPrinters,
  type DocLayout,
  type PaperSize,
  type PrintMode,
  type PrinterConfig,
  type PrinterRole,
} from "@/lib/printing";

export const Route = createFileRoute("/_authenticated/printer")({
  head: () => ({
    meta: [
      { title: "Printer & Cetak — Billing Rental PS" },
      {
        name: "description",
        content:
          "Atur printer struk, invoice, label dapur, label bar, dan printer laporan beserta ukuran kertas, margin, dan huruf.",
      },
      { property: "og:title", content: "Printer & Cetak" },
      {
        property: "og:description",
        content:
          "Pengaturan printer thermal 40mm/80mm dan printer laporan A4 beserta layout struk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrinterPage,
});

function PrinterPage() {
  const [pairedPrinters, setPairedPrinters] = useState(() => pairedAndroidPrinters());
  const androidApp = isAndroidPrintAvailable();
  const {
    printers,
    addPrinter,
    updatePrinter,
    removePrinter,
    receiptLayout,
    invoiceLayout,
    setReceiptLayout,
    setInvoiceLayout,
    rolePermissions,
  } = useBilling();
  const { role } = useAuth();
  const { store } = useStoreInfo(true);
  const canManage = can(role, "printer.kelola", rolePermissions);

  useEffect(() => {
    if (androidApp) setPairedPrinters(pairedAndroidPrinters());
  }, [androidApp]);

  const testPrint = (printer: PrinterConfig) => {
    if (printer.role === "kitchen" || printer.role === "bar") {
      printLabels({
        printer,
        items: [{ name: "Contoh Menu", qty: 1 }],
        heading: printer.role === "bar" ? "BAR" : "DAPUR",
        source: "Uji coba cetak",
      });
      return;
    }
    const at = Date.now();
    printReceipt({
      printer,
      store: store as PrintStore,
      layout: printer.role === "invoice" ? invoiceLayout : receiptLayout,
      kind: printer.role === "invoice" ? "invoice" : "receipt",
      record: {
        id: "TEST-0001",
        stationId: "tv-1",
        stationName: "TV 01",
        console: "PS4",
        mode: "prepaid",
        minutes: 60,
        startAt: at - 3600000,
        endAt: at,
        paidAt: at,
        rentalTotal: 8000,
        fnbTotal: 6000,
        total: 14000,
        orders: [{ id: "o1", menuId: "m2", name: "Teh Botol", price: 6000, qty: 1 }],
        payment: "Cash",
        amountPaid: 20000,
        change: 6000,
        customerName: "Uji Coba",
      } as never,
    });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Printer &amp; Cetak</h1>
      </header>

      <section className="surface-panel space-y-2 p-6">
        <h2 className="text-xl font-semibold">Mencetak dari aplikasi Android</h2>
        <p className="text-sm text-muted-foreground">
          Aplikasi Android Billing Rental PS menghubungkan Kassen MT-300 VL langsung melalui
          Bluetooth tanpa RawBT. Pasangkan printer sekali di pengaturan Bluetooth Android, lalu
          pilih cara mencetak dan perangkatnya pada daftar di bawah.
        </p>
        <p className="text-sm text-muted-foreground">
          {androidApp
            ? `${pairedPrinters.length} printer Bluetooth ditemukan pada perangkat ini.`
            : "Pilihan Bluetooth langsung aktif saat halaman dibuka dari aplikasi Android khusus."}
        </p>
      </section>

      <section className="surface-panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Daftar Printer</h2>
            <p className="text-sm text-muted-foreground">
              Kertas 40 mm dan 80 mm untuk printer thermal, A4 untuk printer laporan.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => addPrinter()}>
              <Plus className="size-4" /> Tambah printer
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {printers.map((p) => (
            <div key={p.id} className="rounded-lg bg-secondary/60 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor={`name-${p.id}`}>Nama printer</Label>
                  <Input
                    id={`name-${p.id}`}
                    value={p.name}
                    disabled={!canManage}
                    onChange={(e) => updatePrinter(p.id, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jenis dokumen</Label>
                  <Select
                    value={p.role}
                    disabled={!canManage}
                    onValueChange={(value) => updatePrinter(p.id, { role: value as PrinterRole })}
                  >
                    <SelectTrigger aria-label={`Jenis ${p.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINTER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {PRINTER_ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ukuran kertas</Label>
                  <Select
                    value={p.paper}
                    disabled={!canManage}
                    onValueChange={(value) => updatePrinter(p.id, { paper: value as PaperSize })}
                  >
                    <SelectTrigger aria-label={`Kertas ${p.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size}>
                          {PAPER_LABEL[size]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Cara mencetak</Label>
                  <Select
                    value={p.mode ?? "system"}
                    disabled={!canManage}
                    onValueChange={(value) => updatePrinter(p.id, { mode: value as PrintMode })}
                  >
                    <SelectTrigger aria-label={`Cara mencetak ${p.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINT_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PRINT_MODE_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Gunakan Bluetooth langsung di aplikasi Android, atau dialog cetak di komputer.
                  </p>
                </div>
                {p.mode === "android" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Printer Bluetooth</Label>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Muat ulang printer Bluetooth"
                        onClick={() => setPairedPrinters(pairedAndroidPrinters())}
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    </div>
                    <Select
                      value={p.bluetoothAddress ?? ""}
                      disabled={!canManage || !androidApp}
                      onValueChange={(value) => updatePrinter(p.id, { bluetoothAddress: value })}
                    >
                      <SelectTrigger aria-label={`Printer Bluetooth ${p.name}`}>
                        <SelectValue placeholder="Pilih printer yang dipasangkan" />
                      </SelectTrigger>
                      <SelectContent>
                        {pairedPrinters.map((device) => (
                          <SelectItem key={device.address} value={device.address}>
                            {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`font-${p.id}`}>Ukuran huruf (pt)</Label>
                  <Input
                    id={`font-${p.id}`}
                    type="number"
                    min={6}
                    max={20}
                    value={p.fontSizePt}
                    disabled={!canManage}
                    onChange={(e) =>
                      updatePrinter(p.id, { fontSizePt: Number(e.target.value) || 9 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`margin-${p.id}`}>Margin (mm)</Label>
                  <Input
                    id={`margin-${p.id}`}
                    type="number"
                    min={0}
                    max={25}
                    value={p.marginMm}
                    disabled={!canManage}
                    onChange={(e) => updatePrinter(p.id, { marginMm: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`copies-${p.id}`}>Salinan</Label>
                  <Input
                    id={`copies-${p.id}`}
                    type="number"
                    min={1}
                    max={5}
                    value={p.copies}
                    disabled={!canManage}
                    onChange={(e) => updatePrinter(p.id, { copies: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={p.bold}
                      disabled={!canManage}
                      onCheckedChange={(v) => updatePrinter(p.id, { bold: v })}
                      aria-label={`Huruf tebal ${p.name}`}
                    />
                    Tebal
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={p.active}
                      disabled={!canManage}
                      onCheckedChange={(v) => updatePrinter(p.id, { active: v })}
                      aria-label={`Aktif ${p.name}`}
                    />
                    Aktif
                  </label>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => testPrint(p)}>
                  <PrinterIcon className="size-4" /> Uji cetak
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Hapus ${p.name}`}
                    onClick={() => {
                      removePrinter(p.id);
                      toast.success(`${p.name} dihapus`);
                    }}
                  >
                    <Trash2 className="size-4" /> Hapus
                  </Button>
                )}
              </div>
            </div>
          ))}
          {printers.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada printer.</p>
          )}
        </div>
      </section>

      <LayoutForm
        title="Layout Struk (Receipt)"
        layout={receiptLayout}
        onChange={setReceiptLayout}
        disabled={!canManage}
      />
      <LayoutForm
        title="Layout Invoice"
        layout={invoiceLayout}
        onChange={setInvoiceLayout}
        disabled={!canManage}
      />

    </div>
  );
}

function LayoutForm({
  title,
  layout,
  onChange,
  disabled,
}: {
  title: string;
  layout: DocLayout;
  onChange: (patch: Partial<DocLayout>) => void;
  disabled: boolean;
}) {
  const slug = title.toLowerCase().replaceAll(/[^a-z]/g, "");
  return (
    <section className="surface-panel space-y-4 p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${slug}-header`}>Teks header</Label>
          <Textarea
            id={`${slug}-header`}
            value={layout.headerText}
            disabled={disabled}
            placeholder="mis. Selamat datang di Cosmo Gaming"
            onChange={(e) => onChange({ headerText: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${slug}-footer`}>Teks footer</Label>
          <Textarea
            id={`${slug}-footer`}
            value={layout.footerText}
            disabled={disabled}
            placeholder="mis. Terima kasih"
            onChange={(e) => onChange({ footerText: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${slug}-margin`}>Margin (mm)</Label>
          <Input
            id={`${slug}-margin`}
            type="number"
            min={0}
            max={25}
            value={layout.marginMm}
            disabled={disabled}
            onChange={(e) => onChange({ marginMm: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${slug}-font`}>Ukuran huruf (pt)</Label>
          <Input
            id={`${slug}-font`}
            type="number"
            min={6}
            max={20}
            value={layout.fontSizePt}
            disabled={disabled}
            onChange={(e) => onChange({ fontSizePt: Number(e.target.value) || 9 })}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={layout.bold}
              disabled={disabled}
              onCheckedChange={(v) => onChange({ bold: v })}
              aria-label={`Huruf tebal ${title}`}
            />
            Huruf tebal
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <Toggle
          label="Tampilkan data store"
          checked={layout.showStoreInfo}
          disabled={disabled}
          onChange={(v) => onChange({ showStoreInfo: v })}
        />
        <Toggle
          label="Tampilkan pelanggan"
          checked={layout.showCustomer}
          disabled={disabled}
          onChange={(v) => onChange({ showCustomer: v })}
        />
        <Toggle
          label="Tampilkan rincian item"
          checked={layout.showItems}
          disabled={disabled}
          onChange={(v) => onChange({ showItems: v })}
        />
        <Toggle
          label="Tampilkan pembayaran"
          checked={layout.showPayment}
          disabled={disabled}
          onChange={(v) => onChange({ showPayment: v })}
        />
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
      {label}
    </label>
  );
}
