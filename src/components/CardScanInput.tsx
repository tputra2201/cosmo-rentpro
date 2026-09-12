import { useEffect, useRef, useState } from "react";
import { Nfc, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NdefRecord = { recordType: string; data?: ArrayBuffer; encoding?: string };
type NdefReadEvent = { serialNumber?: string; message: { records: NdefRecord[] } };
type NdefReaderLike = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: NdefReadEvent) => void) | null;
  onreadingerror: (() => void) | null;
};

function nfcSupported() {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

/** Baca isi kartu: nomor pada teks NDEF, atau serial chip sebagai cadangan. */
function readCardNumber(event: NdefReadEvent) {
  for (const record of event.message?.records ?? []) {
    if (record.recordType === "text" && record.data) {
      try {
        const text = new TextDecoder(record.encoding ?? "utf-8").decode(record.data).trim();
        if (text) return text;
      } catch {
        /* lanjut ke record berikutnya */
      }
    }
  }
  return (event.serialNumber ?? "").replace(/:/g, "").toUpperCase();
}

/**
 * Kolom nomor kartu: alat pembaca USB mengetik otomatis lalu Enter,
 * atau tekan tombol Scan NFC pada ponsel/alat pembaca NFC.
 */
export function CardScanInput({
  value,
  onChange,
  onSubmit,
  label = "Nomor kartu",
  id = "card-number",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  label?: string;
  id?: string;
  autoFocus?: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const startScan = async () => {
    if (!nfcSupported()) {
      toast.error("Perangkat ini belum bisa scan NFC", {
        description: "Gunakan ponsel Android dengan Chrome, atau ketik nomor kartunya.",
      });
      return;
    }
    try {
      const Ctor = (window as unknown as { NDEFReader: new () => NdefReaderLike }).NDEFReader;
      const reader = new Ctor();
      const controller = new AbortController();
      abortRef.current = controller;
      setScanning(true);
      reader.onreading = (event) => {
        const number = readCardNumber(event);
        if (!number) return;
        onChange(number);
        onSubmit?.(number);
        setScanning(false);
        controller.abort();
        toast.success(`Kartu terbaca: ${number}`);
      };
      reader.onreadingerror = () => toast.error("Kartu gagal dibaca, coba tempelkan lagi");
      await reader.scan({ signal: controller.signal });
      toast.info("Tempelkan kartu ke bagian belakang ponsel");
    } catch {
      setScanning(false);
      toast.error("Scan NFC tidak bisa dijalankan", {
        description: "Izin NFC ditolak atau NFC belum aktif. Nomor kartu bisa diketik manual.",
      });
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            className="pl-9"
            autoFocus={autoFocus}
            value={value}
            placeholder="Tempel kartu atau ketik nomor"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit?.(value);
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" onClick={startScan} disabled={scanning}>
          <Nfc className="size-4" /> {scanning ? "Menunggu kartu" : "Scan NFC"}
        </Button>
      </div>
    </div>
  );
}
