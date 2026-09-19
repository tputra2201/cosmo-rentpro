import { useEffect, useRef } from "react";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBilling } from "@/lib/billing-store";

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
 * Kolom nomor kartu. Cara mengisi:
 * 1. Tempelkan kartu ke pembaca (USB mode keyboard / HID): nomor terketik lalu Enter.
 *    Kolom ini fokus otomatis, dan setiap scan baru mengganti nomor sebelumnya
 *    supaya tidak tersambung jadi nomor dobel.
 * 2. Ketik manual lalu Enter.
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bufferRef = useRef<{ text: string; last: number }>({ text: "", last: 0 });
  // true = nomor yang ada berasal dari scan yang sudah selesai, jadi ketikan
  // berikutnya dianggap kartu baru dan menggantinya.
  const scannedRef = useRef(false);

  // Fokus otomatis supaya pembaca kartu bisa langsung mengetik tanpa kasir
  // menyentuh layar dulu.
  useEffect(() => {
    inputRef.current?.focus();
  }, [autoFocus, cardUsbReaderMode]);

  // Tangkap ketikan cepat dari pembaca walau fokus tidak di kolom ini:
  // karakter beruntun <100 md diakhiri Enter dianggap hasil scan kartu.
  useEffect(() => {
    if (!cardUsbReaderMode) return;
    const onKey = (event: KeyboardEvent) => {
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
          scannedRef.current = true;
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

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          ref={inputRef}
          className="pl-9"
          autoFocus={autoFocus}
          value={value}
          placeholder="Tempelkan kartu ke pembaca, atau ketik nomor"
          onChange={(e) => {
            scannedRef.current = false;
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (value.trim()) scannedRef.current = true;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              scannedRef.current = true;
              onSubmit?.(value);
              return;
            }
            // Kartu baru ditempel sementara nomor lama masih ada: ganti, jangan
            // disambung.
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && scannedRef.current) {
              e.preventDefault();
              scannedRef.current = false;
              onChange(e.key);
            }
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Arahkan kursor ke kolom ini lalu tempelkan kartu — nomor lama otomatis diganti nomor kartu
        yang baru. Bisa juga diketik manual lalu Enter.
      </p>
    </div>
  );
}
