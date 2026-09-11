import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBilling, type BookingStatus } from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({ meta: [
    { title: "Booking Rental — Billing Rental PS" },
    { name: "description", content: "Kelola jadwal booking unit PlayStation dan cegah bentrok pemakaian." },
    { property: "og:title", content: "Booking Rental — Billing Rental PS" },
    { property: "og:description", content: "Agenda booking unit PlayStation dengan pemeriksaan jadwal otomatis." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: BookingPage,
});

const statusLabel: Record<BookingStatus, string> = { confirmed: "Dikonfirmasi", "checked-in": "Check-in", completed: "Selesai", cancelled: "Dibatalkan" };

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function BookingPage() {
  const { bookings, stations, customers, addBooking, updateBooking, removeBooking } = useBilling();
  const initialStart = useMemo(() => { const date = new Date(); date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0); return date; }, []);
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [start, setStart] = useState(localInputValue(initialStart));
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");

  const ordered = [...bookings].sort((a, b) => a.startAt - b.startAt);
  const now = Date.now();
  const upcoming = ordered.filter((item) => item.endAt >= now && item.status !== "cancelled" && item.status !== "completed");
  const past = ordered.filter((item) => !upcoming.includes(item));

  const chooseCustomer = (id: string) => {
    setCustomerId(id);
    const customer = customers.find((item) => item.id === id);
    if (customer) { setName(customer.name); setPhone(customer.phone); }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const startAt = new Date(start).getTime();
    const minutes = Number(duration);
    if (!stationId || !name.trim() || !Number.isFinite(startAt) || minutes <= 0) { toast.error("Lengkapi data booking"); return; }
    const ok = addBooking({ stationId, ...(customerId ? { customerId } : {}), customerName: name.trim(), customerPhone: phone.trim(), startAt, endAt: startAt + minutes * 60000, notes });
    if (!ok) { toast.error("Jadwal bentrok dengan booking lain pada unit tersebut"); return; }
    toast.success("Booking berhasil ditambahkan"); setName(""); setPhone(""); setCustomerId(""); setNotes("");
  };

  return <div className="space-y-8">
    <header><h1 className="text-3xl font-bold sm:text-4xl">Booking</h1><p className="mt-1 text-muted-foreground">Atur reservasi unit dan cegah jadwal bertumpuk.</p></header>
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="surface-panel space-y-4 p-5">
        <div className="flex items-center gap-2"><Plus className="size-5 text-primary"/><h2 className="text-lg font-semibold">Booking baru</h2></div>
        <div className="space-y-1.5"><Label>Unit</Label><Select value={stationId} onValueChange={setStationId}><SelectTrigger><SelectValue placeholder="Pilih unit"/></SelectTrigger><SelectContent>{stations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.console}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Pelanggan tersimpan</Label><Select value={customerId || "guest"} onValueChange={(value) => value === "guest" ? setCustomerId("") : chooseCustomer(value)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="guest">Pelanggan baru / umum</SelectItem>{customers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.phone || "tanpa nomor"}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><div className="space-y-1.5"><Label htmlFor="booking-name">Nama</Label><Input id="booking-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama pelanggan"/></div><div className="space-y-1.5"><Label htmlFor="booking-phone">Nomor HP</Label><Input id="booking-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08..."/></div></div>
        <div className="space-y-1.5"><Label htmlFor="booking-start">Mulai</Label><Input id="booking-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}/></div>
        <div className="space-y-1.5"><Label>Durasi</Label><Select value={duration} onValueChange={setDuration}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{[30,60,90,120,180,240].map((item) => <SelectItem key={item} value={String(item)}>{item} menit</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="booking-notes">Catatan</Label><Input id="booking-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan opsional"/></div>
        <Button className="w-full" type="submit"><CalendarDays className="size-4"/> Simpan Booking</Button>
      </form>
      <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Agenda mendatang</h2><Badge variant="secondary">{upcoming.length} booking</Badge></div>{upcoming.length === 0 ? <div className="surface-panel p-10 text-center text-muted-foreground">Belum ada booking mendatang.</div> : <div className="space-y-3">{upcoming.map((item) => <BookingRow key={item.id} item={item} stationName={stations.find((station) => station.id === item.stationId)?.name ?? "Unit"} onStatus={(status) => updateBooking(item.id, { status })} onDelete={() => removeBooking(item.id)}/>)}</div>}
      {past.length > 0 && <div className="pt-3"><h2 className="mb-3 text-lg font-semibold">Riwayat booking</h2><div className="space-y-3 opacity-75">{past.slice(-8).reverse().map((item) => <BookingRow key={item.id} item={item} stationName={stations.find((station) => station.id === item.stationId)?.name ?? "Unit"} onStatus={(status) => updateBooking(item.id, { status })} onDelete={() => removeBooking(item.id)}/>)}</div></div>}</div>
    </section>
  </div>;
}

function BookingRow({ item, stationName, onStatus, onDelete }: { item: ReturnType<typeof useBilling>["bookings"][number]; stationName: string; onStatus: (status: BookingStatus) => void; onDelete: () => void }) {
  return <article className="surface-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.customerName}</h3><Badge variant={item.status === "cancelled" ? "destructive" : "outline"}>{statusLabel[item.status]}</Badge></div><p className="mt-1 text-sm text-muted-foreground"><Clock className="mr-1 inline size-3.5"/>{new Date(item.startAt).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} – {new Date(item.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · {stationName}</p>{item.notes && <p className="mt-1 text-sm">{item.notes}</p>}</div><div className="flex shrink-0 gap-2">{item.status === "confirmed" && <Button size="sm" onClick={() => onStatus("checked-in")}><CheckCircle2 className="size-4"/> Check-in</Button>}{item.status !== "completed" && item.status !== "cancelled" && <Button size="icon" variant="outline" onClick={() => onStatus("cancelled")} aria-label="Batalkan booking"><XCircle className="size-4"/></Button>}<Button size="icon" variant="ghost" onClick={onDelete} aria-label="Hapus booking"><Trash2 className="size-4"/></Button></div></article>;
}