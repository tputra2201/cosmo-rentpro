import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah, useBilling } from "@/lib/billing-store";
import { tableTotal } from "@/components/CafeTables";
import { SortableArea, SortableItem } from "@/components/Sortable";

export const Route = createFileRoute("/_authenticated/kafe")({
  head: () => ({
    meta: [
      { title: "Pengaturan Meja Kafe — RentalPro" },
      {
        name: "description",
        content:
          "Atur nomor meja, area, dan jumlah kursi untuk layanan kafe tanpa rental PlayStation.",
      },
      { property: "og:title", content: "Pengaturan Meja Kafe" },
      {
        property: "og:description",
        content: "Tambah, ubah, atau hapus nomor meja kafe beserta area dan jumlah kursi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KafePage,
});

function KafePage() {
  const {
    cafeTables,
    addCafeTable,
    updateCafeTable,
    removeCafeTable,
    menu,
    menuCategories,
    addMenuItem,
    updateMenuItem,
    removeMenuItem,
    addMenuCategory,
    renameMenuCategory,
    removeMenuCategory,
    reorderList,
    reorderMenuCategories,
  } = useBilling();

  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newSeats, setNewSeats] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const openTables = cafeTables.filter((t) => t.orders.length > 0 || t.openedAt);
  const grandTotal = openTables.reduce((sum, t) => sum + tableTotal(t), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Pengaturan Meja Kafe</h1>
          <p className="mt-1 text-muted-foreground">
            Kartu meja dan pesanan kini ada di Dashboard. Di sini Anda mengatur daftar
            mejanya. Geser ikon pegangan untuk mengatur urutan meja, kategori, dan menu.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{openTables.length} meja terisi</p>
          <p className="text-xl font-bold text-neon">{formatRupiah(grandTotal)}</p>
        </div>
      </header>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Tambah Meja</h2>
        <p className="text-sm text-muted-foreground">
          Nomor meja, area, dan jumlah kursi bisa diubah kapan saja.
        </p>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            addCafeTable({
              name: newName,
              area: newArea,
              seats: Number(newSeats) || 2,
            });
            setNewName("");
            setNewArea("");
            setNewSeats("");
            toast.success("Meja ditambahkan");
          }}
        >
          <Input
            placeholder="Nomor meja (mis. Meja 05)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Area (Indoor / Outdoor)"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
          />
          <Input
            type="number"
            min={1}
            placeholder="Kursi"
            value={newSeats}
            onChange={(e) => setNewSeats(e.target.value)}
          />
          <Button type="submit">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>

        <SortableArea
          ids={cafeTables.map((t) => t.id)}
          onReorder={(activeId, overId) => reorderList("cafeTables", activeId, overId)}
          className="mt-4 space-y-2"
        >
          {cafeTables.map((t) => (
            <SortableItem
              key={t.id}
              id={t.id}
              label={t.name}
              className="rounded-lg bg-secondary/60 p-3"
              contentClassName="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]"
            >
              <Input
                value={t.name}
                aria-label={`Nomor ${t.name}`}
                onChange={(e) => updateCafeTable(t.id, { name: e.target.value })}
              />
              <Input
                value={t.area}
                aria-label={`Area ${t.name}`}
                onChange={(e) => updateCafeTable(t.id, { area: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                value={t.seats}
                aria-label={`Kursi ${t.name}`}
                onChange={(e) =>
                  updateCafeTable(t.id, { seats: Number(e.target.value) || 1 })
                }
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!removeCafeTable(t.id)) {
                    toast.error(`${t.name} masih terisi`);
                    return;
                  }
                  toast.success(`${t.name} dihapus`);
                }}
              >
                Hapus
              </Button>
            </SortableItem>
          ))}
        </SortableArea>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Kategori Menu</h2>
        <p className="text-sm text-muted-foreground">
          Kategori bebas ditambah, diganti nama, atau dihapus (jika tidak ada menu di
          dalamnya).
        </p>
        <SortableArea
          ids={menuCategories}
          onReorder={reorderMenuCategories}
          className="mt-4 space-y-2"
        >
          {menuCategories.map((c) => (
            <SortableItem
              key={c}
              id={c}
              label={`kategori ${c}`}
              className="rounded-lg bg-secondary/60 p-3"
              contentClassName="grid items-center gap-2 sm:grid-cols-[1fr_auto_auto]"
            >
              <Input
                defaultValue={c}
                aria-label={`Nama kategori ${c}`}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (!next || next === c) {
                    e.target.value = c;
                    return;
                  }
                  if (!renameMenuCategory(c, next)) {
                    e.target.value = c;
                    toast.error("Nama kategori sudah dipakai");
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">
                {menu.filter((m) => m.category === c).length} menu
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Hapus kategori ${c}`}
                onClick={() => {
                  if (!removeMenuCategory(c)) {
                    toast.error(
                      "Kategori masih dipakai menu atau minimal satu kategori harus ada",
                    );
                    return;
                  }
                  toast.success(`Kategori ${c} dihapus`);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </SortableItem>
          ))}
        </SortableArea>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addMenuCategory(newCategory)) {
              toast.error("Nama kategori kosong atau sudah ada");
              return;
            }
            toast.success(`Kategori ${newCategory.trim()} ditambahkan`);
            setNewCategory("");
          }}
        >
          <Input
            placeholder="Kategori baru (mis. Coffee, Juice, Snack)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-56 flex-1"
          />
          <Button type="submit">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-xl font-semibold">Menu Makanan &amp; Minuman</h2>
        <SortableArea
          ids={menu.map((m) => m.id)}
          onReorder={(activeId, overId) => reorderList("menu", activeId, overId)}
          className="mt-4 space-y-2"
        >
          {menu.map((m) => (
            <SortableItem
              key={m.id}
              id={m.id}
              label={`menu ${m.name}`}
              className="rounded-lg bg-secondary/60 p-3"
              contentClassName="grid items-center gap-2 sm:grid-cols-[1fr_180px_140px_auto]"
            >
              <Input
                value={m.name}
                aria-label={`Nama ${m.name}`}
                onChange={(e) => updateMenuItem(m.id, { name: e.target.value })}
              />
              <Select
                value={menuCategories.includes(m.category) ? m.category : ""}
                onValueChange={(value) => updateMenuItem(m.id, { category: value })}
              >
                <SelectTrigger aria-label={`Kategori ${m.name}`}>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {menuCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={m.price}
                aria-label={`Harga ${m.name}`}
                onChange={(e) =>
                  updateMenuItem(m.id, { price: Number(e.target.value) || 0 })
                }
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Hapus ${m.name}`}
                onClick={() => removeMenuItem(m.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </SortableItem>
          ))}
        </SortableArea>

        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_140px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const p = Number(itemPrice);
            if (!itemName.trim() || !(p > 0)) {
              toast.error("Isi nama menu dan harga yang valid");
              return;
            }
            addMenuItem(itemName.trim(), p, itemCategory || menuCategories[0]);
            setItemName("");
            setItemPrice("");
            toast.success("Menu ditambahkan");
          }}
        >
          <Input
            placeholder="Nama menu"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Select
            value={itemCategory || menuCategories[0] || ""}
            onValueChange={setItemCategory}
          >
            <SelectTrigger aria-label="Kategori menu baru">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {menuCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            placeholder="Harga"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
          />
          <Button type="submit">
            <Plus className="size-4" /> Tambah
          </Button>
        </form>
      </section>
    </div>
  );
}
