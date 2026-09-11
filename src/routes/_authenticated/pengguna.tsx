import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MailCheck, Send, Trash2, UserPlus } from "lucide-react";
import {
  listUsers,
  inviteUser,
  resendInvite,
  sendPasswordReset,
  updateUser,
  deleteUser,
  type ManagedUser,
} from "@/lib/users.functions";
import { useAuth, roleLabel } from "@/lib/auth";
import { passwordSetupUrl } from "@/lib/app-url";
import type { AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/_authenticated/pengguna")({
  head: () => ({
    meta: [
      { title: "Pengaturan Pengguna — Billing Rental PS" },
      {
        name: "description",
        content:
          "Admin mendaftarkan staf, mengatur level Admin atau Kasir, dan mengganti kata sandi pengguna.",
      },
      { property: "og:title", content: "Pengaturan Pengguna — Billing Rental PS" },
      {
        property: "og:description",
        content: "Kelola akun staf rental PlayStation: tambah, atur level, dan reset sandi.",
      },
    ],
  }),
  component: PenggunaPage,
});

function PenggunaPage() {
  const { user, role: myRole } = useAuth();
  const canInstaller = myRole === "installer";
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const addFn = useServerFn(inviteUser);
  const resendFn = useServerFn(resendInvite);
  const resetFn = useServerFn(sendPasswordReset);
  const editFn = useServerFn(updateUser);
  const delFn = useServerFn(deleteUser);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => fetchUsers(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["managed-users"] });
  const onError = (err: unknown) =>
    toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");

  const redirectTo = passwordSetupUrl;


  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("kasir");

  const add = useMutation({
    mutationFn: (data: {
      email: string;
      fullName: string;
      role: AppRole;
    }) => addFn({ data: { ...data, redirectTo: redirectTo() } }),
    onSuccess: () => {
      toast.success("Undangan terkirim ke email staf");
      setEmail("");
      setFullName("");
      setRole("kasir");
      invalidate();
    },
    onError,
  });

  const resend = useMutation({
    mutationFn: (mail: string) =>
      resendFn({ data: { email: mail, redirectTo: redirectTo() } }),
    onSuccess: () => toast.success("Undangan dikirim ulang"),
    onError,
  });

  const reset = useMutation({
    mutationFn: (mail: string) =>
      resetFn({ data: { email: mail, redirectTo: redirectTo() } }),
    onSuccess: () => toast.success("Tautan atur ulang sandi dikirim"),
    onError,
  });


  const edit = useMutation({
    mutationFn: (data: {
      id: string;
      fullName?: string;
      role?: AppRole;
      password?: string;
    }) => editFn({ data }),
    onSuccess: () => {
      toast.success("Perubahan disimpan");
      invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      invalidate();
    },
    onError,
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neon">
          Pengaturan Pengguna
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin mengundang staf lewat email. Staf membuat kata sandinya sendiri
          dari tautan undangan — tidak ada sandi awal yang dikirim.
        </p>
      </div>

      <form
        className="surface-panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate({ email, fullName, role });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="nama">Nama lengkap</Label>
          <Input
            id="nama"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama staf"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staf@email.com"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label>Level</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kasir">Kasir</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              {canInstaller && <SelectItem value="installer">Installer</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={add.isPending}>
            <UserPlus className="size-4" /> Kirim undangan
          </Button>
        </div>
      </form>

      <div className="surface-panel p-5">
        {isLoading && <p className="text-sm text-muted-foreground">Memuat pengguna…</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Gagal memuat pengguna"}
          </p>
        )}
        <div className="grid gap-3">
          {users.map((u: ManagedUser) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === user?.id}
              canInstaller={canInstaller}
              busy={resend.isPending || reset.isPending}
              onSave={(payload) => edit.mutate({ id: u.id, ...payload })}
              onResend={() => resend.mutate(u.email)}
              onReset={() => reset.mutate(u.email)}
              onDelete={() => remove.mutate(u.id)}
            />
          ))}

          {!isLoading && users.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada pengguna.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  canInstaller,
  busy,
  onSave,
  onResend,
  onReset,
  onDelete,
}: {
  user: ManagedUser;
  isSelf: boolean;
  canInstaller: boolean;
  busy: boolean;
  onSave: (p: { fullName?: string; role?: AppRole }) => void;
  onResend: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(user.fullName);
  const [role, setRole] = useState<AppRole>(user.role);

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-4 lg:grid-cols-[1.2fr_1fr_auto_auto_auto] lg:items-end">
      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">
          {user.email} {isSelf && "· akun kamu"}{" "}
          {user.pending && (
            <span className="text-primary">· menunggu buat sandi</span>
          )}
        </Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Level saat ini: {roleLabel[user.role]}</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as AppRole)}
          disabled={isSelf || (user.role === "installer" && !canInstaller)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kasir">Kasir</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            {canInstaller && <SelectItem value="installer">Installer</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          const payload: { fullName?: string; role?: AppRole } = {};
          if (name && name !== user.fullName) payload.fullName = name;
          if (role !== user.role) payload.role = role;
          if (Object.keys(payload).length === 0) return;
          onSave(payload);
        }}
      >
        Simpan
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={user.pending ? onResend : onReset}
      >
        {user.pending ? (
          <>
            <Send className="size-4" /> Kirim ulang undangan
          </>
        ) : (
          <>
            <MailCheck className="size-4" /> Tautan atur sandi
          </>
        )}
      </Button>
      <Button
        variant="destructive"
        size="icon"
        aria-label="Hapus pengguna"
        disabled={isSelf}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>

    </div>
  );
}
