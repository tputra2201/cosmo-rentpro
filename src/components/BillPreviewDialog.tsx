import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Pratinjau bill sebelum dicetak: menampilkan isi bill apa adanya
 * (persis seperti nota yang akan keluar dari printer).
 */
export function BillPreviewDialog({
  open,
  onOpenChange,
  title = "Pratinjau Bill",
  sourceName,
  text,
  onPrint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  sourceName?: string;
  text: string;
  onPrint: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          <DialogDescription>
            {sourceName ? `${sourceName} · ` : ""}periksa dulu sebelum dicetak
          </DialogDescription>
        </DialogHeader>

        <pre className="overflow-x-auto whitespace-pre rounded-md bg-secondary p-3 text-[11px] leading-tight">
          {text}
        </pre>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button
            onClick={() => {
              onPrint();
              onOpenChange(false);
            }}
          >
            <Printer className="size-4" /> Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
