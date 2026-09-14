import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

import { ALL_ROLES, roleLabel as roleLabelMap, type AppRole } from "./permissions";

export type { AppRole };
export const roleLabel = roleLabelMap;

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  fullName: string;
  mustChangePassword: boolean;
  markPasswordChanged: () => void;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const CACHE_KEY = "billing.auth-profile";

type CachedProfile = { userId: string; role: AppRole; fullName: string; mustChangePassword: boolean };

function readCache(userId: string): CachedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfile;
    return parsed && parsed.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(value: CachedProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setRole(null);
        setFullName("");
        setMustChangePassword(false);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // Pakai data tersimpan lebih dulu supaya saat internet mati level dan hak
    // akses kasir tetap terbaca dan semua menu bisa dipakai.
    const cached = readCache(userId);
    if (cached) {
      setRole(cached.role);
      setFullName(cached.fullName);
      setMustChangePassword(cached.mustChangePassword);
    }
    (async () => {
      const [{ data: roles, error: roleError }, { data: profileRow, error: profileError }] =
        await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase
            .from("profiles")
            .select("full_name, must_change_password")
            .eq("id", userId)
            .maybeSingle(),
        ]);
      if (cancelled) return;
      if (roleError || profileError) {
        // Tanpa koneksi: biarkan data tersimpan yang dipakai.
        if (!cached) setRole("kasir");
        return;
      }
      const profile = profileRow as
        | { full_name: string | null; must_change_password: boolean | null }
        | null;
      const list = (roles ?? []).map((r) => r.role as AppRole);
      const priority: AppRole[] = [
        "installer",
        "manager",
        "admin",
        "finance",
        ...ALL_ROLES.filter((r) => r !== "installer" && r !== "manager" && r !== "finance"),
      ];
      const nextRole = priority.find((r) => list.includes(r)) ?? "kasir";
      const nextName = profile?.full_name ?? "";
      const nextMust = profile?.must_change_password === true;
      setRole(nextRole);
      setFullName(nextName);
      setMustChangePassword(nextMust);
      writeCache({ userId, role: nextRole, fullName: nextName, mustChangePassword: nextMust });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);


  const signOut = async () => {
    if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setMustChangePassword(false);
  };


  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        fullName,
        mustChangePassword,
        markPasswordChanged: () => setMustChangePassword(false),
        loading,
        signOut,
      }}
    >

      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}

/** Menu yang hanya boleh diakses Installer */
export const installerOnlyPaths = ["/store"];

/** Level setara Admin: Installer dan Manager (termasuk akun Admin lama) */
export const isAdminLevel = (role: AppRole | null) =>
  role === "admin" || role === "manager" || role === "installer";
