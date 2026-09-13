import { useMemo, useRef, useState } from "react";
import { CreditCard, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cardsOfCustomer } from "@/components/CustomerDetail";
import { cardLabel, formatRupiah, useBilling, type Customer } from "@/lib/billing-store";

/**
 * Kolom nama pelanggan dengan saran otomatis.
 * Klik kolom: semua pelanggan muncul. Mengetik huruf: hanya pelanggan yang
 * namanya dimulai huruf itu (atau nomor HP-nya cocok) yang tampil.
 */
export function CustomerPicker({
  id = "customer-name",
  label = "Nama pelanggan",
  value,
  onChange,
  onPick,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (name: string) => void;
  onPick: (customer: Customer) => void;
}) {
  const { customers, playingCards } = useBilling();
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = value.trim().toLowerCase();
  const options = useMemo(() => {
    const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted.slice(0, 50);
    const starts = sorted.filter((item) => item.name.toLowerCase().startsWith(query));
    const others = sorted.filter(
      (item) =>
        !item.name.toLowerCase().startsWith(query) &&
        (item.name.toLowerCase().includes(query) || item.phone.replace(/\s/g, "").includes(query)),
    );
    return [...starts, ...others].slice(0, 50);
  }, [customers, query]);

  const picked = useMemo(
    () => customers.find((item) => item.name.trim().toLowerCase() === query) ?? null,
    [customers, query],
  );
  const pickedCards = useMemo(
    () => (picked ? cardsOfCustomer(playingCards, picked) : []),
    [picked, playingCards],
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          autoComplete="off"
          placeholder="Umum"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
        />
        {open && options.length > 0 && (
          <ul
            className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
            onMouseDown={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
            }}
          >
            {options.map((item) => {
              const cards = cardsOfCustomer(playingCards, item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      onPick(item);
                      setOpen(false);
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <User className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.name}</span>
                      {item.member && (
                        <span className="shrink-0 text-xs text-primary">Member</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {cards[0]
                        ? `${cardLabel(cards[0])} · ${formatRupiah(cards[0].balance)}`
                        : item.phone || "-"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {picked && (
        <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
          <p className="font-medium">
            {picked.name}
            {picked.member ? " · Member" : ""} · {picked.level} · {picked.points} poin
          </p>
          <p className="text-muted-foreground">
            {picked.phone || "Tanpa nomor HP"} · {picked.visits} kunjungan ·{" "}
            {formatRupiah(picked.totalSpent)}
          </p>
          {pickedCards.length > 0 ? (
            pickedCards.map((card) => (
              <p key={card.id} className="mt-1 flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{cardLabel(card)}</span>
                <span>saldo {formatRupiah(card.balance)}</span>
                <span className={card.active ? "text-success" : "text-destructive"}>
                  {card.active ? "aktif" : "diblokir"}
                </span>
              </p>
            ))
          ) : (
            <p className="mt-1 text-muted-foreground">Belum punya Playing Card.</p>
          )}
        </div>
      )}
    </div>
  );
}
