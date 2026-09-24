import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, Clock, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBilling, canCheckIn, bookingMinutes, formatRupiah, BOOKING_DP_CATEGORY_ID, BOOKING_DP_USED_CATEGORY_ID, CHECKIN_LEAD_MS, type BookingAddon, type BookingStatus } from "@/lib/billing-store";
import { useCan } from "@/lib/use-can";

/** Baris pemilih Additional Rental untuk reservasi (barang, jumlah, durasi). */
function AddonRowsEditor({ rows, onChange }: { rows: BookingAddon[]; onChange: (next: BookingAddon[]) => void }) {
  const { addonRentals } = useBilling();
  const options = addonRentals.filter((item) => item.active);
  const [pick, setPick] = useState("");
  const [qty, setQty] = useState("1");
  const [minutes, setMinutes] = useState("");
  const picked = options.find((item) => item.id === pick);

  const add = () => {
    if (!picked) { toast.error("Pilih barang additional rental"); return; }
    const count = Math.max(1, Math.round(Number(qty) || 1));
    const mins = picked.mode === "hourly" ? Math.max(0, Math.round(Number(minutes) || 0)) : 0;
    onChange([...rows, { addonId: picked.id, qty: count, ...(mins > 0 ? { minutes: mins } : {}) }]);
    setPick(""); setQty("1"); setMinutes("");
  };

  if (options.length === 0) return <p className="text-sm text-muted-foreground">Belum ada barang di Setup Price → Additional Rental.</p>;

  return <div className="space-y-2">
    {rows.map((row, index) => {
      const item = options.find((opt) => opt.id === row.addonId) ?? addonRentals.find((opt) => opt.id === row.addonId);
      return <div key={`${row.addonId}-${index}`} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="min-w-0 truncate">{item?.name ?? "Barang"} × {row.qty}{item?.mode === "hourly" ? ` · ${row.minutes ? `${row.minutes} menit` : "ikut sesi"}` : ""}</span>
        <Button size="icon" variant="ghost" aria-label="Hapus additional rental" onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 className="size-4 text-destructive"/></Button>
      </div>;
    })}
    <div className="grid gap-2 sm:grid-cols-[1fr_70px_90px_auto]">
      <Select value={pick} onValueChange={setPick}><SelectTrigger><SelectValue placeholder="Pilih barang"/></SelectTrigger><SelectContent>{options.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {formatRupiah(item.price)}{item.mode === "hourly" ? "/jam" : ""}</SelectItem>)}</SelectContent></Select>
      <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Jumlah"/>
      {picked?.mode === "hourly" ? <Input type="number" min={0} step={15} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="menit" aria-label="Durasi (menit)"/> : <span />}
      <Button type="button" variant="outline" onClick={add}><Plus className="size-4"/></Button>
    </div>
  </div>;
}

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({ meta: [
    { title: "Reservasi Rental — RenToPlay" },
    { name: "description", content: "Kelola jadwal reservasi unit PlayStation dan cegah bentrok pemakaian." },
    { property: "og:title", content: "Reservasi Rental — RenToPlay" },
    { property: "og:description", content: "Agenda reservasi unit PlayStation dengan pemeriksaan jadwal otomatis." },
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
  const { bookings, stations, customers, paymentMethods, addBooking, updateBooking, removeBooking, addCashEntry } = useBilling();
  const allow = useCan();
  const initialStart = useMemo(() => { const date = new Date(); date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0); return date; }, []);
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [start, setStart] = useState(localInputValue(initialStart));
  const [durHours, setDurHours] = useState("1");
  const [durMinutes, setDurMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [addonRows, setAddonRows] = useState<BookingAddon[]>([]);
  const [dp, setDp] = useState("");
  const activePayments = paymentMethods.filter((item) => item.active);
  const [dpPayment, setDpPayment] = useState(activePayments[0]?.name ?? "Cash");

  const ordered = [...bookings].sort((a, b) => a.startAt - b.startAt);
  const now = Date.now();
  const checkedIn = ordered.filter((item) => item.status === "checked-in");
  const upcoming = ordered.filter((item) => item.endAt >= now && item.status === "confirmed");
  const past = ordered.filter((item) => !upcoming.includes(item) && !checkedIn.includes(item));

  const chooseCustomer = (id: string) => {
    setCustomerId(id);
    const customer = customers.find((item) => item.id === id);
    if (customer) { setName(customer.name); setPhone(customer.phone); }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const startAt = new Date(start).getTime();
    const durH = Math.max(0, Math.floor(Number(durHours) || 0));
    const durM = Math.max(0, Math.floor(Number(durMinutes) || 0));
    const minutes = durH * 60 + durM;
    if (!stationId || !name.trim() || !Number.isFinite(startAt) || minutes <= 0) { toast.error("Lengkapi data reservasi — durasi minimal 1 menit"); return; }
    const dpAmount = Math.max(0, Math.round(Number(dp) || 0));
    const ok = addBooking({ stationId, ...(customerId ? { customerId } : {}), customerName: name.trim(), customerPhone: phone.trim(), startAt, endAt: startAt + minutes * 60000, notes, ...(addonRows.length ? { addons: addonRows } : {}), ...(dpAmount > 0 ? { dpAmount, dpPayment } : {}) });
    if (!ok) { toast.error("Jadwal bentrok dengan reservasi lain pada unit tersebut"); return; }
    if (dpAmount > 0) {
      const cash = addCashEntry({ categoryId: BOOKING_DP_CATEGORY_ID, amount: dpAmount, payment: dpPayment, note: `DP reservasi ${name.trim()}` });
      if (!cash) toast.error("DP belum tercatat di kas — buka shift kasir lebih dulu");
    }
    toast.success("Reservasi berhasil ditambahkan"); setName(""); setPhone(""); setCustomerId(""); setNotes(""); setAddonRows([]); setDp("");
  };

  return <div className="space-y-8">
    <header><h1 className="text-3xl font-bold sm:text-4xl">Reservasi</h1></header>
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="surface-panel space-y-4 p-5">
        <div className="flex items-center gap-2"><Plus className="size-5 text-primary"/><h2 className="text-lg font-semibold">Reservasi baru</h2></div>
        <div className="space-y-1.5"><Label>Unit</Label><Select value={stationId} onValueChange={setStationId}><SelectTrigger><SelectValue placeholder="Pilih unit"/></SelectTrigger><SelectContent>{stations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.console}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Pelanggan tersimpan</Label><Select value={customerId || "guest"} onValueChange={(value) => value === "guest" ? setCustomerId("") : chooseCustomer(value)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="guest">Pelanggan baru / umum</SelectItem>{customers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.phone || "tanpa nomor"}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><div className="space-y-1.5"><Label htmlFor="booking-name">Nama</Label><Input id="booking-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama pelanggan"/></div><div className="space-y-1.5"><Label htmlFor="booking-phone">Nomor HP</Label><Input id="booking-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08..."/></div></div>
        <div className="space-y-1.5"><Label htmlFor="booking-start">Mulai</Label><Input id="booking-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}/></div>
        <div className="space-y-1.5"><Label>Durasi</Label><div className="grid grid-cols-2 gap-2"><div className="relative"><Input id="booking-duration-hours" type="number" min={0} max={24} value={durHours} onChange={(e) => setDurHours(e.target.value)} className="pr-12" aria-label="Durasi jam"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Jam</span></div><div className="relative"><Input id="booking-duration-minutes" type="number" min={0} max={59} value={durMinutes} onChange={(e) => setDurMinutes(e.target.value)} className="pr-14" aria-label="Durasi menit"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Menit</span></div></div></div>
        <div className="space-y-1.5"><Label htmlFor="booking-notes">Catatan</Label><Input id="booking-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan opsional"/></div>
        <div className="space-y-1.5"><Label>Additional Rental</Label><AddonRowsEditor rows={addonRows} onChange={setAddonRows}/></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-1.5"><Label htmlFor="booking-dp">DP (uang muka)</Label><Input id="booking-dp" type="number" min={0} step={1000} value={dp} onChange={(e) => setDp(e.target.value)} placeholder="0"/></div>
          <div className="space-y-1.5"><Label>Metode pembayaran DP</Label><Select value={dpPayment} onValueChange={setDpPayment}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{activePayments.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <p className="text-xs text-muted-foreground">DP dicatat sebagai kas masuk (bukan penghasilan) dan otomatis dipakai sebagai pembayaran saat check-in.</p>
        <Button className="w-full" type="submit" disabled={!allow("booking.buat")}><CalendarDays className="size-4"/> Simpan Reservasi</Button>
      </form>
      <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Agenda mendatang</h2><Badge variant="secondary">{upcoming.length} reservasi</Badge></div>{upcoming.length === 0 ? <div className="surface-panel p-10 text-center text-muted-foreground">Belum ada reservasi mendatang.</div> : <div className="space-y-3">{upcoming.map((item) => <BookingRow key={item.id} item={item} stationName={stations.find((station) => station.id === item.stationId)?.name ?? "Unit"} onStatus={(status) => updateBooking(item.id, { status })} onDelete={() => removeBooking(item.id)}/>)}</div>}
      {checkedIn.length > 0 && <div className="pt-3"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Already Check-In</h2><Badge variant="secondary">{checkedIn.length} reservasi</Badge></div><div className="space-y-3">{checkedIn.map((item) => <BookingRow key={item.id} item={item} locked stationName={stations.find((station) => station.id === item.stationId)?.name ?? "Unit"} onStatus={(status) => updateBooking(item.id, { status })} onDelete={() => removeBooking(item.id)}/>)}</div></div>}
      {past.length > 0 &&  <div className="pt-3"><h2 className="mb-3 text-lg font-semibold">Riwayat reservasi</h2><div className="space-y-3 opacity-75">{past.slice(-8).reverse().map((item) => <BookingRow key={item.id} item={item} stationName={stations.find((station) => station.id === item.stationId)?.name ?? "Unit"} onStatus={(status) => updateBooking(item.id, { status })} onDelete={() => removeBooking(item.id)}/>)}</div></div>}</div>
    </section>
  </div>;
}

type BookingItem = ReturnType<typeof useBilling>["bookings"][number];

function BookingRow({ item, stationName, locked, onStatus, onDelete }: { item: BookingItem; stationName: string; locked?: boolean; onStatus: (status: BookingStatus) => void; onDelete: () => void }) {
  const { now, stations, addonRentals, startSession, updateBooking, addSessionAddon, settleSession, addCashEntry } = useBilling();
  const dpAmount = Math.max(0, Math.round(item.dpAmount ?? 0));
  const addonText = (item.addons ?? [])
    .map((row) => {
      const addon = addonRentals.find((a) => a.id === row.addonId);
      const dur = addon?.mode === "hourly" ? (row.minutes ? ` ${row.minutes} menit` : " ikut sesi") : "";
      return `${addon?.name ?? "Barang"} × ${row.qty}${dur}`;
    })
    .join(" · ");
  const minutes = bookingMinutes(item);
  const ready = canCheckIn(item, now);
  const opensAt = new Date(item.startAt - CHECKIN_LEAD_MS).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const readOnly = locked || item.status === "checked-in";
  const allow = useCan();

  const checkIn = () => {
    if (!ready) { toast.error(`Check-in baru bisa dilakukan mulai ${opensAt} (1 jam sebelum jadwal)`); return; }
    const station = stations.find((s) => s.id === item.stationId);
    if (!station) { toast.error("Unit tidak ditemukan"); return; }
    if (station.session) { toast.error(`${station.name} masih dipakai sesi lain`); return; }
    startSession(item.stationId, "prepaid", minutes, {
      customerName: item.customerName,
      customerPhone: item.customerPhone ?? "",
      ...(item.customerId ? { customerId: item.customerId } : {}),
      bookingId: item.id,
      packageName: `Reservasi ${minutes} Menit`,
      notes: item.notes ?? "",
    });
    for (const row of item.addons ?? []) {
      addSessionAddon(item.stationId, row.addonId, Math.max(1, row.qty), row.minutes);
    }
    if (dpAmount > 0 && !item.dpUsedAt) {
      const paid = settleSession(item.stationId, {
        payment: item.dpPayment || "Cash",
        amount: dpAmount,
        amountPaid: dpAmount,
      });
      if (paid) {
        addCashEntry({
          categoryId: BOOKING_DP_USED_CATEGORY_ID,
          amount: dpAmount,
          payment: item.dpPayment || "Cash",
          note: `DP reservasi ${item.customerName} dipakai di ${station.name}`,
        });
        updateBooking(item.id, { status: "checked-in", dpUsedAt: Date.now() });
        toast.success(`${item.customerName} check-in di ${station.name} · DP ${formatRupiah(dpAmount)} sudah dipakai`);
        return;
      }
      toast.error("DP belum bisa dipakai — buka shift kasir lebih dulu");
    }
    updateBooking(item.id, { status: "checked-in" });
    toast.success(`${item.customerName} check-in di ${station.name} · ${minutes} menit`);
  };

  return <article className="surface-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.customerName}</h3><Badge variant={item.status === "cancelled" ? "destructive" : "outline"}>{statusLabel[item.status]}</Badge></div><p className="mt-1 text-sm text-muted-foreground"><Clock className="mr-1 inline size-3.5"/>{new Date(item.startAt).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} – {new Date(item.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · {stationName} · {minutes} menit</p>{item.status === "confirmed" && !ready && <p className="mt-1 text-xs text-warning">Check-in tersedia mulai {opensAt}</p>}{addonText && <p className="mt-1 text-sm">Additional rental: {addonText}</p>}{dpAmount > 0 && <p className="mt-1 text-sm">DP {formatRupiah(dpAmount)} · {item.dpPayment || "Cash"}{item.dpUsedAt ? " · sudah dipakai" : ""}</p>}{item.notes && <p className="mt-1 text-sm">{item.notes}</p>}</div><div className="flex shrink-0 gap-2">{item.status === "confirmed" && allow("booking.checkin") && <Button size="sm" onClick={checkIn} disabled={!ready}><CheckCircle2 className="size-4"/> Check-in</Button>}{!readOnly && <>{allow("booking.ubah") && <EditBookingDialog item={item}/>}{item.status !== "completed" && item.status !== "cancelled" && allow("booking.batal") && <Button size="icon" variant="outline" onClick={() => onStatus("cancelled")} aria-label="Batalkan reservasi"><XCircle className="size-4"/></Button>}{allow("booking.hapus") && <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Hapus reservasi"><Trash2 className="size-4"/></Button>}</>}</div></article>;
}

function EditBookingDialog({ item }: { item: BookingItem }) {
  const { stations, updateBooking } = useBilling();
  const [open, setOpen] = useState(false);
  const [stationId, setStationId] = useState(item.stationId);
  const [name, setName] = useState(item.customerName);
  const [phone, setPhone] = useState(item.customerPhone ?? "");
  const [start, setStart] = useState(localInputValue(new Date(item.startAt)));
  const [duration, setDuration] = useState(String(Math.max(15, Math.round((item.endAt - item.startAt) / 60000))));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [status, setStatus] = useState<BookingStatus>(item.status);
  const [addonRows, setAddonRows] = useState<BookingAddon[]>(item.addons ?? []);


  const openChange = (value: boolean) => {
    setOpen(value);
    if (value) {
      setStationId(item.stationId); setName(item.customerName); setPhone(item.customerPhone ?? "");
      setStart(localInputValue(new Date(item.startAt)));
      setDuration(String(Math.max(15, Math.round((item.endAt - item.startAt) / 60000))));
      setNotes(item.notes ?? ""); setStatus(item.status); setAddonRows(item.addons ?? []);
    }
  };

  const save = () => {
    const startAt = new Date(start).getTime();
    const minutes = Number(duration);
    if (!stationId || !name.trim() || !Number.isFinite(startAt) || !Number.isFinite(minutes) || minutes <= 0) { toast.error("Lengkapi data reservasi"); return; }
    const ok = updateBooking(item.id, { stationId, customerName: name.trim(), customerPhone: phone.trim(), startAt, endAt: startAt + minutes * 60000, notes, status, addons: addonRows });
    if (!ok) { toast.error("Jadwal bentrok dengan reservasi lain pada unit tersebut"); return; }
    toast.success("Reservasi diperbarui"); setOpen(false);
  };

  return <Dialog open={open} onOpenChange={openChange}>
    <DialogTrigger asChild><Button size="icon" variant="outline" aria-label="Ubah reservasi"><Pencil className="size-4"/></Button></DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Ubah reservasi</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5"><Label>Unit</Label><Select value={stationId} onValueChange={setStationId}><SelectTrigger><SelectValue placeholder="Pilih unit"/></SelectTrigger><SelectContent>{stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.console}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor={`edit-name-${item.id}`}>Nama</Label><Input id={`edit-name-${item.id}`} value={name} onChange={(e) => setName(e.target.value)}/></div><div className="space-y-1.5"><Label htmlFor={`edit-phone-${item.id}`}>Nomor HP</Label><Input id={`edit-phone-${item.id}`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08..."/></div></div>
        <div className="space-y-1.5"><Label htmlFor={`edit-start-${item.id}`}>Mulai</Label><Input id={`edit-start-${item.id}`} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}/></div>
        <div className="space-y-1.5"><Label htmlFor={`edit-duration-${item.id}`}>Durasi (menit)</Label><Input id={`edit-duration-${item.id}`} type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)}/></div>
        <div className="space-y-1.5"><Label>Status</Label><Select value={status} onValueChange={(value) => setStatus(value as BookingStatus)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{(Object.keys(statusLabel) as BookingStatus[]).map((key) => <SelectItem key={key} value={key}>{statusLabel[key]}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor={`edit-notes-${item.id}`}>Catatan</Label><Input id={`edit-notes-${item.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan opsional"/></div>
        <div className="space-y-1.5"><Label>Additional Rental</Label><AddonRowsEditor rows={addonRows} onChange={setAddonRows}/></div>
        {(item.dpAmount ?? 0) > 0 && <p className="text-sm text-muted-foreground">DP {formatRupiah(item.dpAmount ?? 0)} · {item.dpPayment || "Cash"}{item.dpUsedAt ? " · sudah dipakai saat check-in" : " · dipakai otomatis saat check-in"}</p>}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save}>Simpan perubahan</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}