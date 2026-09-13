import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/lib/billing-store";
import { printReport } from "@/lib/print-docs";
import { printerFor } from "@/lib/printing";

/** Tombol cetak isi laporan yang sedang tampil, memakai Report Printer. */
export function PrintReportButton({
  targetRef,
  title,
  label = "Cetak",
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  label?: string;
}) {
  const { printers } = useBilling();

  return (
    <Button
      variant="outline"
      onClick={() => {
        const printer = printerFor(printers, "report");
        if (!printer) {
          toast.error("Report Printer belum diatur di menu Printer");
          return;
        }
        const html = targetRef.current?.innerHTML;
        if (!html) {
          toast.error("Tidak ada isi laporan untuk dicetak");
          return;
        }
        printReport(printer, title, html);
      }}
    >
      <Printer className="size-4" /> {label}
    </Button>
  );
}
