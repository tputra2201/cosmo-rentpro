import { useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { buildReportWorkbook, downloadFile, type ExcelFile } from "@/lib/report-excel";
import { uploadReportToDrive } from "@/lib/drive-export.functions";

async function toBase64(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Ekspor laporan yang sedang tampil ke Excel: simpan lokal atau ke Google Drive. */
export function ExportExcelButton({
  targetRef,
  title,
  periodText,
  folderName,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  periodText: string;
  /** Nama folder di Google Drive, biasanya nama store. */
  folderName: string;
}) {
  const [busy, setBusy] = useState<"local" | "drive" | null>(null);
  const upload = useServerFn(uploadReportToDrive);

  const build = async (): Promise<ExcelFile | null> => {
    const node = targetRef.current;
    if (!node) {
      toast.error("Tidak ada isi laporan untuk diekspor");
      return null;
    }
    return buildReportWorkbook(node, title, periodText);
  };

  return (
    <>
      <Button
        variant="outline"
        disabled={busy !== null}
        onClick={async () => {
          setBusy("local");
          try {
            const file = await build();
            if (file) {
              downloadFile(file);
              toast.success(`Tersimpan sebagai ${file.fileName}`);
            }
          } catch {
            toast.error("Gagal membuat berkas Excel");
          } finally {
            setBusy(null);
          }
        }}
      >
        {busy === "local" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="size-4" />
        )}{" "}
        Excel
      </Button>

      <Button
        variant="outline"
        disabled={busy !== null}
        onClick={async () => {
          setBusy("drive");
          try {
            const file = await build();
            if (file) {
              const res = await upload({
                data: {
                  fileName: file.fileName,
                  folderName,
                  base64: await toBase64(file.blob),
                },
              });
              toast.success(`Tersimpan di Google Drive: ${res.folder}`);
            }
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Gagal menyimpan ke Google Drive",
            );
          } finally {
            setBusy(null);
          }
        }}
      >
        {busy === "drive" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}{" "}
        Excel ke Drive
      </Button>
    </>
  );
}
