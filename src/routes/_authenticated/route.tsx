import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession() membaca sesi dari perangkat, jadi kasir tetap bisa masuk
    // aplikasi walau internet mati. Hanya sesi yang benar-benar tidak ada yang
    // dialihkan ke halaman masuk.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
