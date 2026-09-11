import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Tv } from "lucide-react";
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
import {
  useBilling,
  type ConsoleType,
  type StationAvailability,
} from "@/lib/billing-store";

export const Route = createFileRoute("/_authenticated/unit")({
  head: () => ({
    meta: [
      { title: "Pengaturan Unit TV — Billing Rental PS" },
      {
        name: "description",
        content:
          "Tambah, ubah, dan hapus nomor TV, jenis konsol, serta room atau booth rental PlayStation.",
      },
      { property: "og:title", content: "Pengaturan Unit TV — Billing Rental PS" },
      {
        property: "og:description",
        content: "Kelola daftar unit TV, konsol, dan room rental PlayStation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnitPage,
});

const consoles: ConsoleType[] = ["PS3", "PS4", "PS5"];

function UnitPage() {
  const { stations, addStation, updateStation, removeStation } = useBilling();
  const [name, setName] = useState("");
  const [booth, setBooth] = useState("");
  const [consoleType, setConsoleType] = useState<ConsoleType>("PS4");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Pengaturan Unit TV</h1>
        <p className="mt-1 text-muted-foreground">
          Atur nomor TV, jenis konsol, dan room. Perubahan tersimpan otomatis.
        </p>
      </header>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Tambah Unit</h2>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            addStation({ name, booth, console: consoleType });
            setName("");
            setBooth("");
            toast.success("Unit ditambahkan");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="unit-name">Nomor / Nama TV</Label>
            <Input
              id="unit-name"
              placeholder="TV 07"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-booth">Room / Booth</Label>
            <Input
              id="unit-booth"
              placeholder="VIP 3"
              value={booth}
              onChange={(e) => setBooth(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-console">Konsol</Label>
            <Select
              value={consoleType}
              onValueChange={(v) => setConsoleType(v as ConsoleType)}
            >
              <SelectTrigger id="unit-console">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {consoles.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="self-end">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>
      </section>

      <section className="surface-panel p-6">
        <div className="flex items-center gap-2">
          <Tv className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Daftar Unit ({stations.length})</h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {stations.map((s) => (
            <div
              key={s.id}
              className="grid items-end gap-2 rounded-lg bg-secondary/60 p-3 sm:grid-cols-[1fr_1fr_110px_130px_auto]"
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nomor TV</Label>
                <Input
                  value={s.name}
                  onChange={(e) => updateStation(s.id, { name: e.target.value })}
                  aria-label={`Nama ${s.name}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Room</Label>
                <Input
                  value={s.booth}
                  onChange={(e) => updateStation(s.id, { booth: e.target.value })}
                  aria-label={`Room ${s.name}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Konsol</Label>
                <Select
                  value={s.console}
                  onValueChange={(v) =>
                    updateStation(s.id, { console: v as ConsoleType })
                  }
                >
                  <SelectTrigger aria-label={`Konsol ${s.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {consoles.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={s.availability}
                  disabled={Boolean(s.session)}
                  onValueChange={(v) =>
                    updateStation(s.id, {
                      availability: v as StationAvailability,
                    })
                  }
                >
                  <SelectTrigger aria-label={`Status ${s.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Tersedia</SelectItem>
                    <SelectItem value="booked">Booking</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Hapus ${s.name}`}
                onClick={() => {
                  if (s.session) {
                    toast.error(`${s.name} sedang dipakai`);
                    return;
                  }
                  removeStation(s.id);
                  toast.success(`${s.name} dihapus`);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
