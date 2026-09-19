import { useEffect, useRef, useState } from "react";
import { Nfc, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBilling } from "@/lib/billing-store";

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

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Kolom nomor kartu. Tiga cara mengisi:
 * 1. Pembaca kartu USB mode keyboard (HID): mengetik nomor lalu Enter — kolom
 *    ini fokus otomatis, dan ketikan cepat tetap ditangkap walau fokus berpindah.
 * 2. Tombol Scan NFC pada ponsel/tablet dengan NFC bawaan (Chrome Android).
 * 3. Ketik manual lalu Enter.
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
  const { cardUsbReaderMode } = useBilling();
  const [scanning, setScanning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bufferRef = useRef<{ text: string; last: number }>({ text: "", last: 0 });
  const canNfc = nfcSupported();

  useEffect(() => () => abortRef.current?.abort(), []);

  // Fokus otomatis supaya pembaca USB (mode keyboard) bisa langsung mengetik
  // tanpa kasir menyentuh layar dulu.
  useEffect(() => {
    if (autoFocus || cardUsbReaderMode) inputRef.current?.focus();
  }, [autoFocus, cardUsbReaderMode]);

  // Tangkap ketikan cepat dari pembaca USB walau fokus tidak di kolom ini:
  // karakter beruntun <100 md diakhiri Enter dianggap hasil scan kartu.
  useEffect(() => {
    if (!cardUsbReaderMode) return;
    const onKey = (event: KeyboardEvent) => {
      // Ketikan yang masuk ke kolom lain (atau kolom ini sendiri) dibiarkan
      // mengalir normal — kolom ini sudah menangani Enter-nya sendiri.
      if (isEditableTarget(event.target)) {
        bufferRef.current = { text: "", last: 0 };
        return;
      }
      const now = Date.now();
      const buf = bufferRef.current;
      if (event.key === "Enter") {
        const text = buf.text;
        bufferRef.current = { text: "", last: 0 };
        if (text.length >= 4 && now - buf.last < 1000) {
          event.preventDefault();
          onChange(text);
          onSubmit?.(text);
          toast.success(`Kartu terbaca: ${text}`);
        }
        return;
      }
      if (event.key.length !== 1) return;
      const text = now - buf.last < 100 ? buf.text + event.key : event.key;
      bufferRef.current = { text, last: now };
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardUsbReaderMode, onChange, onSubmit]);

  const startScan = async () => {
    if (!canNfc) return;
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
            ref={inputRef}
            className="pl-9"
            autoFocus={autoFocus}
            value={value}
            placeholder={canNfc ? "Tempel kartu atau ketik nomor" : "Tempel kartu ke pembaca USB atau ketik nomor"}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit?.(value);
              }
            }}
          />
        </div>
        {canNfc && (
          <Button type="button" variant="secondary" onClick={startScan} disabled={scanning}>
            <Nfc className="size-4" /> {scanning ? "Menunggu kartu" : "Scan NFC"}
          </Button>
        )}
      </div>
      {!canNfc && (
        <p className="text-xs text-muted-foreground">
          Perangkat ini tidak memiliki NFC bawaan, jadi tombol Scan NFC tidak tersedia. Gunakan
          pembaca kartu USB mode keyboard (tempel kartu, nomor terisi otomatis) atau ketik nomor
          kartu lalu Enter.
        </p>
      )}
    </div>
  );
}
