import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildReportWorkbook, downloadFile } from "@/lib/report-excel";

/** Ekspor laporan yang sedang tampil ke berkas Excel siap cetak. */
export function ExportExcelButton({
  targetRef,
  title,
  periodText,
  label = "Ekspor Excel",
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  periodText: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        const node = targetRef.current;
        if (!node) {
          toast.error("Tidak ada isi laporan untuk diekspor");
          return;
        }
        setBusy(true);
        try {
          const file = await buildReportWorkbook(node, title, periodText);
          downloadFile(file);
          toast.success(`Tersimpan sebagai ${file.fileName}`);
        } catch {
          toast.error("Gagal membuat berkas Excel");
        } finally {
          setBusy(false);
        }
      }}
    >
      <FileSpreadsheet className="size-4" /> {label}
    </Button>
  );
}
