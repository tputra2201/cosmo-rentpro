import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "kasir";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  fullName: string;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setRole(null);
        setFullName("");
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
    (async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const list = (roles ?? []).map((r) => r.role as AppRole);
      setRole(list.includes("admin") ? "admin" : (list[0] ?? "kasir"));
      setFullName(profile?.full_name ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        fullName,
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

export const roleLabel: Record<AppRole, string> = {
  admin: "Admin",
  kasir: "Kasir",
};

/** Menu yang hanya boleh diakses Admin */
export const adminOnlyPaths = [
  "/tarif",
  "/unit",
  "/pembayaran",
  "/laporan",
  "/promo",
  "/backup",
  "/pengguna",
];
