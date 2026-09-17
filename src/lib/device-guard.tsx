import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { useStoreInfo } from "@/lib/store-info";

const CODE_KEY = "billing.device-code";
const VERDICT_KEY = "billing.device-allowed";

/** Kode unik perangkat ini (pengganti MAC Address, dibuat sekali lalu disimpan). */
export function deviceCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = localStorage.getItem(CODE_KEY);
    if (saved) return saved;
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("-");
    localStorage.setItem(CODE_KEY, code);
    return code;
  } catch {
    return "";
  }
}

/**
 * Cocokkan alamat IP dengan pola yang diizinkan.
 * Pola boleh memakai bintang, contoh `192.168.80.*` atau `192.168.*`.
 */
export function ipMatches(ip: string, pattern: string) {
  const p = pattern.trim();
  if (!p) return false;
  if (!p.includes("*")) return p === ip;
  const escaped = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(ip);
}

/**
 * Penanda global: perangkat ini boleh menyimpan transaksi / pengaturan.
 * Dipakai penyimpan data (billing-store) yang berada di luar React context.
 */
let writeAllowed = true;
export const deviceWriteAllowed = () => writeAllowed;

export type DeviceAccess = {
  /** Kode perangkat ini */
  code: string;
  /** Alamat IP publik perangkat ini (kosong bila tidak ada koneksi) */
  ip: string;
  /** Store memasang pembatasan perangkat */
  restricted: boolean;
  /** Perangkat / level ini boleh bertransaksi & mengubah pengaturan */
  allowed: boolean;
  /** Data store benar-benar terbaca dari server, jadi keputusan bisa dipercaya */
  checked: boolean;
  /** Level pengguna sudah selesai terbaca */
  roleReady: boolean;
  /** Level tinggi (Manager / Installer / Developer) — selalu boleh */
  privileged: boolean;
  /** Nama store yang menilai perangkat ini */
  storeName: string;
};

const Ctx = createContext<DeviceAccess>({
  code: "",
  ip: "",
  restricted: false,
  allowed: true,
  checked: false,
  roleReady: false,
  privileged: false,
  storeName: "",
});

export function DeviceGuardProvider({ children }: { children: ReactNode }) {
  const { session, role, loading: authLoading } = useAuth();
  const { store, fresh } = useStoreInfo(Boolean(session));
  const [ip, setIp] = useState("");
  const code = useMemo(() => deviceCode(), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/public/client-ip");
        if (!res.ok) return;
        const body = (await res.json()) as { ip?: string };
        if (!cancelled) setIp(body.ip ?? "");
      } catch {
        /* luring: biarkan kosong */
      }
    };
    void load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const registered = store?.device_code ?? "";
  const allowedDevices = store?.allowed_devices ?? [];
  const allowedIps = store?.allowed_ips ?? [];
  const restricted = Boolean(registered) || allowedDevices.length > 0 || allowedIps.length > 0;
  const privileged = role === "installer" || role === "manager" || role === "admin";

  const allowed = useMemo(() => {
    if (!store || !restricted || privileged) return true;
    if (code && allowedDevices.some((d) => d.code === code)) return true;
    if (registered && code && registered === code) return true;
    if (ip) return allowedIps.some((pattern) => ipMatches(ip, pattern));
    // Tanpa koneksi: pakai keputusan terakhir yang tersimpan di perangkat.
    if (typeof window === "undefined") return false;
    return localStorage.getItem(VERDICT_KEY) === "yes";
  }, [store, restricted, privileged, registered, code, ip, allowedIps, allowedDevices]);


  useEffect(() => {
    writeAllowed = allowed;
    if (typeof window === "undefined") return;
    if (ip || !restricted) {
      try {
        localStorage.setItem(VERDICT_KEY, allowed ? "yes" : "no");
      } catch {
        /* ignore */
      }
    }
  }, [allowed, ip, restricted]);

  const roleReady = !authLoading && role !== null;

  const value = useMemo<DeviceAccess>(
    () => ({
      code,
      ip,
      restricted,
      allowed,
      // Hanya data yang baru dibaca dari server yang boleh dipakai untuk menolak.
      checked: fresh,
      roleReady,
      privileged,
      storeName: store?.store_name ?? "",
    }),
    [code, ip, restricted, allowed, fresh, roleReady, privileged, store],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDeviceAccess() {
  return useContext(Ctx);
}

export const DEVICE_BLOCKED_MESSAGE =
  "Perangkat ini tidak terdaftar di data store, jadi hanya bisa melihat. Minta Manager atau Installer mendaftarkan kode perangkat atau alamat IP-nya.";

/** Alasan penolakan masuk, dibaca halaman masuk setelah perangkat dikeluarkan. */
export const DEVICE_REJECT_KEY = "billing.device-rejected";

export function setDeviceReject(code: string) {
  try {
    sessionStorage.setItem(DEVICE_REJECT_KEY, code);
  } catch {
    /* ignore */
  }
}

export function takeDeviceReject(): string | null {
  try {
    const value = sessionStorage.getItem(DEVICE_REJECT_KEY);
    if (value !== null) sessionStorage.removeItem(DEVICE_REJECT_KEY);
    return value;
  } catch {
    return null;
  }
}
