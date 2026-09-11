import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "kasir";

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
    (async () => {
      const [{ data: roles }, { data: profileRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase
          .from("profiles")
          .select("full_name, must_change_password")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const profile = profileRow as
        | { full_name: string | null; must_change_password: boolean | null }
        | null;
      const list = (roles ?? []).map((r) => r.role as AppRole);
      setRole(list.includes("admin") ? "admin" : (list[0] ?? "kasir"));
      setFullName(profile?.full_name ?? "");
      setMustChangePassword(profile?.must_change_password === true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = async () => {
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
