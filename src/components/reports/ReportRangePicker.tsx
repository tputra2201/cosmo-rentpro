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
  defaultRange,
  rangeLabel,
  type RangeMode,
  type ReportRange,
} from "@/lib/report-range";

const modeLabels: Record<RangeMode, string> = {
  day: "Hari usaha (tanggal)",
  month: "Rentang bulan",
  year: "Rentang tahun",
};

export function ReportRangePicker({
  range,
  onChange,
}: {
  range: ReportRange;
  onChange: (next: ReportRange) => void;
}) {
  const inputType = range.mode === "day" ? "date" : range.mode === "month" ? "month" : "number";

  return (
    <div className="surface-panel flex flex-wrap items-end gap-3 p-4">
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Jenis rentang</Label>
        <Select
          value={range.mode}
          onValueChange={(value) => onChange(defaultRange(value as RangeMode))}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(modeLabels) as RangeMode[]).map((mode) => (
              <SelectItem key={mode} value={mode}>
                {modeLabels[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dari</Label>
        <Input
          type={inputType}
          className="w-40"
          value={range.from}
          onChange={(e) => onChange({ ...range, from: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sampai</Label>
        <Input
          type={inputType}
          className="w-40"
          value={range.to}
          onChange={(e) => onChange({ ...range, to: e.target.value })}
        />
      </div>

      <p className="pb-2 text-sm text-muted-foreground">Periode: {rangeLabel(range)}</p>
    </div>
  );
}
