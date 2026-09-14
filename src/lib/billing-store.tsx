import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { useStoreSync, type SyncStatus } from "./store-sync";
import type { RolePermissions } from "./permissions";
import {
  defaultInvoiceLayout,
  defaultPrinters,
  defaultReceiptLayout,
  type DocLayout,
  type PrinterConfig,
} from "./printing";

export type ConsoleType = string;
export type PlayMode = "prepaid" | "open";
export type StationAvailability = "available" | "booked" | "maintenance" | "offline";
export type RoundingRule = "minute" | "30-minutes" | "hour";

export type OrderItem = {
  id: string;
  menuId?: string;
  name: string;
  price: number;
  qty: number;
};

export type Session = {
  mode: PlayMode;
  startAt: number;
  durationMin: number; // 0 for open time
  rate: number; // rupiah per hour, snapshot at start
  orders: OrderItem[];
  customerName: string;
  customerPhone: string;
  member: boolean;
  packageName: string;
  notes: string;
  bonusMin: number; // waktu ekstra/pengurangan tanpa mengubah tarif
  customerId?: string;
  bookingId?: string;
  promoName?: string;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  discountMax?: number;
  settlements?: Settlement[];
  historyId?: string; // nota yang sudah dibuat saat tagihan lunas
  paidAt?: number; // waktu tagihan dinyatakan lunas
  pausedAt?: number; // jika terisi, timer sedang dijeda
  pausedMs?: number; // akumulasi total waktu jeda
};


export type Settlement = {
  id: string;
  at: number;
  payment: string;
  payments?: { method: string; amount: number }[];
  amount: number; // jumlah yang dibayarkan ke tagihan
  amountPaid: number; // uang diterima
  change: number;
};


export type Station = {
  id: string;
  name: string;
  console: ConsoleType;
  booth: string;
  availability: StationAvailability;
  session: Session | null;
  sort?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  sort?: number;
  /** Potongan harga khusus untuk item ini (Playing Card / Member). */
  discount?: ItemDiscount;
  /** Cetak label saat pesanan dibuat (default: ya). */
  printEnabled?: boolean;
  /** Printer label tujuan (Kitchen / Bar). */
  printerId?: string;
};

export type CafeTable = {
  id: string;
  name: string; // nomor meja
  area: string;
  seats: number;
  customerName: string;
  notes: string;
  openedAt: number | null;
  orders: OrderItem[];
  sort?: number;
};


export type PaymentMethod = { id: string; name: string; active: boolean; sort?: number };
export type RentalPackage = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  active: boolean;
  sort?: number;
};

export type CustomerLevel = "Bronze" | "Silver" | "Gold";
export type Customer = {
  id: string;
  name: string;
  phone: string;
  member: boolean;
  level: CustomerLevel;
  points: number;
  visits: number;
  totalSpent: number;
  createdAt: number;
};
export type BookingStatus = "confirmed" | "checked-in" | "completed" | "cancelled";
export type Booking = {
  id: string;
  stationId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  startAt: number;
  endAt: number;
  notes: string;
  status: BookingStatus;
};
export type Promotion = {
  id: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  minSpend: number;
  maxDiscount: number;
  startsAt: number;
  endsAt: number;
  active: boolean;
  /** Berlaku otomatis pada setiap transaksi selama periode berjalan (happy hour). */
  auto?: boolean;
  /** Jam mulai/selesai harian, format "HH:MM". Kosong berarti sepanjang hari. */
  startTime?: string;
  endTime?: string;
};
export type PointEntry = { id: string; customerId: string; points: number; reason: string; createdAt: number };

/** Kartu bermain (Playing Card) berchip RFID Mifare Classic 13,56 MHz. */
export type PlayingCard = {
  id: string;
  cardNumber: string;
  /** Kode kartu (alfanumerik) yang dicetak/ditempel di kartu. */
  cardCode?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  member: boolean;
  balance: number;
  active: boolean;
  cardPrice: number;
  createdAt: number;
  sort?: number;
};

export type CardEntryType = "purchase" | "topup" | "payment" | "adjust";
export type CardEntry = {
  id: string;
  cardId: string;
  cardNumber: string;
  cardCode?: string;
  type: CardEntryType;
  amount: number;
  balanceAfter: number;
  note: string;
  createdAt: number;
};

/** Label kartu: nomor kartu + kode kartu bila ada. */
export function cardLabel(card?: { cardNumber: string; cardCode?: string } | null) {
  if (!card) return "";
  const code = card.cardCode?.trim();
  return code ? `${card.cardNumber} · ${code}` : card.cardNumber;
}


export const CARD_PAYMENT_NAME = "Playing Card";
/** Top-up kartu hanya deposit: masuk kas, tapi bukan penghasilan. */
export const CARD_TOPUP_CATEGORY_ID = "cc-topup-card";
/** Penjualan kartu baru: penghasilan store. */
export const CARD_SALE_CATEGORY_ID = "cc-jual-kartu";

/** Metode pembayaran yang boleh dipakai untuk beli kartu / top up saldo. */
export const CARD_FUNDING_METHODS = [
  "Cash",
  "QRIS",
  "Transfer Bank BCA",
  "Transfer Bank Mandiri",
] as const;

/** Cari kartu berdasarkan nomor kartu atau kode kartu (tidak peka huruf besar/kecil). */
export function findCardByNumber(cards: PlayingCard[], cardNumber: string) {
  const key = cardNumber.trim().toLowerCase();
  if (!key) return undefined;
  return (
    cards.find((c) => c.cardNumber.trim().toLowerCase() === key) ??
    cards.find((c) => (c.cardCode ?? "").trim().toLowerCase() === key)
  );
}

/** Potongan harga (persen) untuk pembayaran memakai saldo Playing Card. */
export function cardDiscountPercentFor(
  card: PlayingCard,
  settings: { cardDiscountPercent: number; cardMemberDiscountPercent: number },
) {
  const pct = card.member ? settings.cardMemberDiscountPercent : settings.cardDiscountPercent;
  return Math.min(100, Math.max(0, pct ?? 0));
}
export type DiscountType = "percent" | "fixed";

/**
 * Potongan harga per item yang dijual.
 * `type: "fixed"` berarti rupiah (untuk rental: rupiah per jam),
 * `type: "percent"` berarti persen dari harga item.
 */
export type ItemDiscount = { type: DiscountType; card: number; member: number };

export const emptyItemDiscount: ItemDiscount = { type: "fixed", card: 0, member: 0 };

export type DiscountContext = { member: boolean; card: boolean };

/** Potongan yang dipakai adalah yang paling besar (member atau Playing Card). */
export function itemDiscountAmount(
  discount: ItemDiscount | undefined,
  base: number,
  units: number,
  ctx: DiscountContext,
  fallbackPercent = 0,
) {
  if (base <= 0) return 0;
  const values: number[] = [];
  if (discount) {
    if (ctx.card) values.push(discount.card ?? 0);
    if (ctx.member) values.push(discount.member ?? 0);
  }
  const value = values.length ? Math.max(...values) : 0;
  const type = discount?.type ?? "fixed";
  const own = value <= 0 ? 0 : type === "percent" ? (base * value) / 100 : value * Math.max(0, units);
  // Potongan yang sudah ditetapkan per item selalu menang. Potongan umum kartu
  // hanya dipakai kalau item itu belum punya angka sendiri.
  if (own > 0) return Math.min(base, Math.round(own));
  const fallback = ctx.card && fallbackPercent > 0 ? (base * fallbackPercent) / 100 : 0;
  return Math.min(base, Math.round(fallback));
}

/** Total potongan per item untuk daftar pesanan makanan/minuman. */
export function orderDiscountTotal(
  orders: OrderItem[],
  menu: MenuItem[],
  ctx: DiscountContext,
  fallbackPercent = 0,
) {
  return orders.reduce((sum, order) => {
    const item =
      menu.find((m) => m.id === order.menuId) ??
      menu.find((m) => order.id.startsWith(`${m.id}-`)) ??
      menu.find((m) => m.name === order.name);
    const base = order.price * order.qty;
    return sum + itemDiscountAmount(item?.discount, base, order.qty, ctx, fallbackPercent);
  }, 0);
}

function minutesOfDay(at: number) {
  const d = new Date(at);
  return d.getHours() * 60 + d.getMinutes();
}

function parseClockValue(value?: string) {
  if (!value) return null;
  const [h, m] = value.split(":");
  const hour = Number(h);
  const minute = Number(m ?? 0);
  if (!Number.isFinite(hour)) return null;
  return hour * 60 + (Number.isFinite(minute) ? minute : 0);
}

/** Diskon global (happy hour) yang sedang berjalan pada waktu `now`. */
export function activeGlobalPromo(promotions: Promotion[], now: number) {
  const current = minutesOfDay(now);
  return promotions.find((promo) => {
    if (!promo.active || !promo.auto) return false;
    if (promo.startsAt > now || promo.endsAt < now) return false;
    const from = parseClockValue(promo.startTime);
    const to = parseClockValue(promo.endTime);
    if (from === null || to === null) return true;
    // Jendela yang melewati tengah malam tetap dihitung benar.
    return from <= to ? current >= from && current <= to : current >= from || current <= to;
  });
}

export function promoDiscountAmount(promo: Promotion | undefined, base: number) {
  if (!promo || base <= 0) return 0;
  if (base < (promo.minSpend ?? 0)) return 0;
  const raw = promo.type === "percent" ? (base * promo.value) / 100 : promo.value;
  const capped = promo.maxDiscount > 0 ? Math.min(raw, promo.maxDiscount) : raw;
  return Math.min(base, Math.max(0, Math.round(capped)));
}

export type BillBreakdown = {
  rental: number;
  fnb: number;
  subtotal: number;
  itemDiscount: number;
  promoDiscount: number;
  promoName: string;
  manualDiscount: number;
  discount: number;
  total: number;
};

/** Satu tempat perhitungan tagihan: potongan item, happy hour, lalu diskon transaksi. */
export function computeBill(input: {
  rental: number;
  rentalHours: number;
  rentalDiscount?: ItemDiscount;
  orders: OrderItem[];
  menu: MenuItem[];
  ctx: DiscountContext;
  promotions: Promotion[];
  now: number;
  fallbackPercent?: number;
  manual?: { type: DiscountType; value: number; max?: number };
}): BillBreakdown {
  const fallback = input.fallbackPercent ?? 0;
  const fnb = input.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
  const rental = Math.max(0, input.rental);
  const subtotal = rental + fnb;
  const itemDiscount =
    itemDiscountAmount(input.rentalDiscount, rental, input.rentalHours, input.ctx, fallback) +
    orderDiscountTotal(input.orders, input.menu, input.ctx, fallback);
  const afterItem = Math.max(0, subtotal - itemDiscount);
  const promo = activeGlobalPromo(input.promotions, input.now);
  const promoDiscount = promoDiscountAmount(promo, afterItem);
  const afterPromo = Math.max(0, afterItem - promoDiscount);
  const manual = input.manual;
  const manualRaw =
    !manual || !manual.value
      ? 0
      : manual.type === "percent"
        ? (afterPromo * manual.value) / 100
        : manual.value;
  const manualCapped = manual?.max ? Math.min(manualRaw, manual.max) : manualRaw;
  const manualDiscount = Math.min(afterPromo, Math.max(0, Math.round(manualCapped)));
  const discount = itemDiscount + promoDiscount + manualDiscount;
  return {
    rental,
    fnb,
    subtotal,
    itemDiscount,
    promoDiscount,
    promoName: promoDiscount > 0 && promo ? promo.name : "",
    manualDiscount,
    discount,
    total: Math.max(0, subtotal - discount),
  };
}

/** Arah uang kas: masuk (penerimaan) atau keluar (pengeluaran). */
export type CashDirection = "in" | "out";

/**
 * Kelompok/item kas buatan pengguna.
 * `payout: true` berarti tidak dihitung sebagai pendapatan / biaya,
 * hanya perpindahan uang (misal setoran atau pengambilan uang owner).
 */
export type CashCategory = {
  id: string;
  name: string;
  direction: CashDirection;
  payout: boolean;
  group: string;
  active: boolean;
  sort?: number;
};

export type CashEntry = {
  id: string;
  categoryId: string;
  categoryName: string;
  group: string;
  direction: CashDirection;
  payout: boolean;
  amount: number;
  payment: string;
  note: string;
  createdAt: number;
};

export type PaymentSplit = { method: string; amount: number };

/** Shift kasir: check-in sampai close out. */
export type CashShift = {
  id: string;
  cashierName: string;
  cashierId?: string;
  openedAt: number;
  closedAt?: number;
  startCash: number;
  cashActual?: number;
  balanceNote?: string;
  nextStartCash?: number;
};


export type HistoryRecord = {
  id: string;
  stationName: string;
  console: ConsoleType;
  mode: PlayMode;
  startAt: number;
  endAt: number;
  minutes: number;
  rentalTotal: number;
  fnbTotal: number;
  total: number;
  payment?: string;
  payments?: PaymentSplit[];
  customerName?: string;
  customerPhone?: string;
  packageName?: string;
  amountPaid?: number;
  change?: number;
  orders?: OrderItem[];
  customerId?: string;
  promoName?: string;
  discount?: number;
  pointsEarned?: number;
  kind?: "rental" | "cafe";
  tableName?: string;
  paidAt?: number; // waktu pembayaran lunas
  ongoing?: boolean; // sesi masih berjalan saat nota dibuat
};


export type Rates = Record<string, number>;

/** Pengaturan notifikasi yang tampil di layar TV pelanggan. */
export type TvNotice = {
  warnMinutes: number;
  warnText: string;
  endText: string;
  countdownSec: number;
  blockTitle: string;
  blockText: string;
};

export const defaultTvNotice: TvNotice = {
  warnMinutes: 5,
  warnText:
    "Waktu bermain Anda tersisa 5 menit. Silahkan menghubungi Operator untuk penambahan waktu.",
  endText: "Waktu bermain Anda telah habis.",
  countdownSec: 10,
  blockTitle: "WAKTU BERMAIN HABIS",
  blockText: "Silahkan menghubungi Operator untuk penambahan waktu.",
};

type State = {
  /**
   * Store pemilik seluruh data di perangkat ini. Semua data hanya boleh dikirim
   * ke store ini; kalau perangkat masuk ke store lain, data lokal dibuang dulu.
   */
  storeId: string | null;
  stations: Station[];
  consoleTypes: string[];
  rates: Rates;
  consoleDiscounts: Record<string, ItemDiscount>;
  menu: MenuItem[];
  menuCategories: string[];
  cafeTables: CafeTable[];
  paymentMethods: PaymentMethod[];
  packages: RentalPackage[];
  roundingRule: RoundingRule;
  defaultBonusMin: number;
  history: HistoryRecord[];
  customers: Customer[];
  bookings: Booking[];
  promotions: Promotion[];
  pointEntries: PointEntry[];
  pointsPerRupiah: number;
  playingCards: PlayingCard[];
  cardEntries: CardEntry[];
  cardPrice: number;
  cardDiscountPercent: number;
  cardMemberDiscountPercent: number;
  cashCategories: CashCategory[];
  cashEntries: CashEntry[];
  shifts: CashShift[];
  tvNotice: TvNotice;
  /** Daftar printer store (struk, invoice, dapur, bar, laporan). */
  printers: PrinterConfig[];
  receiptLayout: DocLayout;
  invoiceLayout: DocLayout;
  /** Hak akses per level pengguna, diatur Installer. */
  rolePermissions: RolePermissions;

};


const STORAGE_KEY = "billing-ps-state-v1";

/** Pindahkan satu elemen array dari posisi `from` ke posisi `to`. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [row] = next.splice(from, 1);
  if (row !== undefined) next.splice(to, 0, row);
  return next;
}

const defaultState: State = {
  storeId: null,
  stations: [
    { id: "tv-1", name: "TV 01", console: "PS3", booth: "Booth 1", availability: "available", session: null },
    { id: "tv-2", name: "TV 02", console: "PS3", booth: "Booth 2", availability: "available", session: null },
    { id: "tv-3", name: "TV 03", console: "PS4", booth: "Booth 3", availability: "available", session: null },
    { id: "tv-4", name: "TV 04", console: "PS4", booth: "Booth 4", availability: "available", session: null },
    { id: "tv-5", name: "TV 05", console: "PS5", booth: "VIP 1", availability: "available", session: null },
    { id: "tv-6", name: "TV 06", console: "PS5", booth: "VIP 2", availability: "available", session: null },
  ],
  consoleTypes: ["PS3", "PS4", "PS5"],
  rates: { PS3: 5000, PS4: 8000, PS5: 12000 },
  consoleDiscounts: {},
  menu: [
    { id: "m1", name: "Air Mineral", price: 4000, category: "Minuman", printerId: "prt-bar" },
    { id: "m2", name: "Teh Botol", price: 6000, category: "Minuman", printerId: "prt-bar" },
    { id: "m3", name: "Kopi Hitam", price: 8000, category: "Coffee", printerId: "prt-bar" },
    { id: "m4", name: "Es Kopi Susu", price: 15000, category: "Coffee", printerId: "prt-bar" },
    { id: "m5", name: "Juice Jeruk", price: 14000, category: "Juice", printerId: "prt-bar" },
    { id: "m6", name: "Indomie Goreng", price: 10000, category: "Snack", printerId: "prt-kitchen" },
    { id: "m7", name: "Snack Ringan", price: 7000, category: "Snack", printerId: "prt-kitchen" },
    { id: "m8", name: "Nasi Goreng", price: 15000, category: "Main Course", printerId: "prt-kitchen" },
  ],
  menuCategories: ["Coffee", "Juice", "Minuman", "Snack", "Main Course"],
  cafeTables: [
    { id: "meja-1", name: "Meja 01", area: "Indoor", seats: 2, customerName: "", notes: "", openedAt: null, orders: [] },
    { id: "meja-2", name: "Meja 02", area: "Indoor", seats: 4, customerName: "", notes: "", openedAt: null, orders: [] },
    { id: "meja-3", name: "Meja 03", area: "Indoor", seats: 4, customerName: "", notes: "", openedAt: null, orders: [] },
    { id: "meja-4", name: "Meja 04", area: "Outdoor", seats: 4, customerName: "", notes: "", openedAt: null, orders: [] },
  ],

  paymentMethods: [
    { id: "pm-cash", name: "Cash", active: true },
    { id: "pm-qris", name: "QRIS", active: true },
    { id: "pm-giftcard", name: "Gift Card", active: true },
    { id: "pm-transfer", name: "Transfer Bank BCA", active: true },
    { id: "pm-transfer-mandiri", name: "Transfer Bank Mandiri", active: true },
    { id: "pm-compliment", name: "Compliment", active: true },
    { id: "pm-card", name: CARD_PAYMENT_NAME, active: true },
    { id: "pm-lainnya", name: "Lainnya", active: true },
  ],
  packages: [
    { id: "pkg-1", name: "1 Jam", durationMin: 60, price: 0, active: true },
    { id: "pkg-2", name: "2 Jam", durationMin: 120, price: 0, active: true },
    { id: "pkg-3", name: "3 Jam", durationMin: 180, price: 0, active: true },
  ],
  roundingRule: "minute",
  defaultBonusMin: 0,
  history: [],
  customers: [],
  bookings: [],
  promotions: [],
  pointEntries: [],
  pointsPerRupiah: 10000,
  playingCards: [],
  cardEntries: [],
  cardPrice: 10000,
  cardDiscountPercent: 10,
  cardMemberDiscountPercent: 15,
  cashCategories: [
    { id: "cc-lain", name: "Pendapatan Lain", direction: "in", payout: false, group: "Pendapatan Lain", active: true },
    { id: "cc-sewa-alat", name: "Sewa Stik / Alat", direction: "in", payout: false, group: "Pendapatan Lain", active: true },
    { id: "cc-modal-owner", name: "Tambah Kas dari Owner", direction: "in", payout: true, group: "Kas Owner", active: true },
    { id: CARD_TOPUP_CATEGORY_ID, name: "Top Up Playing Card", direction: "in", payout: true, group: "Playing Card", active: true },
    { id: CARD_SALE_CATEGORY_ID, name: "Penjualan Playing Card", direction: "in", payout: false, group: "Playing Card", active: true },
    { id: "cc-listrik", name: "Pembayaran Listrik", direction: "out", payout: false, group: "Operasional", active: true },
    { id: "cc-gas", name: "Pembelian Gas", direction: "out", payout: false, group: "Operasional", active: true },
    { id: "cc-belanja", name: "Belanja Bahan Kafe", direction: "out", payout: false, group: "Operasional", active: true },
    { id: "cc-gaji", name: "Gaji Karyawan", direction: "out", payout: false, group: "Gaji", active: true },
    { id: "cc-ambil-owner", name: "Pengambilan Uang Owner", direction: "out", payout: true, group: "Kas Owner", active: true },
  ],
  cashEntries: [],
  shifts: [],
  tvNotice: defaultTvNotice,
  printers: defaultPrinters,
  receiptLayout: defaultReceiptLayout,
  invoiceLayout: defaultInvoiceLayout,
  rolePermissions: {},

};

/** Catatan kas untuk top-up kartu: uang masuk, tapi bukan penghasilan. */
function cardTopupCashEntry(
  categories: CashCategory[],
  amount: number,
  cardNumber: string,
  stamp: number,
  payment = "Cash",
): CashEntry | null {
  if (amount <= 0) return null;
  const category =
    categories.find((item) => item.id === CARD_TOPUP_CATEGORY_ID) ?? {
      id: CARD_TOPUP_CATEGORY_ID,
      name: "Top Up Playing Card",
      group: "Playing Card",
      payout: true,
    };
  return {
    id: `cash-topup-${stamp}`,
    categoryId: category.id,
    categoryName: category.name,
    group: category.group,
    direction: "in",
    payout: category.payout,
    amount,
    payment,
    note: `Top up kartu ${cardNumber}`,
    createdAt: stamp,
  };
}

/** Catatan kas untuk penjualan kartu baru: uang masuk dan jadi penghasilan. */
function cardSaleCashEntry(
  categories: CashCategory[],
  amount: number,
  cardNumber: string,
  stamp: number,
  payment = "Cash",
): CashEntry | null {
  if (amount <= 0) return null;
  const category =
    categories.find((item) => item.id === CARD_SALE_CATEGORY_ID) ?? {
      id: CARD_SALE_CATEGORY_ID,
      name: "Penjualan Playing Card",
      group: "Playing Card",
      payout: false,
    };
  return {
    id: `cash-cardsale-${stamp}`,
    categoryId: category.id,
    categoryName: category.name,
    group: category.group,
    direction: "in",
    payout: category.payout,
    amount,
    payment,
    note: `Penjualan kartu ${cardNumber}`,
    createdAt: stamp,
  };
}

export function formatRupiah(value: number) {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

export function paidTotal(session: Session | null | undefined) {
  return (session?.settlements ?? []).reduce((sum, s) => sum + s.amount, 0);
}

/** Nama metode pembayaran tunai. */
export const CASH_METHOD = "Cash";

function cashOfRecord(record: HistoryRecord) {
  if (record.payments?.length) {
    return record.payments
      .filter((p) => p.method === CASH_METHOD)
      .reduce((sum, p) => sum + p.amount, 0);
  }
  return (record.payment ?? "") === CASH_METHOD ? record.total : 0;
}

export type ShiftSummary = {
  paidIn: number;
  paidOut: number;
  sales: number;
  expenses: number;
  expected: number;
};

/** Hitung posisi uang tunai laci untuk satu shift kasir. */
export function shiftSummary(
  shift: CashShift,
  history: HistoryRecord[],
  cashEntries: CashEntry[],
  until: number = Date.now(),
): ShiftSummary {
  const from = shift.openedAt;
  const to = shift.closedAt ?? until;
  const within = (stamp: number) => stamp >= from && stamp <= to;

  const sales = history
    .filter((h) => within(h.paidAt ?? h.endAt))
    .reduce((sum, h) => sum + cashOfRecord(h), 0);

  const cash = cashEntries.filter(
    (e) => e.payment === CASH_METHOD && within(e.createdAt),
  );
  const sum = (pick: (e: CashEntry) => boolean) =>
    cash.filter(pick).reduce((s, e) => s + e.amount, 0);

  const paidIn = sum((e) => e.direction === "in" && e.payout);
  const otherIncome = sum((e) => e.direction === "in" && !e.payout);
  const paidOut = sum((e) => e.direction === "out" && e.payout);
  const expenses = sum((e) => e.direction === "out" && !e.payout);
  const salesTotal = sales + otherIncome;

  return {
    paidIn,
    paidOut,
    sales: salesTotal,
    expenses,
    expected: shift.startCash + paidIn - paidOut + salesTotal - expenses,
  };
}



export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function pausedMsTotal(session: Session, now: number) {
  const base = session.pausedMs ?? 0;
  return session.pausedAt ? base + Math.max(0, now - session.pausedAt) : base;
}

export function isPaused(session: Session) {
  return Boolean(session.pausedAt);
}

export function elapsedSeconds(session: Session, now: number) {
  return Math.max(
    0,
    Math.floor((now - session.startAt - pausedMsTotal(session, now)) / 1000),
  );
}

export function effectiveMinutes(session: Session) {
  return Math.max(0, session.durationMin + (session.bonusMin ?? 0));
}

export function remainingSeconds(session: Session, now: number) {
  if (session.mode === "open") return Infinity;
  return effectiveMinutes(session) * 60 - elapsedSeconds(session, now);
}

export function rentalMinutes(session: Session, now: number) {
  if (session.mode === "prepaid") return session.durationMin;
  return Math.max(1, Math.ceil(elapsedSeconds(session, now) / 60));
}

export function rentalTotal(session: Session, now: number) {
  return (session.rate * rentalMinutes(session, now)) / 60;
}

export function fnbTotal(session: Session) {
  return session.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
}

export function discountTotal(session: Session, now: number) {
  const subtotal = rentalTotal(session, now) + fnbTotal(session);
  if (!session.discountType || !session.discountValue) return 0;
  const raw = session.discountType === "percent" ? subtotal * session.discountValue / 100 : session.discountValue;
  return Math.min(subtotal, session.discountMax ? Math.min(raw, session.discountMax) : raw);
}

export function billingTotal(session: Session, now: number) {
  return rentalTotal(session, now) + fnbTotal(session) - discountTotal(session, now);
}

export type PriceConfig = {
  consoleDiscounts: Record<string, ItemDiscount>;
  menu: MenuItem[];
  promotions: Promotion[];
  cardDiscountPercent: number;
  cardMemberDiscountPercent: number;
};

function fallbackCardPercent(cfg: PriceConfig, ctx: DiscountContext) {
  if (!ctx.card) return 0;
  return ctx.member ? cfg.cardMemberDiscountPercent : cfg.cardDiscountPercent;
}

/** Tagihan satu sesi rental lengkap dengan semua potongan. */
export function sessionBill(
  session: Session,
  now: number,
  consoleType: ConsoleType,
  cfg: PriceConfig,
  ctx: DiscountContext,
  manual?: { type: DiscountType; value: number },
): BillBreakdown {
  const minutes = rentalMinutes(session, now);
  const fallbackManual =
    session.discountType && session.discountValue
      ? { type: session.discountType, value: session.discountValue, max: session.discountMax }
      : undefined;
  return computeBill({
    rental: rentalTotal(session, now),
    rentalHours: minutes / 60,
    ...(cfg.consoleDiscounts[consoleType] ? { rentalDiscount: cfg.consoleDiscounts[consoleType] } : {}),
    orders: session.orders,
    menu: cfg.menu,
    ctx,
    promotions: cfg.promotions,
    now,
    fallbackPercent: fallbackCardPercent(cfg, ctx),
    ...(manual && manual.value ? { manual } : fallbackManual ? { manual: fallbackManual } : {}),
  });
}

/** Tagihan satu meja kafe lengkap dengan semua potongan. */
export function cafeBill(
  orders: OrderItem[],
  now: number,
  cfg: PriceConfig,
  ctx: DiscountContext,
  manual?: { type: DiscountType; value: number },
): BillBreakdown {
  return computeBill({
    rental: 0,
    rentalHours: 0,
    orders,
    menu: cfg.menu,
    ctx,
    promotions: cfg.promotions,
    now,
    fallbackPercent: fallbackCardPercent(cfg, ctx),
    ...(manual && manual.value ? { manual } : {}),
  });
}

export type StationStatus = "idle" | "booked" | "playing" | "timeup" | "maintenance" | "offline";

export const BOOKING_LEAD_MS = 2 * 60 * 60 * 1000;
/** Toleransi check-in: paling cepat 1 jam sebelum jam booking. */
export const CHECKIN_LEAD_MS = 60 * 60 * 1000;

export function canCheckIn(booking: { startAt: number; endAt: number }, now: number) {
  return now >= booking.startAt - CHECKIN_LEAD_MS && now <= booking.endAt;
}

export function bookingMinutes(booking: { startAt: number; endAt: number }) {
  return Math.max(15, Math.round((booking.endAt - booking.startAt) / 60000));
}

export function activeBooking(bookings: Booking[], stationId: string, now: number) {
  return bookings
    .filter(
      (item) =>
        item.stationId === stationId &&
        item.status !== "cancelled" &&
        item.status !== "completed" &&
        item.endAt >= now &&
        item.startAt - BOOKING_LEAD_MS <= now,
    )
    .sort((a, b) => a.startAt - b.startAt)[0];
}

export function stationStatus(
  station: Station,
  now: number,
  bookings: Booking[] = [],
): StationStatus {
  if (!station.session && station.availability !== "available") return station.availability;
  if (!station.session) {
    return activeBooking(bookings, station.id, now) ? "booked" : "idle";
  }
  if (station.session.mode === "open") return "playing";
  return remainingSeconds(station.session, now) <= 0 ? "timeup" : "playing";
}

function migrateState(raw: unknown): State {
  const parsed = typeof raw === "object" && raw ? (raw as Partial<State>) : {};
  return {
    ...defaultState,
    ...parsed,
    stations: (parsed.stations ?? defaultState.stations).map((station, index) => ({
      ...station,
      booth: station.booth ?? `Booth ${index + 1}`,
      availability: station.availability ?? "available",
      session: station.session
        ? {
            ...station.session,
            customerName: station.session.customerName ?? "Umum",
            customerPhone: station.session.customerPhone ?? "",
            member: station.session.member ?? false,
            packageName: station.session.packageName ?? (station.session.mode === "open" ? "Open Time" : `${station.session.durationMin} Menit`),
            notes: station.session.notes ?? "",
            bonusMin: station.session.bonusMin ?? 0,
          }
        : null,
    })),
    rates: parsed.rates ?? defaultState.rates,
    consoleDiscounts: parsed.consoleDiscounts ?? defaultState.consoleDiscounts,
    consoleTypes:
      parsed.consoleTypes && parsed.consoleTypes.length
        ? parsed.consoleTypes
        : Object.keys(parsed.rates ?? defaultState.rates),
    menu: (parsed.menu ?? defaultState.menu).map((item) => ({
      ...item,
      category: item.category?.trim() ? item.category : "Lainnya",
    })),
    menuCategories: (() => {
      const fromItems = (parsed.menu ?? []).map((m) => m.category).filter(Boolean) as string[];
      const base = parsed.menuCategories?.length ? parsed.menuCategories : defaultState.menuCategories;
      return Array.from(new Set([...base, ...fromItems]));
    })(),
    cafeTables: (parsed.cafeTables ?? defaultState.cafeTables).map((table, index) => ({
      ...table,
      name: table.name ?? `Meja ${String(index + 1).padStart(2, "0")}`,
      area: table.area ?? "Indoor",
      seats: table.seats ?? 2,
      customerName: table.customerName ?? "",
      notes: table.notes ?? "",
      openedAt: table.openedAt ?? null,
      orders: table.orders ?? [],
    })),
    paymentMethods: (() => {
      let list = parsed.paymentMethods ?? defaultState.paymentMethods;
      // Transfer bank dipisah per bank: BCA dan Mandiri.
      list = list.map((p) =>
        p.name.trim().toLowerCase() === "transfer bank"
          ? { ...p, name: "Transfer Bank BCA" }
          : p,
      );
      if (!list.some((p) => p.name.trim().toLowerCase() === "transfer bank mandiri")) {
        list = [...list, { id: "pm-transfer-mandiri", name: "Transfer Bank Mandiri", active: true }];
      }
      return list.some((p) => p.name === CARD_PAYMENT_NAME)
        ? list
        : [...list, { id: "pm-card", name: CARD_PAYMENT_NAME, active: true }];
    })(),
    packages: parsed.packages ?? defaultState.packages,
    roundingRule: parsed.roundingRule ?? defaultState.roundingRule,
    defaultBonusMin: parsed.defaultBonusMin ?? defaultState.defaultBonusMin,
    customers: parsed.customers ?? defaultState.customers,
    bookings: parsed.bookings ?? defaultState.bookings,
    promotions: parsed.promotions ?? defaultState.promotions,
    pointEntries: parsed.pointEntries ?? defaultState.pointEntries,
    pointsPerRupiah: parsed.pointsPerRupiah ?? defaultState.pointsPerRupiah,
    playingCards: parsed.playingCards ?? defaultState.playingCards,
    cardEntries: parsed.cardEntries ?? defaultState.cardEntries,
    cardPrice: parsed.cardPrice ?? defaultState.cardPrice,
    cardDiscountPercent: parsed.cardDiscountPercent ?? defaultState.cardDiscountPercent,
    cardMemberDiscountPercent:
      parsed.cardMemberDiscountPercent ?? defaultState.cardMemberDiscountPercent,
    cashCategories: (() => {
      const list = (parsed.cashCategories?.length
        ? parsed.cashCategories
        : defaultState.cashCategories
      ).map((item) => ({
        ...item,
        group: item.group?.trim() ? item.group : "Lainnya",
        payout: Boolean(item.payout),
        active: item.active ?? true,
      }));
      if (!list.some((item) => item.id === CARD_TOPUP_CATEGORY_ID)) {
        const preset = defaultState.cashCategories.find(
          (item) => item.id === CARD_TOPUP_CATEGORY_ID,
        );
        if (preset) list.push(preset);
      }
      return list;
    })(),
    cashEntries: parsed.cashEntries ?? defaultState.cashEntries,
    shifts: parsed.shifts ?? defaultState.shifts,
    tvNotice: { ...defaultTvNotice, ...(parsed.tvNotice ?? {}) },
    printers: parsed.printers?.length ? parsed.printers : defaultPrinters,
    receiptLayout: { ...defaultReceiptLayout, ...(parsed.receiptLayout ?? {}) },
    invoiceLayout: { ...defaultInvoiceLayout, ...(parsed.invoiceLayout ?? {}) },
    rolePermissions: parsed.rolePermissions ?? {},



  };
}

type Ctx = State & {
  now: number;
  /** Shift kasir yang sedang terbuka (null bila belum check-in). */
  activeShift: CashShift | null;
  /** True bila ada shift terbuka; transaksi uang hanya boleh saat true. */
  shiftOpen: boolean;
  startSession: (
    stationId: string,
    mode: PlayMode,
    durationMin: number,
    details?: Partial<Pick<Session, "customerName" | "customerPhone" | "member" | "packageName" | "notes" | "bonusMin" | "customerId" | "bookingId" | "promoName" | "discountType" | "discountValue" | "discountMax">>,
  ) => void;
  stopSession: (stationId: string, payment?: string, amountPaid?: number, payments?: PaymentSplit[]) => HistoryRecord | null;
  settleSession: (
    stationId: string,
    input: { payment?: string; payments?: PaymentSplit[]; amount: number; amountPaid: number },
  ) => Settlement | null;
  removeSettlement: (stationId: string, settlementId: string) => void;

  addTime: (stationId: string, extraMin: number) => void;
  adjustBonusTime: (stationId: string, deltaMin: number) => void;
  setSessionBonus: (stationId: string, bonusMin: number) => void;
  updateSessionCustomer: (
    stationId: string,
    patch: { customerName?: string; customerPhone?: string; member?: boolean; customerId?: string | undefined },
  ) => void;
  pauseSession: (stationId: string) => void;
  resumeSession: (stationId: string) => void;
  setDefaultBonusMin: (minutes: number) => void;
  setTvNotice: (patch: Partial<TvNotice>) => void;
  addPrinter: (init?: Partial<Omit<PrinterConfig, "id">>) => void;
  updatePrinter: (id: string, patch: Partial<Omit<PrinterConfig, "id">>) => void;
  removePrinter: (id: string) => void;
  setReceiptLayout: (patch: Partial<DocLayout>) => void;
  setInvoiceLayout: (patch: Partial<DocLayout>) => void;
  setRolePermissions: (role: string, keys: string[]) => void;
  addOrder: (stationId: string, item: MenuItem, qty: number) => void;
  removeOrder: (stationId: string, orderId: string) => void;
  setRates: (rates: Rates) => void;
  setStationConsole: (stationId: string, console: ConsoleType) => void;
  addConsoleType: (name: string, rate: number) => boolean;
  renameConsoleType: (oldName: string, newName: string) => boolean;
  setConsoleRate: (name: string, rate: number) => void;
  setConsoleDiscount: (name: string, patch: Partial<ItemDiscount>) => void;
  setSessionDiscount: (
    stationId: string,
    patch: { type?: DiscountType; value?: number },
  ) => void;
  removeConsoleType: (name: string) => boolean;
  updateStation: (stationId: string, patch: Partial<Omit<Station, "id" | "session">>) => void;
  addStation: (init?: {
    name?: string;
    console?: ConsoleType;
    booth?: string;
  }) => void;
  removeStation: (stationId: string) => void;
  reorderList: (
    list: "stations" | "cafeTables" | "menu" | "packages" | "paymentMethods",
    activeId: string,
    overId: string,
  ) => void;
  reorderConsoleTypes: (activeName: string, overName: string) => void;
  reorderMenuCategories: (activeName: string, overName: string) => void;
  addMenuItem: (name: string, price: number, category?: string) => void;
  updateMenuItem: (id: string, patch: Partial<Omit<MenuItem, "id">>) => void;
  removeMenuItem: (id: string) => void;
  addMenuCategory: (name: string) => boolean;
  renameMenuCategory: (oldName: string, newName: string) => boolean;
  removeMenuCategory: (name: string) => boolean;
  addCafeTable: (init?: { name?: string; area?: string; seats?: number }) => void;
  updateCafeTable: (tableId: string, patch: Partial<Omit<CafeTable, "id" | "orders">>) => void;
  removeCafeTable: (tableId: string) => boolean;
  openCafeTable: (tableId: string, customerName?: string, notes?: string) => void;
  addCafeOrder: (tableId: string, item: MenuItem, qty: number) => void;
  removeCafeOrder: (tableId: string, orderId: string) => void;
  clearCafeTable: (tableId: string) => void;
  payCafeTable: (
    tableId: string,
    input: {
      payment?: string;
      payments?: PaymentSplit[];
      amountPaid?: number;
      member?: boolean;
      discount?: { type: DiscountType; value: number };
    },
  ) => HistoryRecord | null;

  addPaymentMethod: (name: string) => void;
  updatePaymentMethod: (id: string, patch: Partial<Omit<PaymentMethod, "id">>) => void;
  removePaymentMethod: (id: string) => void;
  addPackage: (name: string, durationMin: number, price: number) => void;
  updatePackage: (id: string, patch: Partial<Omit<RentalPackage, "id">>) => void;
  removePackage: (id: string) => void;
  setRoundingRule: (rule: RoundingRule) => void;
  addCustomer: (input: Pick<Customer, "name" | "phone" | "member" | "level">) => Customer;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, "id" | "createdAt">>) => void;
  removeCustomer: (id: string) => void;
  adjustPoints: (customerId: string, points: number, reason: string) => void;
  setPointsPerRupiah: (value: number) => void;
  buyPlayingCard: (input: {
    cardNumber: string;
    cardCode?: string;
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    member?: boolean;
    topup?: number;
    price?: number;
    payment?: string;
  }) => PlayingCard | null;
  updatePlayingCard: (
    id: string,
    patch: Partial<Omit<PlayingCard, "id" | "createdAt" | "balance">>,
  ) => void;
  removePlayingCard: (id: string) => void;
  topupCard: (id: string, amount: number, note?: string, payment?: string) => boolean;
  adjustCardBalance: (id: string, amount: number, note: string) => boolean;
  chargeCard: (id: string, amount: number, note: string) => boolean;
  setCardPrice: (value: number) => void;
  setCardDiscountPercent: (value: number) => void;
  setCardMemberDiscountPercent: (value: number) => void;
  addBooking: (input: Omit<Booking, "id" | "status">) => boolean;
  updateBooking: (id: string, patch: Partial<Omit<Booking, "id">>) => boolean;
  removeBooking: (id: string) => void;
  addPromotion: (input: Omit<Promotion, "id">) => void;
  updatePromotion: (id: string, patch: Partial<Omit<Promotion, "id">>) => void;
  removePromotion: (id: string) => void;
  updateHistoryPayment: (id: string, patch: { payment?: string; payments?: PaymentSplit[] }) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  resetTransactions: () => void;
  addCashCategory: (input: {
    name: string;
    direction: CashDirection;
    payout?: boolean;
    group?: string;
  }) => CashCategory | null;
  updateCashCategory: (id: string, patch: Partial<Omit<CashCategory, "id">>) => void;
  removeCashCategory: (id: string) => void;
  addCashEntry: (input: {
    categoryId: string;
    amount: number;
    payment?: string;
    note?: string;
    createdAt?: number;
  }) => CashEntry | null;
  updateCashEntry: (
    id: string,
    patch: { amount?: number; payment?: string; note?: string; categoryId?: string },
  ) => void;
  removeCashEntry: (id: string) => void;
  exportSnapshot: () => BillingSnapshot;
  openShift: (input: {
    cashierName: string;
    cashierId?: string;
    startCash: number;
  }) => CashShift | null;
  closeShift: (
    id: string,
    input: { cashActual: number; balanceNote?: string; nextStartCash?: number },
  ) => CashShift | null;
  replaceAll: (data: unknown) => void;

  resetAll: () => void;
  sync: SyncStatus;
};

export type BillingSnapshot = State;

const BillingContext = createContext<Ctx | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(defaultState);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(migrateState(JSON.parse(raw)));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep running in memory */
    }
  }, [state, hydrated]);

  // Timer is derived from stored timestamps, so a refresh, a device restart,
  // or an offline period never changes the elapsed time. We only need to keep
  // the displayed clock fresh and resync it whenever the tab wakes up.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    const resync = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", tick);
    window.addEventListener("online", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, []);

  // Keep sessions consistent when the app is open in more than one tab/window.
  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setState(migrateState(JSON.parse(event.newValue)));
      } catch {
        /* ignore corrupt payload from other tab */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  // Sesi yang tagihannya sudah lunas selalu punya nota di laporan, termasuk
  // sesi yang dilunasi sebelum fitur nota otomatis ada.
  useEffect(() => {
    if (!hydrated) return;
    setState((prev) => {
      const missing = prev.stations.filter((station) => {
        const session = station.session;
        if (!session) return false;
        const settlements = session.settlements ?? [];
        if (!settlements.length) return false;
        if (session.historyId && prev.history.some((h) => h.id === session.historyId))
          return false;
        const paid = settlements.reduce((sum, s) => sum + s.amount, 0);
        const methods = settlements.flatMap((s) =>
          s.payments?.length ? s.payments.map((p) => p.method) : [s.payment],
        );
        const at = settlements[settlements.length - 1]!.at;
        const bill = sessionBill(session, at, station.console, prev, {
          member: Boolean(session.member),
          card: methods.some((m) => m === CARD_PAYMENT_NAME),
        });
        return bill.total > 0 && paid + 0.5 >= bill.total;
      });
      if (!missing.length) return prev;
      const added: HistoryRecord[] = [];
      const stations = prev.stations.map((station) => {
        if (!missing.includes(station) || !station.session) return station;
        const session = station.session;
        const settlements = session.settlements ?? [];
        const at = settlements[settlements.length - 1]!.at;
        const methods = settlements.flatMap((s) =>
          s.payments?.length ? s.payments.map((p) => p.method) : [s.payment],
        );
        const bill = sessionBill(session, at, station.console, prev, {
          member: Boolean(session.member),
          card: methods.some((m) => m === CARD_PAYMENT_NAME),
        });
        const splits: PaymentSplit[] = settlements.flatMap((s) =>
          s.payments?.length ? s.payments : [{ method: s.payment, amount: s.amount }],
        );
        const historyId = session.historyId ?? `${station.id}-paid-${at}`;
        added.push({
          id: historyId,
          stationName: station.name,
          console: station.console,
          mode: session.mode,
          startAt: session.startAt,
          endAt: at,
          paidAt: at,
          ongoing: true,
          minutes: Math.ceil(elapsedSeconds(session, at) / 60),
          rentalTotal: bill.rental,
          fnbTotal: bill.fnb,
          total: bill.total,
          payment: Array.from(new Set(methods)).filter(Boolean).join(" + ") || "Cash",
          ...(splits.length > 1 ? { payments: splits } : {}),
          customerName: session.customerName,
          customerPhone: session.customerPhone,
          packageName: session.packageName,
          amountPaid: settlements.reduce((sum, s) => sum + s.amountPaid, 0),
          change: settlements.reduce((sum, s) => sum + s.change, 0),
          orders: session.orders,
          ...(session.customerId ? { customerId: session.customerId } : {}),
          ...(session.promoName || bill.promoName
            ? { promoName: session.promoName || bill.promoName }
            : {}),
          discount: bill.discount,
        });
        return { ...station, session: { ...session, historyId, paidAt: at } };
      });
      return { ...prev, stations, history: [...added, ...prev.history] };
    });
  }, [hydrated, state.stations, state.history]);




  const update = useCallback(
    (fn: (draft: State) => State) => setState((prev) => fn(prev)),
    [],
  );

  const mapStation = useCallback(
    (stationId: string, fn: (s: Station) => Station) =>
      update((prev) => ({
        ...prev,
        stations: prev.stations.map((s) => (s.id === stationId ? fn(s) : s)),
      })),
    [update],
  );

  const startSession = useCallback<Ctx["startSession"]>(
    (stationId, mode, durationMin, details) =>
      mapStation(stationId, (s) => ({
        ...s,
        session: {
          mode,
          startAt: Date.now(),
          durationMin: mode === "prepaid" ? durationMin : 0,
          rate: 0,
          orders: [],
          customerName: details?.customerName || "Umum",
          customerPhone: details?.customerPhone || "",
          member: details?.member || false,
          packageName: details?.packageName || (mode === "open" ? "Open Time" : `${durationMin} Menit`),
          notes: details?.notes || "",
          bonusMin: mode === "prepaid" ? (details?.bonusMin ?? 0) : 0,
        },
      })),
    [mapStation],
  );

  // rate snapshot needs access to rates; wrap it
  const startSessionWithRate = useCallback<Ctx["startSession"]>(
    (stationId, mode, durationMin, details) =>
      update((prev) => ({
        ...prev,
        stations: prev.stations.map((s) =>
          s.id === stationId
            ? {
                ...s,
                session: {
                  mode,
                  startAt: Date.now(),
                  durationMin: mode === "prepaid" ? durationMin : 0,
                  rate: prev.rates[s.console] ?? 0,
                  orders: [],
                    customerName: details?.customerName || "Umum",
                    customerPhone: details?.customerPhone || "",
                    member: details?.member || false,
                    packageName: details?.packageName || (mode === "open" ? "Open Time" : `${durationMin} Menit`),
                    notes: details?.notes || "",
                    bonusMin: mode === "prepaid" ? (details?.bonusMin ?? prev.defaultBonusMin ?? 0) : 0,
                    ...(details?.customerId ? { customerId: details.customerId } : {}),
                    ...(details?.bookingId ? { bookingId: details.bookingId } : {}),
                    ...(details?.promoName ? { promoName: details.promoName } : {}),
                    ...(details?.discountType ? { discountType: details.discountType } : {}),
                    ...(details?.discountValue !== undefined ? { discountValue: details.discountValue } : {}),
                    ...(details?.discountMax !== undefined ? { discountMax: details.discountMax } : {}),
                },
              }
            : s,
        ),
      })),
    [update],
  );
  void startSession;

  const stopSession = useCallback<Ctx["stopSession"]>(
    (stationId, payment, amountPaid, payments) => {
      let record: HistoryRecord | null = null;
      setState((prev) => {
        const station = prev.stations.find((s) => s.id === stationId);
        if (!station?.session) return prev;
        const endAt = Date.now();
        const session = station.session;
        const methodsUsed = [
          ...(session.settlements ?? []).flatMap((s) =>
            s.payments?.length ? s.payments.map((p) => p.method) : [s.payment],
          ),
          ...(payments?.length ? payments.map((p) => p.method) : [payment ?? ""]),
        ];
        const usesCard = methodsUsed.some((m) => m === CARD_PAYMENT_NAME);
        const bill = sessionBill(session, endAt, station.console, prev, {
          member: Boolean(session.member),
          card: usesCard,
        });
        const rental = bill.rental;
        const fnb = bill.fnb;
        const discount = bill.discount;
        const total = bill.total;

        const prior = session.settlements ?? [];
        const priorPaid = prior.reduce((sum, s) => sum + s.amount, 0);
        const hasDirect = Boolean(payment) || Boolean(payments && payments.length);
        const directDue = Math.max(0, total - priorPaid);
        const directAmount = hasDirect ? directDue : 0;
        const directReceived = hasDirect
          ? payments && payments.length
            ? payments.reduce((sum, p) => sum + p.amount, 0)
            : amountPaid ?? directDue
          : 0;
        // Sesi hanya boleh diakhiri bila seluruh tagihan sudah lunas.
        if (priorPaid + (hasDirect ? directReceived : 0) + 0.5 < total) return prev;

        const methodNames = [
          ...prior.flatMap((s) => (s.payments?.length ? s.payments.map((p) => p.method) : [s.payment])),
          ...(hasDirect
            ? payments && payments.length
              ? payments.map((p) => p.method)
              : [payment || "Cash"]
            : []),
        ].filter(Boolean);
        const uniqueMethods = Array.from(new Set(methodNames));
        const allSplits: PaymentSplit[] = [
          ...prior.flatMap((s) =>
            s.payments?.length ? s.payments : [{ method: s.payment, amount: s.amount }],
          ),
          ...(hasDirect
            ? payments && payments.length
              ? payments
              : [{ method: payment || "Cash", amount: directAmount }]
            : []),
        ];
        const totalReceived =
          prior.reduce((sum, s) => sum + s.amountPaid, 0) + directReceived;
        const totalChange =
          prior.reduce((sum, s) => sum + s.change, 0) +
          Math.max(0, directReceived - directAmount);

        const pointsEarned = session.customerId && session.member
          ? Math.floor(total / Math.max(1, prev.pointsPerRupiah))
          : 0;
        const completedRecord: HistoryRecord = {
          id: session.historyId ?? `${stationId}-${endAt}`,
          stationName: station.name,
          console: station.console,
          mode: session.mode,
          startAt: session.startAt,
          endAt,
          paidAt: session.paidAt ?? endAt,
          ongoing: false,
          minutes: Math.ceil(elapsedSeconds(session, endAt) / 60),
          rentalTotal: rental,
          fnbTotal: fnb,
          total,
          payment: uniqueMethods.join(" + ") || "Cash",
          ...(allSplits.length > 1 ? { payments: allSplits } : {}),
          customerName: session.customerName,
          customerPhone: session.customerPhone,
          packageName: session.packageName,
          amountPaid: totalReceived,
          change: totalChange,
          orders: session.orders,
          ...(session.customerId ? { customerId: session.customerId } : {}),
          ...(session.promoName || bill.promoName
            ? { promoName: session.promoName || bill.promoName }
            : {}),
          discount,
          pointsEarned,
        };

        record = completedRecord;
        const alreadyLogged = prev.history.some((h) => h.id === completedRecord.id);
        return {
          ...prev,
          history: alreadyLogged
            ? prev.history.map((h) => (h.id === completedRecord.id ? completedRecord : h))
            : [completedRecord, ...prev.history],

          customers: prev.customers.map((customer) => customer.id === session.customerId ? {
            ...customer,
            visits: customer.visits + 1,
            totalSpent: customer.totalSpent + total,
            points: customer.points + pointsEarned,
          } : customer),
          pointEntries: pointsEarned > 0 && session.customerId ? [{ id: `point-${endAt}`, customerId: session.customerId, points: pointsEarned, reason: `Transaksi ${station.name}`, createdAt: endAt }, ...prev.pointEntries] : prev.pointEntries,
          bookings: prev.bookings.map((booking) => booking.id === session.bookingId ? { ...booking, status: "completed" as const } : booking),
          stations: prev.stations.map((s) =>
            s.id === stationId ? { ...s, session: null } : s,
          ),
        };
      });
      return record;
    },
    [setState],
  );

  const settleSession = useCallback<Ctx["settleSession"]>(
    (stationId, input) => {
      let created: Settlement | null = null;
      setState((prev) => {
        const station = prev.stations.find((s) => s.id === stationId);
        if (!station?.session) return prev;
        const at = Date.now();
        const amount = Math.max(0, Math.round(input.amount));
        const amountPaid = Math.max(0, Math.round(input.amountPaid));
        if (amount <= 0) return prev;
        const label =
          input.payments && input.payments.length
            ? Array.from(new Set(input.payments.map((p) => p.method))).join(" + ")
            : input.payment || "Cash";
        const settlement: Settlement = {
          id: `pay-${at}`,
          at,
          payment: label,
          ...(input.payments && input.payments.length ? { payments: input.payments } : {}),
          amount,
          amountPaid,
          change: Math.max(0, amountPaid - amount),
        };
        created = settlement;
        const settlements = [...(station.session.settlements ?? []), settlement];
        const paid = settlements.reduce((sum, s) => sum + s.amount, 0);
        const allMethods = settlements.flatMap((s) =>
          s.payments?.length ? s.payments.map((p) => p.method) : [s.payment],
        );
        const bill = sessionBill(station.session, at, station.console, prev, {
          member: Boolean(station.session.member),
          card: allMethods.some((m) => m === CARD_PAYMENT_NAME),
        });
        const fullyPaid = paid + 0.5 >= bill.total && bill.total > 0;
        const splits: PaymentSplit[] = settlements.flatMap((s) =>
          s.payments?.length ? s.payments : [{ method: s.payment, amount: s.amount }],
        );
        const historyId = station.session.historyId ?? `${stationId}-paid-${at}`;
        const sess = station.session;
        const receipt: HistoryRecord = {
          id: historyId,
          stationName: station.name,
          console: station.console,
          mode: sess.mode,
          startAt: sess.startAt,
          endAt: at,
          paidAt: at,
          ongoing: true,
          minutes: Math.ceil(elapsedSeconds(sess, at) / 60),
          rentalTotal: bill.rental,
          fnbTotal: bill.fnb,
          total: bill.total,
          payment: Array.from(new Set(allMethods)).filter(Boolean).join(" + ") || "Cash",
          ...(splits.length > 1 ? { payments: splits } : {}),
          customerName: sess.customerName,
          customerPhone: sess.customerPhone,
          packageName: sess.packageName,
          amountPaid: settlements.reduce((sum, s) => sum + s.amountPaid, 0),
          change: settlements.reduce((sum, s) => sum + s.change, 0),
          orders: sess.orders,
          ...(sess.customerId ? { customerId: sess.customerId } : {}),
          ...(sess.promoName || bill.promoName
            ? { promoName: sess.promoName || bill.promoName }
            : {}),
          discount: bill.discount,
        };
        const existing = prev.history.some((h) => h.id === historyId);
        const history = fullyPaid
          ? existing
            ? prev.history.map((h) => (h.id === historyId ? { ...h, ...receipt } : h))
            : [receipt, ...prev.history]
          : prev.history;
        return {
          ...prev,
          history,
          stations: prev.stations.map((s) =>
            s.id === stationId && s.session
              ? {
                  ...s,
                  session: {
                    ...s.session,
                    settlements,
                    ...(fullyPaid ? { historyId, paidAt: at } : {}),
                  },
                }
              : s,
          ),
        };
      });

      return created;
    },
    [setState],
  );

  const removeSettlement = useCallback<Ctx["removeSettlement"]>(
    (stationId, settlementId) =>
      setState((prev) => {
        const station = prev.stations.find((s) => s.id === stationId);
        if (!station?.session) return prev;
        const settlements = (station.session.settlements ?? []).filter(
          (x) => x.id !== settlementId,
        );
        const historyId = station.session.historyId;
        // Nota otomatis dibatalkan bila pembayaran dihapus dan sesi masih berjalan.
        const history = historyId
          ? prev.history.filter((h) => !(h.id === historyId && h.ongoing))
          : prev.history;
        return {
          ...prev,
          history,
          stations: prev.stations.map((s) => {
            if (s.id !== stationId || !s.session) return s;
            const { historyId: _drop, paidAt: _drop2, ...rest } = s.session;
            return { ...s, session: { ...rest, settlements } };
          }),
        };
      }),
    [setState],
  );




  const addTime = useCallback<Ctx["addTime"]>(
    (stationId, extraMin) =>
      mapStation(stationId, (s) =>
        s.session
          ? {
              ...s,
              session: {
                ...s.session,
                mode: "prepaid",
                durationMin:
                  (s.session.mode === "prepaid"
                    ? s.session.durationMin
                    : Math.ceil(elapsedSeconds(s.session, Date.now()) / 60)) +
                  extraMin,
              },
            }
          : s,
      ),
    [mapStation],
  );

  const addOrder = useCallback<Ctx["addOrder"]>(
    (stationId, item, qty) =>
      mapStation(stationId, (s) =>
        s.session
          ? {
              ...s,
              session: {
                ...s.session,
                orders: [
                  ...s.session.orders,
                  {
                    id: `${item.id}-${Date.now()}`,
                    menuId: item.id,
                    name: item.name,
                    price: item.price,
                    qty,
                  },
                ],
              },
            }
          : s,
      ),
    [mapStation],
  );

  const removeOrder = useCallback<Ctx["removeOrder"]>(
    (stationId, orderId) =>
      mapStation(stationId, (s) =>
        s.session
          ? {
              ...s,
              session: {
                ...s.session,
                orders: s.session.orders.filter((o) => o.id !== orderId),
              },
            }
          : s,
      ),
    [mapStation],
  );

  const { session: authSession } = useAuth();
  // Seluruh data di perangkat terikat ke satu store. Begitu store pengguna
  // diketahui, data lokal dari store lain dibuang sebelum satu baris pun
  // dikirim, dan data baru langsung bertanda store ini.
  const bindStore = useCallback((id: string) => {
    setState((prev) => {
      if (prev.storeId === id) return prev;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* penyimpanan diblokir: cukup reset di memori */
      }
      return { ...defaultState, storeId: id };
    });
  }, []);

  const sync = useStoreSync({
    state,
    hydrated,
    enabled: Boolean(authSession),
    applyRemote: setState,
    bindStore,
  });

  // Kasir wajib check-in shift sebelum ada uang masuk atau keluar.
  const activeShift = state.shifts.find((s) => !s.closedAt) ?? null;
  const shiftOpen = Boolean(activeShift);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      now,
      activeShift,
      shiftOpen,
      startSession: (...args) => {
        if (!shiftOpen) return;
        startSessionWithRate(...args);
      },
      stopSession: (...args) => (shiftOpen ? stopSession(...args) : null),
      settleSession: (...args) => (shiftOpen ? settleSession(...args) : null),
      removeSettlement,

      addTime,
      addOrder: (...args) => {
        if (!shiftOpen) return;
        addOrder(...args);
      },
      removeOrder,
      setRates: (rates) => update((prev) => ({ ...prev, rates })),
      setConsoleDiscount: (name, patch) =>
        update((prev) => ({
          ...prev,
          consoleDiscounts: {
            ...prev.consoleDiscounts,
            [name]: {
              ...emptyItemDiscount,
              ...prev.consoleDiscounts[name],
              ...patch,
            },
          },
        })),
      setSessionDiscount: (stationId, patch) =>
        mapStation(stationId, (s) =>
          s.session
            ? {
                ...s,
                session: {
                  ...s.session,
                  ...(patch.type ? { discountType: patch.type } : {}),
                  ...(patch.value !== undefined
                    ? { discountValue: Math.max(0, Math.round(patch.value)) }
                    : {}),
                },
              }
            : s,
        ),
      setStationConsole: (stationId, consoleType) =>
        mapStation(stationId, (s) => ({ ...s, console: consoleType })),
      addConsoleType: (name, rate) => {
        const clean = name.trim();
        if (!clean) return false;
        if (state.consoleTypes.some((c) => c.toLowerCase() === clean.toLowerCase()))
          return false;
        update((prev) => ({
          ...prev,
          consoleTypes: [...prev.consoleTypes, clean],
          rates: { ...prev.rates, [clean]: Math.max(0, rate) },
        }));
        return true;
      },
      renameConsoleType: (oldName, newName) => {
        const clean = newName.trim();
        if (!clean || clean === oldName) return false;
        if (state.consoleTypes.some((c) => c.toLowerCase() === clean.toLowerCase()))
          return false;
        update((prev) => {
          const rates: Rates = {};
          for (const key of Object.keys(prev.rates)) {
            rates[key === oldName ? clean : key] = prev.rates[key] ?? 0;
          }
          // Potongan harga ikut pindah ke nama baru supaya tidak hilang.
          const consoleDiscounts: Record<string, ItemDiscount> = {};
          for (const key of Object.keys(prev.consoleDiscounts)) {
            const row = prev.consoleDiscounts[key];
            if (row) consoleDiscounts[key === oldName ? clean : key] = row;
          }
          return {
            ...prev,
            consoleTypes: prev.consoleTypes.map((c) => (c === oldName ? clean : c)),
            rates,
            consoleDiscounts,
            stations: prev.stations.map((s) =>
              s.console === oldName ? { ...s, console: clean } : s,
            ),
          };
        });
        return true;
      },
      setConsoleRate: (name, rate) =>
        update((prev) => ({
          ...prev,
          rates: { ...prev.rates, [name]: Math.max(0, rate) },
        })),
      removeConsoleType: (name) => {
        if (state.consoleTypes.length <= 1) return false;
        if (state.stations.some((s) => s.console === name)) return false;
        update((prev) => {
          const rates = { ...prev.rates };
          delete rates[name];
          const consoleDiscounts = { ...prev.consoleDiscounts };
          delete consoleDiscounts[name];
          return {
            ...prev,
            consoleTypes: prev.consoleTypes.filter((c) => c !== name),
            rates,
            consoleDiscounts,
          };
        });
        return true;
      },
      addStation: (init) =>
        update((prev) => {
          const n = prev.stations.length + 1;
          return {
            ...prev,
            stations: [
              ...prev.stations,
              {
                id: `tv-${Date.now()}`,
                name: init?.name?.trim() || `TV ${String(n).padStart(2, "0")}`,
                console: init?.console ?? prev.consoleTypes[0] ?? "PS4",
                booth: init?.booth?.trim() || `Booth ${n}`,
                availability: "available",
                session: null,
              },
            ],
          };
        }),
      reorderList: (list, activeId, overId) =>
        update((prev) => {
          const rows = prev[list] as { id: string; sort?: number }[];
          const from = rows.findIndex((r) => r.id === activeId);
          const to = rows.findIndex((r) => r.id === overId);
          if (from < 0 || to < 0 || from === to) return prev;
          const next = moveItem(rows, from, to).map((row, index) => ({ ...row, sort: index }));
          return { ...prev, [list]: next } as State;
        }),
      reorderConsoleTypes: (activeName, overName) =>
        update((prev) => {
          const from = prev.consoleTypes.indexOf(activeName);
          const to = prev.consoleTypes.indexOf(overName);
          if (from < 0 || to < 0 || from === to) return prev;
          return { ...prev, consoleTypes: moveItem(prev.consoleTypes, from, to) };
        }),
      reorderMenuCategories: (activeName, overName) =>
        update((prev) => {
          const from = prev.menuCategories.indexOf(activeName);
          const to = prev.menuCategories.indexOf(overName);
          if (from < 0 || to < 0 || from === to) return prev;
          return { ...prev, menuCategories: moveItem(prev.menuCategories, from, to) };
        }),
      removeStation: (stationId) =>
        update((prev) => ({
          ...prev,
          stations: prev.stations.filter((s) => s.id !== stationId),
        })),
      updateStation: (stationId, patch) =>
        mapStation(stationId, (station) => ({ ...station, ...patch })),
      addMenuItem: (name, price, category) =>
        update((prev) => {
          const cat = category?.trim() || prev.menuCategories[0] || "Lainnya";
          return {
            ...prev,
            menuCategories: prev.menuCategories.includes(cat)
              ? prev.menuCategories
              : [...prev.menuCategories, cat],
            menu: [...prev.menu, { id: `m-${Date.now()}`, name, price, category: cat }],
          };
        }),
      updateMenuItem: (id, patch) =>
        update((prev) => ({
          ...prev,
          menu: prev.menu.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      removeMenuItem: (id) =>
        update((prev) => ({
          ...prev,
          menu: prev.menu.filter((m) => m.id !== id),
        })),
      addMenuCategory: (name) => {
        const clean = name.trim();
        if (!clean) return false;
        if (state.menuCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) return false;
        update((prev) => ({ ...prev, menuCategories: [...prev.menuCategories, clean] }));
        return true;
      },
      renameMenuCategory: (oldName, newName) => {
        const clean = newName.trim();
        if (!clean || clean === oldName) return false;
        if (state.menuCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) return false;
        update((prev) => ({
          ...prev,
          menuCategories: prev.menuCategories.map((c) => (c === oldName ? clean : c)),
          menu: prev.menu.map((m) => (m.category === oldName ? { ...m, category: clean } : m)),
        }));
        return true;
      },
      removeMenuCategory: (name) => {
        if (state.menu.some((m) => m.category === name)) return false;
        if (state.menuCategories.length <= 1) return false;
        update((prev) => ({
          ...prev,
          menuCategories: prev.menuCategories.filter((c) => c !== name),
        }));
        return true;
      },
      addCafeTable: (init) =>
        update((prev) => {
          const n = prev.cafeTables.length + 1;
          return {
            ...prev,
            cafeTables: [
              ...prev.cafeTables,
              {
                id: `meja-${Date.now()}`,
                name: init?.name?.trim() || `Meja ${String(n).padStart(2, "0")}`,
                area: init?.area?.trim() || "Indoor",
                seats: Math.max(1, init?.seats ?? 2),
                customerName: "",
                notes: "",
                openedAt: null,
                orders: [],
              },
            ],
          };
        }),
      updateCafeTable: (tableId, patch) =>
        update((prev) => ({
          ...prev,
          cafeTables: prev.cafeTables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
        })),
      removeCafeTable: (tableId) => {
        const table = state.cafeTables.find((t) => t.id === tableId);
        if (table && (table.openedAt || table.orders.length > 0)) return false;
        update((prev) => ({
          ...prev,
          cafeTables: prev.cafeTables.filter((t) => t.id !== tableId),
        }));
        return true;
      },
      openCafeTable: (tableId, customerName, notes) =>
        !shiftOpen
          ? undefined
          : update((prev) => ({
          ...prev,
          cafeTables: prev.cafeTables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  openedAt: t.openedAt ?? Date.now(),
                  customerName: customerName ?? t.customerName,
                  notes: notes ?? t.notes,
                }
              : t,
          ),
        })),
      addCafeOrder: (tableId, item, qty) =>
        !shiftOpen
          ? undefined
          : update((prev) => ({
          ...prev,
          cafeTables: prev.cafeTables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  openedAt: t.openedAt ?? Date.now(),
                  orders: [
                    ...t.orders,
                    { id: `${item.id}-${Date.now()}`, menuId: item.id, name: item.name, price: item.price, qty },
                  ],
                }
              : t,
          ),
        })),
      removeCafeOrder: (tableId, orderId) =>
        update((prev) => ({
          ...prev,
          cafeTables: prev.cafeTables.map((t) =>
            t.id === tableId ? { ...t, orders: t.orders.filter((o) => o.id !== orderId) } : t,
          ),
        })),
      clearCafeTable: (tableId) =>
        update((prev) => ({
          ...prev,
          cafeTables: prev.cafeTables.map((t) =>
            t.id === tableId ? { ...t, orders: [], openedAt: null, customerName: "", notes: "" } : t,
          ),
        })),
      payCafeTable: (tableId, input) => {
        let record: HistoryRecord | null = null;
        setState((prev) => {
          const table = prev.cafeTables.find((t) => t.id === tableId);
          if (!table || table.orders.length === 0) return prev;
          const endAt = Date.now();
          const methodsUsed = input.payments?.length
            ? input.payments.map((p) => p.method)
            : [input.payment ?? ""];
          const bill = cafeBill(
            table.orders,
            endAt,
            prev,
            { member: Boolean(input.member), card: methodsUsed.includes(CARD_PAYMENT_NAME) },
            input.discount,
          );
          const total = bill.total;
          const splits = input.payments?.length ? input.payments : [];
          const received = splits.length
            ? splits.reduce((sum, p) => sum + p.amount, 0)
            : (input.amountPaid ?? total);
          if (received + 0.5 < total) return prev;
          const label = splits.length
            ? Array.from(new Set(splits.map((p) => p.method))).join(" + ")
            : input.payment || "Cash";
          const completed: HistoryRecord = {
            id: `cafe-${tableId}-${endAt}`,
            stationName: table.name,
            console: "Kafe",
            mode: "prepaid",
            startAt: table.openedAt ?? endAt,
            endAt,
            minutes: 0,
            rentalTotal: 0,
            fnbTotal: bill.fnb,
            total,
            discount: bill.discount,
            ...(bill.promoName ? { promoName: bill.promoName } : {}),
            payment: label,
            ...(splits.length > 1 ? { payments: splits } : {}),
            customerName: table.customerName || "Pelanggan Kafe",
            packageName: "Kafe",
            amountPaid: received,
            change: Math.max(0, received - total),
            orders: table.orders,
            kind: "cafe",
            tableName: table.name,
          };
          record = completed;
          return {
            ...prev,
            history: [completed, ...prev.history],
            cafeTables: prev.cafeTables.map((t) =>
              t.id === tableId ? { ...t, orders: [], openedAt: null, customerName: "", notes: "" } : t,
            ),
          };
        });
        return record;
      },

      addPaymentMethod: (name) =>
        update((prev) => ({
          ...prev,
          paymentMethods: [
            ...prev.paymentMethods,
            { id: `pm-${Date.now()}`, name, active: true },
          ],
        })),
      updatePaymentMethod: (id, patch) =>
        update((prev) => ({
          ...prev,
          paymentMethods: prev.paymentMethods.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),
      removePaymentMethod: (id) =>
        update((prev) => ({
          ...prev,
          paymentMethods: prev.paymentMethods.filter((p) => p.id !== id),
        })),
      addPackage: (name, durationMin, price) =>
        update((prev) => ({
          ...prev,
          packages: [...prev.packages, { id: `pkg-${Date.now()}`, name, durationMin, price, active: true }],
        })),
      updatePackage: (id, patch) =>
        update((prev) => ({
          ...prev,
          packages: prev.packages.map((item) => item.id === id ? { ...item, ...patch } : item),
        })),
      removePackage: (id) =>
        update((prev) => ({ ...prev, packages: prev.packages.filter((item) => item.id !== id) })),
      setRoundingRule: (roundingRule) => update((prev) => ({ ...prev, roundingRule })),
      setDefaultBonusMin: (minutes) => update((prev) => ({ ...prev, defaultBonusMin: Math.round(minutes) })),
      setTvNotice: (patch) =>
        update((prev) => ({ ...prev, tvNotice: { ...prev.tvNotice, ...patch } })),
      setRolePermissions: (role, keys) =>
        update((prev) => ({
          ...prev,
          rolePermissions: { ...prev.rolePermissions, [role]: keys },
        })),
      addPrinter: (init) =>
        update((prev) => {
          const id = `prt-${Date.now().toString(36)}`;
          const printer: PrinterConfig = {
            id,
            name: init?.name?.trim() || `Printer ${prev.printers.length + 1}`,
            role: init?.role ?? "receipt",
            paper: init?.paper ?? "80mm",
            fontSizePt: init?.fontSizePt ?? 9,
            bold: init?.bold ?? false,
            marginMm: init?.marginMm ?? 3,
            copies: init?.copies ?? 1,
            active: true,
            sort: prev.printers.length + 1,
          };
          return { ...prev, printers: [...prev.printers, printer] };
        }),
      updatePrinter: (id, patch) =>
        update((prev) => ({
          ...prev,
          printers: prev.printers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePrinter: (id) =>
        update((prev) => ({ ...prev, printers: prev.printers.filter((p) => p.id !== id) })),
      setReceiptLayout: (patch) =>
        update((prev) => ({ ...prev, receiptLayout: { ...prev.receiptLayout, ...patch } })),
      setInvoiceLayout: (patch) =>
        update((prev) => ({ ...prev, invoiceLayout: { ...prev.invoiceLayout, ...patch } })),
      adjustBonusTime: (stationId, deltaMin) =>
        mapStation(stationId, (s) =>
          s.session
            ? { ...s, session: { ...s.session, bonusMin: (s.session.bonusMin ?? 0) + Math.round(deltaMin) } }
            : s,
        ),
      setSessionBonus: (stationId, bonusMin) =>
        mapStation(stationId, (s) =>
          s.session ? { ...s, session: { ...s.session, bonusMin: Math.round(bonusMin) } } : s,
        ),
      updateSessionCustomer: (stationId, patch) =>
        mapStation(stationId, (s) => {
          if (!s.session) return s;
          const { customerId, ...rest } = patch;
          const { customerId: _old, ...session } = s.session;
          return {
            ...s,
            session: { ...session, ...rest, ...(customerId ? { customerId } : {}) },
          };
        }),
      pauseSession: (stationId) =>
        mapStation(stationId, (s) =>
          s.session && !s.session.pausedAt
            ? { ...s, session: { ...s.session, pausedAt: Date.now() } }
            : s,
        ),
      resumeSession: (stationId) =>
        mapStation(stationId, (s) => {
          if (!s.session?.pausedAt) return s;
          const extra = Math.max(0, Date.now() - s.session.pausedAt);
          const { pausedAt: _pausedAt, ...rest } = s.session;
          return {
            ...s,
            session: { ...rest, pausedMs: (s.session.pausedMs ?? 0) + extra },
          };
        }),
      addCustomer: (input) => {
        const customer: Customer = { id: `customer-${Date.now()}`, ...input, points: 0, visits: 0, totalSpent: 0, createdAt: Date.now() };
        update((prev) => ({ ...prev, customers: [customer, ...prev.customers] }));
        return customer;
      },
      updateCustomer: (id, patch) => update((prev) => ({ ...prev, customers: prev.customers.map((item) => item.id === id ? { ...item, ...patch } : item) })),
      removeCustomer: (id) => update((prev) => ({ ...prev, customers: prev.customers.filter((item) => item.id !== id) })),
      adjustPoints: (customerId, points, reason) => update((prev) => ({ ...prev, customers: prev.customers.map((item) => item.id === customerId ? { ...item, points: Math.max(0, item.points + points) } : item), pointEntries: [{ id: `point-${Date.now()}`, customerId, points, reason, createdAt: Date.now() }, ...prev.pointEntries] })),
      setPointsPerRupiah: (pointsPerRupiah) => update((prev) => ({ ...prev, pointsPerRupiah: Math.max(1, pointsPerRupiah) })),
      buyPlayingCard: (input) => {
        const cardNumber = input.cardNumber.trim();
        if (!cardNumber) return null;
        if (findCardByNumber(state.playingCards, cardNumber)) return null;
        const cardCode = input.cardCode?.trim() ?? "";
        const now = Date.now();
        const topup = Math.max(0, Math.round(input.topup ?? 0));
        const price = Math.max(0, Math.round(input.price ?? state.cardPrice));
        const holderName = input.customerName?.trim() || "";
        const holderPhone = input.customerPhone?.trim() || "";
        const member = input.member ?? false;

        // Pemegang kartu ikut tercatat di database pelanggan.
        let customerId = input.customerId;
        let newCustomer: Customer | null = null;
        if (!customerId && holderName && holderName.toLowerCase() !== "umum") {
          const existing = state.customers.find(
            (c) =>
              (holderPhone && c.phone.trim() === holderPhone) ||
              c.name.trim().toLowerCase() === holderName.toLowerCase(),
          );
          if (existing) {
            customerId = existing.id;
          } else {
            newCustomer = {
              id: `customer-${now}`,
              name: holderName,
              phone: holderPhone,
              member,
              level: "Bronze",
              points: 0,
              visits: 0,
              totalSpent: 0,
              createdAt: now,
            };
            customerId = newCustomer.id;
          }
        }

        const card: PlayingCard = {
          id: `card-${now}`,
          cardNumber,
          ...(cardCode ? { cardCode } : {}),
          ...(customerId ? { customerId } : {}),
          customerName: holderName || "Umum",
          customerPhone: holderPhone,
          member,
          balance: topup,
          active: true,
          cardPrice: price,
          createdAt: now,
        };
        const entries: CardEntry[] = [
          {
            id: `ce-${now}`,
            cardId: card.id,
            cardNumber: card.cardNumber,
            ...(card.cardCode ? { cardCode: card.cardCode } : {}),
            type: "purchase",
            amount: price,
            balanceAfter: 0,
            note: "Pembelian kartu baru",
            createdAt: now,
          },
        ];
        if (topup > 0) {
          entries.unshift({
            id: `ce-${now}-topup`,
            cardId: card.id,
            cardNumber: card.cardNumber,
            ...(card.cardCode ? { cardCode: card.cardCode } : {}),
            type: "topup",
            amount: topup,
            balanceAfter: topup,
            note: "Top-up awal",
            createdAt: now + 1,
          });
        }
        update((prev) => ({
          ...prev,
          playingCards: [card, ...prev.playingCards],
          cardEntries: [...entries, ...prev.cardEntries],
          cashEntries: (() => {
            const method = input.payment?.trim() || "Cash";
            const rows = [
              cardSaleCashEntry(prev.cashCategories, price, cardNumber, now, method),
              cardTopupCashEntry(prev.cashCategories, topup, cardNumber, now, method),
            ].filter(Boolean) as CashEntry[];
            return rows.length ? [...rows, ...prev.cashEntries] : prev.cashEntries;
          })(),
          customers: newCustomer
            ? [newCustomer, ...prev.customers]
            : customerId
              ? prev.customers.map((c) =>
                  c.id === customerId
                    ? {
                        ...c,
                        ...(holderName ? { name: holderName } : {}),
                        ...(holderPhone ? { phone: holderPhone } : {}),
                        member: c.member || member,
                      }
                    : c,
                )
              : prev.customers,
        }));
        return card;
      },
      updatePlayingCard: (id, patch) =>
        update((prev) => {
          const card = prev.playingCards.find((c) => c.id === id);
          const linkedId = patch.customerId ?? card?.customerId;
          return {
            ...prev,
            playingCards: prev.playingCards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            customers: linkedId
              ? prev.customers.map((c) =>
                  c.id === linkedId
                    ? {
                        ...c,
                        ...(patch.customerName?.trim()
                          ? { name: patch.customerName.trim() }
                          : {}),
                        ...(patch.customerPhone !== undefined
                          ? { phone: patch.customerPhone.trim() }
                          : {}),
                        ...(patch.member !== undefined ? { member: patch.member } : {}),
                      }
                    : c,
                )
              : prev.customers,
          };
        }),

      removePlayingCard: (id) =>
        update((prev) => ({
          ...prev,
          playingCards: prev.playingCards.filter((c) => c.id !== id),
          cardEntries: prev.cardEntries.filter((e) => e.cardId !== id),
        })),
      topupCard: (id, amount, note, payment) => {
        const value = Math.round(amount);
        const card = state.playingCards.find((c) => c.id === id);
        if (!card || value <= 0) return false;
        const stamp = Date.now();
        const method = payment?.trim() || "Cash";
        update((prev) => ({
          ...prev,
          playingCards: prev.playingCards.map((c) =>
            c.id === id ? { ...c, balance: c.balance + value } : c,
          ),
          cardEntries: [
            {
              id: `ce-${stamp}`,
              cardId: id,
              cardNumber: card.cardNumber,
            ...(card.cardCode ? { cardCode: card.cardCode } : {}),
              type: "topup",
              amount: value,
              balanceAfter: card.balance + value,
              note: `${note?.trim() || "Top-up saldo"} · ${method}`,
              createdAt: stamp,
            },
            ...prev.cardEntries,
          ],
          cashEntries: (() => {
            const row = cardTopupCashEntry(
              prev.cashCategories,
              value,
              card.cardNumber,
              stamp,
              method,
            );
            return row ? [row, ...prev.cashEntries] : prev.cashEntries;
          })(),
        }));
        return true;
      },
      adjustCardBalance: (id, amount, note) => {
        const value = Math.round(amount);
        const card = state.playingCards.find((c) => c.id === id);
        if (!card || value === 0) return false;
        const next = card.balance + value;
        if (next < 0) return false;
        const stamp = Date.now();
        update((prev) => ({
          ...prev,
          playingCards: prev.playingCards.map((c) => (c.id === id ? { ...c, balance: next } : c)),
          cardEntries: [
            {
              id: `ce-${stamp}`,
              cardId: id,
              cardNumber: card.cardNumber,
            ...(card.cardCode ? { cardCode: card.cardCode } : {}),
              type: "adjust",
              amount: value,
              balanceAfter: next,
              note: note.trim() || "Penyesuaian saldo",
              createdAt: stamp,
            },
            ...prev.cardEntries,
          ],
        }));
        return true;
      },
      chargeCard: (id, amount, note) => {
        const value = Math.round(amount);
        const card = state.playingCards.find((c) => c.id === id);
        if (!card || !card.active || value <= 0) return false;
        if (card.balance + 0.5 < value) return false;
        const next = card.balance - value;
        const stamp = Date.now();
        update((prev) => ({
          ...prev,
          playingCards: prev.playingCards.map((c) => (c.id === id ? { ...c, balance: next } : c)),
          cardEntries: [
            {
              id: `ce-${stamp}`,
              cardId: id,
              cardNumber: card.cardNumber,
            ...(card.cardCode ? { cardCode: card.cardCode } : {}),
              type: "payment",
              amount: -value,
              balanceAfter: next,
              note: note.trim() || "Pembayaran",
              createdAt: stamp,
            },
            ...prev.cardEntries,
          ],
        }));
        return true;
      },
      setCardPrice: (value) => update((prev) => ({ ...prev, cardPrice: Math.max(0, Math.round(value)) })),
      setCardDiscountPercent: (value) =>
        update((prev) => ({ ...prev, cardDiscountPercent: Math.min(100, Math.max(0, Math.round(value))) })),
      setCardMemberDiscountPercent: (value) =>
        update((prev) => ({ ...prev, cardMemberDiscountPercent: Math.min(100, Math.max(0, Math.round(value))) })),
      addBooking: (input) => {
        const conflict = state.bookings.some((item) => item.stationId === input.stationId && item.status !== "cancelled" && item.status !== "completed" && input.startAt < item.endAt && input.endAt > item.startAt);
        if (conflict) return false;
        update((prev) => ({ ...prev, bookings: [{ ...input, id: `booking-${Date.now()}`, status: "confirmed" }, ...prev.bookings] }));
        return true;
      },
      updateBooking: (id, patch) => {
        const current = state.bookings.find((item) => item.id === id);
        if (!current) return false;
        const candidate = { ...current, ...patch };
        const conflict = state.bookings.some((item) => item.id !== id && item.stationId === candidate.stationId && item.status !== "cancelled" && item.status !== "completed" && candidate.startAt < item.endAt && candidate.endAt > item.startAt);
        if (conflict) return false;
        update((prev) => ({ ...prev, bookings: prev.bookings.map((item) => item.id === id ? candidate : item) }));
        return true;
      },
      removeBooking: (id) => update((prev) => ({ ...prev, bookings: prev.bookings.filter((item) => item.id !== id) })),
      addPromotion: (input) => update((prev) => ({ ...prev, promotions: [{ ...input, id: `promo-${Date.now()}` }, ...prev.promotions] })),
      updatePromotion: (id, patch) => update((prev) => ({ ...prev, promotions: prev.promotions.map((item) => item.id === id ? { ...item, ...patch } : item) })),
      removePromotion: (id) => update((prev) => ({ ...prev, promotions: prev.promotions.filter((item) => item.id !== id) })),
      updateHistoryPayment: (id, patch) =>
        update((prev) => ({
          ...prev,
          history: prev.history.map((item) => {
            if (item.id !== id) return item;
            const { payments: _old, ...rest } = item;
            const next: HistoryRecord = { ...rest };
            if (patch.payment !== undefined) next.payment = patch.payment;
            if (patch.payments && patch.payments.length > 0) next.payments = patch.payments;
            return next;
          }),
        })),
      removeHistory: (id) =>
        update((prev) => ({ ...prev, history: prev.history.filter((item) => item.id !== id) })),
      clearHistory: () => update((prev) => ({ ...prev, history: [] })),
      resetTransactions: () =>
        update((prev) => ({ ...prev, history: [], pointEntries: [], cashEntries: [] })),
      addCashCategory: (input) => {
        const name = input.name.trim();
        if (!name) return null;
        const exists = state.cashCategories.some(
          (item) =>
            item.direction === input.direction &&
            item.name.trim().toLowerCase() === name.toLowerCase(),
        );
        if (exists) return null;
        const row: CashCategory = {
          id: `cash-cat-${Date.now()}`,
          name,
          direction: input.direction,
          payout: Boolean(input.payout),
          group: input.group?.trim() ? input.group.trim() : "Lainnya",
          active: true,
        };
        update((prev) => ({ ...prev, cashCategories: [...prev.cashCategories, row] }));
        return row;
      },
      updateCashCategory: (id, patch) =>
        update((prev) => ({
          ...prev,
          cashCategories: prev.cashCategories.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      removeCashCategory: (id) =>
        update((prev) => ({
          ...prev,
          cashCategories: prev.cashCategories.filter((item) => item.id !== id),
        })),
      addCashEntry: (input) => {
        const category = state.cashCategories.find((item) => item.id === input.categoryId);
        const amount = Math.max(0, Math.round(input.amount));
        if (!category || amount <= 0) return null;
        const row: CashEntry = {
          id: `cash-${Date.now()}`,
          categoryId: category.id,
          categoryName: category.name,
          group: category.group,
          direction: category.direction,
          payout: category.payout,
          amount,
          payment: input.payment?.trim() ? input.payment.trim() : "Cash",
          note: input.note?.trim() ?? "",
          createdAt: input.createdAt ?? Date.now(),
        };
        update((prev) => ({ ...prev, cashEntries: [row, ...prev.cashEntries] }));
        return row;
      },
      updateCashEntry: (id, patch) =>
        update((prev) => ({
          ...prev,
          cashEntries: prev.cashEntries.map((item) => {
            if (item.id !== id) return item;
            const category = patch.categoryId
              ? prev.cashCategories.find((c) => c.id === patch.categoryId)
              : undefined;
            return {
              ...item,
              ...(patch.amount !== undefined ? { amount: Math.max(0, Math.round(patch.amount)) } : {}),
              ...(patch.payment !== undefined ? { payment: patch.payment } : {}),
              ...(patch.note !== undefined ? { note: patch.note } : {}),
              ...(category
                ? {
                    categoryId: category.id,
                    categoryName: category.name,
                    group: category.group,
                    direction: category.direction,
                    payout: category.payout,
                  }
                : {}),
            };
          }),
        })),
      removeCashEntry: (id) =>
        update((prev) => ({ ...prev, cashEntries: prev.cashEntries.filter((item) => item.id !== id) })),
      openShift: (input) => {
        const name = input.cashierName.trim();
        if (!name) return null;
        if (state.shifts.some((s) => !s.closedAt)) return null;
        const row: CashShift = {
          id: `shift-${Date.now()}`,
          cashierName: name,
          ...(input.cashierId ? { cashierId: input.cashierId } : {}),
          openedAt: Date.now(),
          startCash: Math.max(0, Math.round(input.startCash)),
        };
        update((prev) => ({ ...prev, shifts: [row, ...prev.shifts] }));
        return row;
      },
      closeShift: (id, input) => {
        const shift = state.shifts.find((s) => s.id === id);
        if (!shift || shift.closedAt) return null;
        const closed: CashShift = {
          ...shift,
          closedAt: Date.now(),
          cashActual: Math.max(0, Math.round(input.cashActual)),
          balanceNote: input.balanceNote?.trim() ?? "",
          nextStartCash: Math.max(0, Math.round(input.nextStartCash ?? 0)),
        };
        update((prev) => ({
          ...prev,
          shifts: prev.shifts.map((s) => (s.id === id ? closed : s)),
        }));
        return closed;
      },
      exportSnapshot: () => JSON.parse(JSON.stringify(state)) as State,

      replaceAll: (data) => setState(migrateState(data)),
      resetAll: () => setState(JSON.parse(JSON.stringify(defaultState)) as State),
      sync,
    }),
    [
      state,
      now,
      sync,
      startSessionWithRate,
      stopSession,
      settleSession,
      removeSettlement,

      addTime,
      addOrder,
      removeOrder,
      update,
      mapStation,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling harus dipakai di dalam BillingProvider");
  return ctx;
}

export function playAlarm() {
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtor();
    const beep = (start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.25);
    };
    [0, 0.35, 0.7].forEach(beep);
  } catch {
    /* audio not available */
  }
}
