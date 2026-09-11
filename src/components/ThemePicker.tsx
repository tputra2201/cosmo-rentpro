import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeOptions, useTheme } from "@/lib/theme";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="surface-panel p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Palette className="size-5 text-primary" /> Tema Tampilan
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pilih latar aplikasi. Warna tulisan otomatis menyesuaikan agar tetap
        mudah dibaca.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              theme === opt.value
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary/30 hover:bg-secondary/60",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold">{opt.label}</span>
              {theme === opt.value && <Check className="size-4 text-primary" />}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {opt.hint}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
