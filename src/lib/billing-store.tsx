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

export type ConsoleType = string;
export type PlayMode = "prepaid" | "open";
export type StationAvailability = "available" | "booked" | "maintenance" | "offline";
export type RoundingRule = "minute" | "30-minutes" | "hour";

export type OrderItem = {
  id: string;
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
};

export type MenuItem = { id: string; name: string; price: number; category: string };

export type CafeTable = {
  id: string;
  name: string; // nomor meja
  area: string;
  seats: number;
  customerName: string;
  notes: string;
  openedAt: number | null;
  orders: OrderItem[];
};


export type PaymentMethod = { id: string; name: string; active: boolean };
export type RentalPackage = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  active: boolean;
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
};
export type PointEntry = { id: string; customerId: string; points: number; reason: string; createdAt: number };
export type PaymentSplit = { method: string; amount: number };

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
};

export type Rates = Record<string, number>;

type State = {
  stations: Station[];
  consoleTypes: string[];
  rates: Rates;
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
};


const STORAGE_KEY = "billing-ps-state-v1";

const defaultState: State = {
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
  menu: [
    { id: "m1", name: "Air Mineral", price: 4000, category: "Minuman" },
    { id: "m2", name: "Teh Botol", price: 6000, category: "Minuman" },
    { id: "m3", name: "Kopi Hitam", price: 8000, category: "Coffee" },
    { id: "m4", name: "Es Kopi Susu", price: 15000, category: "Coffee" },
    { id: "m5", name: "Juice Jeruk", price: 14000, category: "Juice" },
    { id: "m6", name: "Indomie Goreng", price: 10000, category: "Snack" },
    { id: "m7", name: "Snack Ringan", price: 7000, category: "Snack" },
    { id: "m8", name: "Nasi Goreng", price: 15000, category: "Main Course" },
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
    { id: "pm-transfer", name: "Transfer Bank", active: true },
    { id: "pm-compliment", name: "Compliment", active: true },
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
};

export function formatRupiah(value: number) {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

export function paidTotal(session: Session | null | undefined) {
  return (session?.settlements ?? []).reduce((sum, s) => sum + s.amount, 0);
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

export function rentalTotal(session: Session, now: number) {
  if (session.mode === "prepaid") {
    return (session.rate * session.durationMin) / 60;
  }
  const rawMinutes = Math.max(1, Math.ceil(elapsedSeconds(session, now) / 60));
  const mins = rawMinutes;
  return (session.rate * mins) / 60;
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
            customerName: station.session.customerName ?? "Pelanggan Umum",
            customerPhone: station.session.customerPhone ?? "",
            member: station.session.member ?? false,
            packageName: station.session.packageName ?? (station.session.mode === "open" ? "Open Time" : `${station.session.durationMin} Menit`),
            notes: station.session.notes ?? "",
            bonusMin: station.session.bonusMin ?? 0,
          }
        : null,
    })),
    rates: parsed.rates ?? defaultState.rates,
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
    paymentMethods: parsed.paymentMethods ?? defaultState.paymentMethods,
    packages: parsed.packages ?? defaultState.packages,
    roundingRule: parsed.roundingRule ?? defaultState.roundingRule,
    defaultBonusMin: parsed.defaultBonusMin ?? defaultState.defaultBonusMin,
    customers: parsed.customers ?? defaultState.customers,
    bookings: parsed.bookings ?? defaultState.bookings,
    promotions: parsed.promotions ?? defaultState.promotions,
    pointEntries: parsed.pointEntries ?? defaultState.pointEntries,
    pointsPerRupiah: parsed.pointsPerRupiah ?? defaultState.pointsPerRupiah,

  };
}

type Ctx = State & {
  now: number;
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
  pauseSession: (stationId: string) => void;
  resumeSession: (stationId: string) => void;
  setDefaultBonusMin: (minutes: number) => void;
  addOrder: (stationId: string, item: MenuItem, qty: number) => void;
  removeOrder: (stationId: string, orderId: string) => void;
  setRates: (rates: Rates) => void;
  setStationConsole: (stationId: string, console: ConsoleType) => void;
  addConsoleType: (name: string, rate: number) => boolean;
  renameConsoleType: (oldName: string, newName: string) => boolean;
  setConsoleRate: (name: string, rate: number) => void;
  removeConsoleType: (name: string) => boolean;
  updateStation: (stationId: string, patch: Partial<Omit<Station, "id" | "session">>) => void;
  addStation: (init?: {
    name?: string;
    console?: ConsoleType;
    booth?: string;
  }) => void;
  removeStation: (stationId: string) => void;
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
    input: { payment?: string; payments?: PaymentSplit[]; amountPaid?: number },
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
  addBooking: (input: Omit<Booking, "id" | "status">) => boolean;
  updateBooking: (id: string, patch: Partial<Omit<Booking, "id">>) => boolean;
  removeBooking: (id: string) => void;
  addPromotion: (input: Omit<Promotion, "id">) => void;
  updatePromotion: (id: string, patch: Partial<Omit<Promotion, "id">>) => void;
  removePromotion: (id: string) => void;
  clearHistory: () => void;
  exportSnapshot: () => BillingSnapshot;
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
          customerName: details?.customerName || "Pelanggan Umum",
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
                    customerName: details?.customerName || "Pelanggan Umum",
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
        const rental = rentalTotal(session, endAt);
        const fnb = fnbTotal(session);
        const discount = discountTotal(session, endAt);
        const total = rental + fnb - discount;

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
          id: `${stationId}-${endAt}`,
          stationName: station.name,
          console: station.console,
          mode: session.mode,
          startAt: session.startAt,
          endAt,
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
          ...(session.promoName ? { promoName: session.promoName } : {}),
          discount,
          pointsEarned,
        };

        record = completedRecord;
        return {
          ...prev,
          history: [completedRecord, ...prev.history],
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
        return {
          ...prev,
          stations: prev.stations.map((s) =>
            s.id === stationId && s.session
              ? { ...s, session: { ...s.session, settlements: [...(s.session.settlements ?? []), settlement] } }
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
      mapStation(stationId, (s) =>
        s.session
          ? {
              ...s,
              session: {
                ...s.session,
                settlements: (s.session.settlements ?? []).filter((x) => x.id !== settlementId),
              },
            }
          : s,
      ),
    [mapStation],
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
  const sync = useStoreSync({
    state,
    hydrated,
    enabled: Boolean(authSession),
    applyRemote: setState,
  });

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      now,
      startSession: startSessionWithRate,
      stopSession,
      settleSession,
      removeSettlement,

      addTime,
      addOrder,
      removeOrder,
      setRates: (rates) => update((prev) => ({ ...prev, rates })),
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
          return {
            ...prev,
            consoleTypes: prev.consoleTypes.map((c) => (c === oldName ? clean : c)),
            rates,
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
          return {
            ...prev,
            consoleTypes: prev.consoleTypes.filter((c) => c !== name),
            rates,
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
        update((prev) => ({
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
        update((prev) => ({
          ...prev,
          cafeTables: prev.cafeTables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  openedAt: t.openedAt ?? Date.now(),
                  orders: [
                    ...t.orders,
                    { id: `${item.id}-${Date.now()}`, name: item.name, price: item.price, qty },
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
          const total = table.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
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
            fnbTotal: total,
            total,
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
      clearHistory: () => update((prev) => ({ ...prev, history: [] })),
      resetTransactions: () => update((prev) => ({ ...prev, history: [], pointEntries: [] })),
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
