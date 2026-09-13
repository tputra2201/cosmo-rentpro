import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah, useBilling, type HistoryRecord } from "@/lib/billing-store";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { useStoreInfo } from "@/lib/store-info";
import { printReceipt, type PrintStore } from "@/lib/print-docs";
import { printerFor } from "@/lib/printing";

/** Tawaran cetak struk / invoice setelah pembayaran lunas. */
export function PaidPrintDialog({
  record,
  onClose,
}: {
  record: HistoryRecord | null;
  onClose: () => void;
}) {
  const { printers, receiptLayout, invoiceLayout, rolePermissions } = useBilling();
  const { role } = useAuth();
  const { store } = useStoreInfo(true);
  const allowed = can(role, "cetak.struk", rolePermissions);

  const print = (kind: "receipt" | "invoice") => {
    if (!record) return;
    if (!allowed) {
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

  return (
    <Dialog open={Boolean(record)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pembayaran lunas</DialogTitle>
          <DialogDescription>
            {record ? `${record.stationName} · ${formatRupiah(record.total)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => print("receipt")}>
            <Printer className="size-4" /> Cetak struk
          </Button>
          <Button variant="outline" onClick={() => print("invoice")}>
            <Printer className="size-4" /> Cetak invoice
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
