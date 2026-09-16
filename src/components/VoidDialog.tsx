import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Konfirmasi pembatalan (VOID) transaksi beserta alasannya. */
export function VoidDialog({
  open,
  onOpenChange,
  sourceName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>VOID {sourceName}</DialogTitle>
          <DialogDescription>
            Seluruh transaksi dan pesanan {sourceName} dibatalkan tanpa pembayaran. Kejadian
            ini dicatat di Laporan VOID dan Log Book beserta nama Anda.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="void-reason">Alasan VOID</Label>
          <Textarea
            id="void-reason"
            value={reason}
            placeholder="mis. PS rusak, pelanggan batal, salah input"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3}
            onClick={() => onConfirm(reason.trim())}
          >
            VOID sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
