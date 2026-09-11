import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BillingSnapshot } from "./billing-store";
import {
  applyRecords,
  flattenSnapshot,
  recordKey,
  type SyncRecord,
} from "./sync-records";

const OUTBOX_KEY = "billing-sync-outbox-v1";
const SHADOW_KEY = "billing-sync-shadow-v1";
const SINCE_KEY = "billing-sync-since-v1";
const STORE_KEY = "billing-sync-store-v1";

const EPOCH = "1970-01-01T00:00:00Z";

type Shadow = Record<string, string>;
type Outbox = Record<string, SyncRecord>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** JSON dengan urutan kunci tetap, supaya perbandingan tidak terpengaruh urutan. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan penuh: tetap jalan di memori */
  }
}

export type SyncStatus = {
  online: boolean;
  syncing: boolean;
  pending: number;
  storeId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
  flushNow: () => void;
};

export function useStoreSync(options: {
  state: BillingSnapshot;
  hydrated: boolean;
  enabled: boolean;
  applyRemote: (apply: (prev: BillingSnapshot) => BillingSnapshot) => void;
}): SyncStatus {
  const { state, hydrated, enabled, applyRemote } = options;

  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shadowRef = useRef<Shadow>({});
  const outboxRef = useRef<Outbox>({});
  const busyRef = useRef(false);
  const loadedRef = useRef(false);

  // Muat antrean & bayangan dari perangkat.
  useEffect(() => {
    shadowRef.current = readJson<Shadow>(SHADOW_KEY, {});
    outboxRef.current = readJson<Outbox>(OUTBOX_KEY, {});
    setPending(Object.keys(outboxRef.current).length);
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Cari store milik pengguna yang sedang masuk.
  useEffect(() => {
    if (!enabled) {
      setStoreId(null);
      return;
    }
    const cached = typeof window === "undefined" ? null : localStorage.getItem(STORE_KEY);
    if (cached) setStoreId(cached);
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("store_members")
        .select("store_id")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const id = (data as { store_id: string } | null)?.store_id ?? null;
      if (!id) return;
      if (cached && cached !== id) {
        // Perangkat berpindah store: buang jejak sinkronisasi lama.
        localStorage.removeItem(SHADOW_KEY);
        localStorage.removeItem(OUTBOX_KEY);
        localStorage.removeItem(SINCE_KEY);
        shadowRef.current = {};
        outboxRef.current = {};
        setPending(0);
      }
      localStorage.setItem(STORE_KEY, id);
      setStoreId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Catat setiap perubahan lokal ke antrean kirim.
  useEffect(() => {
    if (!hydrated || !loadedRef.current) return;
    const timer = setTimeout(() => {
      const current = flattenSnapshot(state);
      const shadow = shadowRef.current;
      const outbox = outboxRef.current;
      let changed = false;

      for (const [key, record] of current) {
        const json = stableStringify(record.payload);
        if (shadow[key] !== json) {
          outbox[key] = record;
          changed = true;
        }
      }
      for (const key of Object.keys(shadow)) {
        if (current.has(key)) continue;
        const [kind, ...rest] = key.split(":");
        outbox[key] = {
          kind: kind ?? "",
          entity_id: rest.join(":"),
          payload: {},
          deleted: true,
        };
        changed = true;
      }

      if (changed) {
        writeJson(OUTBOX_KEY, outbox);
        setPending(Object.keys(outbox).length);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [state, hydrated]);

  const noteShadow = useCallback((records: SyncRecord[]) => {
    for (const record of records) {
      const key = recordKey(record.kind, record.entity_id);
      if (record.deleted) delete shadowRef.current[key];
      else shadowRef.current[key] = stableStringify(record.payload);
    }
    writeJson(SHADOW_KEY, shadowRef.current);
  }, []);

  const sync = useCallback(async () => {
    if (!storeId || busyRef.current || !navigator.onLine) return;
    busyRef.current = true;
    setSyncing(true);
    try {
      // 1. Kirim perubahan lokal.
      const outbox = outboxRef.current;
      const keys = Object.keys(outbox);
      if (keys.length) {
        const rows = keys.map((key) => {
          const record = outbox[key]!;
          return {
            store_id: storeId,
            kind: record.kind,
            entity_id: record.entity_id,
            payload: record.payload,
            deleted: record.deleted,
            updated_at: new Date().toISOString(),
          };
        });
        const { error: pushError } = await supabase
          .from("store_data")
          .upsert(rows as never, { onConflict: "store_id,kind,entity_id" });
        if (pushError) throw new Error(pushError.message);
        const sent = keys.map((key) => outbox[key]!);
        for (const key of keys) delete outbox[key];
        writeJson(OUTBOX_KEY, outbox);
        setPending(Object.keys(outbox).length);
        noteShadow(sent);
      }

      // 2. Ambil perubahan dari pusat.
      const since = localStorage.getItem(SINCE_KEY) ?? EPOCH;
      const { data, error: pullError } = await supabase
        .from("store_data")
        .select("kind, entity_id, payload, deleted, updated_at")
        .gt("updated_at", since)
        .order("updated_at", { ascending: true });
      if (pullError) throw new Error(pullError.message);
      const remote = (data ?? []) as {
        kind: string;
        entity_id: string;
        payload: Record<string, unknown>;
        deleted: boolean;
        updated_at: string;
      }[];
      if (remote.length) {
        const records: SyncRecord[] = remote.map((row) => ({
          kind: row.kind,
          entity_id: row.entity_id,
          payload: row.payload ?? {},
          deleted: row.deleted,
        }));
        const fresh = records.filter(
          (record) => !(recordKey(record.kind, record.entity_id) in outboxRef.current),
        );
        if (fresh.length) {
          applyRemote((prev) => applyRecords(prev, fresh));
          noteShadow(fresh);
        }
        const newest = remote[remote.length - 1]!.updated_at;
        localStorage.setItem(SINCE_KEY, newest);
      }
      setError(null);
      setLastSyncedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sinkronisasi gagal");
    } finally {
      busyRef.current = false;
      setSyncing(false);
    }
  }, [storeId, applyRemote, noteShadow]);

  // Segera kirim begitu ada perubahan yang menunggu.
  useEffect(() => {
    if (!storeId || !enabled || pending === 0) return;
    const timer = setTimeout(() => void sync(), 1200);
    return () => clearTimeout(timer);
  }, [pending, storeId, enabled, sync]);

  // Jalankan sinkronisasi saat daring, saat layar aktif, dan berkala.
  useEffect(() => {
    if (!storeId || !enabled) return;
    void sync();
    const id = setInterval(() => void sync(), 20000);
    const wake = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", () => void sync());
    window.addEventListener("focus", wake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [storeId, enabled, sync]);

  return {
    online,
    syncing,
    pending,
    storeId,
    lastSyncedAt,
    error,
    flushNow: () => void sync(),
  };
}
