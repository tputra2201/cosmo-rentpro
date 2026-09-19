import { useState } from "react";
import { FileSpreadsheet, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildReportWorkbook, downloadFile, type ExcelFile } from "@/lib/report-excel";
import { emailReport } from "@/lib/report-email.functions";

async function toBase64(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Ekspor laporan yang sedang tampil ke Excel: simpan lokal atau kirim ke email store. */
export function ExportExcelButton({
  targetRef,
  title,
  periodText,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  periodText: string;
}) {
  const [busy, setBusy] = useState<"local" | "email" | null>(null);
  const [open, setOpen] = useState(false);
  const [extraEmail, setExtraEmail] = useState("");
  const send = useServerFn(emailReport);

  const build = async (): Promise<ExcelFile | null> => {
    const node = targetRef.current;
    if (!node) {
      toast.error("Tidak ada isi laporan untuk diekspor");
      return null;
    }
    return buildReportWorkbook(node, title, periodText);
  };

  const sendEmail = async () => {
    setBusy("email");
    try {
      const file = await build();
      if (file) {
        const res = await send({
          data: {
            title,
            periodText,
            fileName: file.fileName,
            base64: await toBase64(file.blob),
            ...(extraEmail.trim() ? { extraEmail: extraEmail.trim() } : {}),
          },
        });
        const terkirim = res.recipients.filter((e) => !res.suppressed.includes(e));
        if (terkirim.length > 0) {
          toast.success(`Laporan dikirim ke ${terkirim.join(", ")}`);
        } else {
          toast.error("Email tidak bisa dikirim ke alamat tersebut.");
        }
        setOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim laporan");
    } finally {
      setBusy(null);
    }
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

      <Button variant="outline" disabled={busy !== null} onClick={() => setOpen(true)}>
        <Mail className="size-4" /> Excel ke Email
      </Button>

      <Dialog open={open} onOpenChange={(v) => (busy ? null : setOpen(v))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kirim laporan ke email</DialogTitle>
            <DialogDescription>
              Laporan dikirim ke Email Store (diatur di Setup → Store) sebagai tautan unduh
              berkas Excel yang berlaku 7 hari.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="extra-email">Kirim juga ke (opsional)</Label>
            <Input
              id="extra-email"
              type="email"
              placeholder="pemilik@email.com"
              value={extraEmail}
              onChange={(e) => setExtraEmail(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy !== null}>
              Batal
            </Button>
            <Button onClick={sendEmail} disabled={busy !== null}>
              {busy === "email" ? <Loader2 className="size-4 animate-spin" /> : null} Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
