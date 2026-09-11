import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ConsoleType = "PS3" | "PS4" | "PS5";
export type PlayMode = "prepaid" | "open";

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
};

export type Station = {
  id: string;
  name: string;
  console: ConsoleType;
  session: Session | null;
};

export type MenuItem = { id: string; name: string; price: number };

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
};

export type Rates = Record<ConsoleType, number>;

type State = {
  stations: Station[];
  rates: Rates;
  menu: MenuItem[];
  history: HistoryRecord[];
};

const STORAGE_KEY = "billing-ps-state-v1";

const defaultState: State = {
  stations: [
    { id: "tv-1", name: "TV 01", console: "PS3", session: null },
    { id: "tv-2", name: "TV 02", console: "PS3", session: null },
    { id: "tv-3", name: "TV 03", console: "PS4", session: null },
    { id: "tv-4", name: "TV 04", console: "PS4", session: null },
    { id: "tv-5", name: "TV 05", console: "PS5", session: null },
    { id: "tv-6", name: "TV 06", console: "PS5", session: null },
  ],
  rates: { PS3: 5000, PS4: 8000, PS5: 12000 },
  menu: [
    { id: "m1", name: "Air Mineral", price: 4000 },
    { id: "m2", name: "Teh Botol", price: 6000 },
    { id: "m3", name: "Kopi Sachet", price: 5000 },
    { id: "m4", name: "Indomie Goreng", price: 10000 },
    { id: "m5", name: "Nasi Goreng", price: 15000 },
    { id: "m6", name: "Snack Ringan", price: 7000 },
  ],
  history: [],
};

export function formatRupiah(value: number) {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function elapsedSeconds(session: Session, now: number) {
  return Math.max(0, Math.floor((now - session.startAt) / 1000));
}

export function remainingSeconds(session: Session, now: number) {
  if (session.mode === "open") return Infinity;
  return session.durationMin * 60 - elapsedSeconds(session, now);
}

export function rentalTotal(session: Session, now: number) {
  if (session.mode === "prepaid") {
    return (session.rate * session.durationMin) / 60;
  }
  const mins = Math.ceil(elapsedSeconds(session, now) / 60);
  return (session.rate * mins) / 60;
}

export function fnbTotal(session: Session) {
  return session.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
}

export type StationStatus = "idle" | "playing" | "timeup";

export function stationStatus(station: Station, now: number): StationStatus {
  if (!station.session) return "idle";
  if (station.session.mode === "open") return "playing";
  return remainingSeconds(station.session, now) <= 0 ? "timeup" : "playing";
}

type Ctx = State & {
  now: number;
  startSession: (
    stationId: string,
    mode: PlayMode,
    durationMin: number,
  ) => void;
  stopSession: (stationId: string) => HistoryRecord | null;
  addTime: (stationId: string, extraMin: number) => void;
  addOrder: (stationId: string, item: MenuItem, qty: number) => void;
  removeOrder: (stationId: string, orderId: string) => void;
  setRates: (rates: Rates) => void;
  setStationConsole: (stationId: string, console: ConsoleType) => void;
  addStation: () => void;
  removeStation: (stationId: string) => void;
  addMenuItem: (name: string, price: number) => void;
  removeMenuItem: (id: string) => void;
  clearHistory: () => void;
};

const BillingContext = createContext<Ctx | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(defaultState);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
    (stationId, mode, durationMin) =>
      mapStation(stationId, (s) => ({
        ...s,
        session: {
          mode,
          startAt: Date.now(),
          durationMin: mode === "prepaid" ? durationMin : 0,
          rate: 0,
          orders: [],
        },
      })),
    [mapStation],
  );

  // rate snapshot needs access to rates; wrap it
  const startSessionWithRate = useCallback<Ctx["startSession"]>(
    (stationId, mode, durationMin) =>
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
                  rate: prev.rates[s.console],
                  orders: [],
                },
              }
            : s,
        ),
      })),
    [update],
  );
  void startSession;

  const stopSession = useCallback<Ctx["stopSession"]>(
    (stationId) => {
      let record: HistoryRecord | null = null;
      setState((prev) => {
        const station = prev.stations.find((s) => s.id === stationId);
        if (!station?.session) return prev;
        const endAt = Date.now();
        const session = station.session;
        const rental = rentalTotal(session, endAt);
        const fnb = fnbTotal(session);
        record = {
          id: `${stationId}-${endAt}`,
          stationName: station.name,
          console: station.console,
          mode: session.mode,
          startAt: session.startAt,
          endAt,
          minutes: Math.ceil(elapsedSeconds(session, endAt) / 60),
          rentalTotal: rental,
          fnbTotal: fnb,
          total: rental + fnb,
        };
        return {
          ...prev,
          history: [record, ...prev.history],
          stations: prev.stations.map((s) =>
            s.id === stationId ? { ...s, session: null } : s,
          ),
        };
      });
      return record;
    },
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

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      now,
      startSession: startSessionWithRate,
      stopSession,
      addTime,
      addOrder,
      removeOrder,
      setRates: (rates) => update((prev) => ({ ...prev, rates })),
      setStationConsole: (stationId, consoleType) =>
        mapStation(stationId, (s) => ({ ...s, console: consoleType })),
      addStation: () =>
        update((prev) => {
          const n = prev.stations.length + 1;
          return {
            ...prev,
            stations: [
              ...prev.stations,
              {
                id: `tv-${Date.now()}`,
                name: `TV ${String(n).padStart(2, "0")}`,
                console: "PS4",
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
      addMenuItem: (name, price) =>
        update((prev) => ({
          ...prev,
          menu: [...prev.menu, { id: `m-${Date.now()}`, name, price }],
        })),
      removeMenuItem: (id) =>
        update((prev) => ({
          ...prev,
          menu: prev.menu.filter((m) => m.id !== id),
        })),
      clearHistory: () => update((prev) => ({ ...prev, history: [] })),
    }),
    [
      state,
      now,
      startSessionWithRate,
      stopSession,
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
