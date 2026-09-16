import { useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Judul utama tiap bagian Setup / Report. */
export function SetupHeading({
  title,
  description,
  right,
  as: As = "h2",
  className,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <As className="text-neon text-xl font-extrabold tracking-tight sm:text-2xl">
          {title}
        </As>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {right}
    </div>
  );
}

export type SetupColumn<T> = {
  key: string;
  header: string;
  className?: string;
  /** Sembunyikan kolom di layar kecil. */
  hideOnMobile?: boolean;
  /** Kalau ada, judul kolom bisa diklik untuk mengurutkan. */
  sortValue?: (item: T) => string | number;
  render: (item: T) => ReactNode;
};


export function SetupTable<T>({
  items,
  columns,
  getId,
  getLabel,
  onReorder,
  onRemove,
  removeDisabled,
  detailTitle,
  detailDescription,
  renderDetail,
  detailWide,
  emptyText = "Belum ada data.",
  footer,
}: {
  items: T[];
  columns: SetupColumn<T>[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder?: ((activeId: string, overId: string) => void) | undefined;
  onRemove?: ((item: T) => void) | undefined;
  removeDisabled?: ((item: T) => boolean) | undefined;
  detailTitle?: ((item: T) => string) | undefined;
  detailDescription?: ((item: T) => string | undefined) | undefined;
  renderDetail?: ((item: T) => ReactNode) | undefined;
  detailWide?: boolean | undefined;
  emptyText?: string | undefined;
  footer?: ReactNode | undefined;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailItem = items.find((i) => getId(i) === detailId) ?? null;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    onReorder(String(active.id), String(over.id));
  };

  const hasActions = Boolean(renderDetail || onRemove);

  const body = (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full caption-bottom text-sm">
        <thead className="bg-secondary/70">
          <tr className="border-b border-border">
            {onReorder && <th className="w-8" />}
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-primary",
                  c.hideOnMobile && "hidden sm:table-cell",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
            {hasActions && <th className="w-24 px-3 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (onReorder ? 1 : 0) + (hasActions ? 1 : 0)}
                className="px-3 py-8 text-center text-sm text-muted-foreground"
              >
                {emptyText}
              </td>
            </tr>
          )}
          {items.map((item) => {
            const id = getId(item);
            const label = getLabel(item);
            return (
              <SetupRow key={id} id={id} label={label} draggable={Boolean(onReorder)}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-2 align-middle",
                      c.hideOnMobile && "hidden sm:table-cell",
                      c.className,
                    )}
                  >
                    {c.render(item)}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {renderDetail && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Detail ${label}`}
                          onClick={() => setDetailId(id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {onRemove && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Hapus ${label}`}
                          disabled={removeDisabled?.(item)}
                          onClick={() => onRemove(item)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </SetupRow>
            );
          })}
        </tbody>
        {footer}
      </table>
    </div>
  );

  return (
    <>
      {onReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleEnd}
        >
          <SortableContext
            items={items.map(getId)}
            strategy={verticalListSortingStrategy}
          >
            {body}
          </SortableContext>
        </DndContext>
      ) : (
        body
      )}

      <Sheet
        open={Boolean(detailItem)}
        onOpenChange={(open) => !open && setDetailId(null)}
      >
        <SheetContent
          className={cn(
            "w-full overflow-y-auto sm:max-w-lg",
            detailWide && "sm:max-w-2xl",
          )}
        >
          {detailItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-neon text-lg font-extrabold">
                  {detailTitle ? detailTitle(detailItem) : getLabel(detailItem)}
                </SheetTitle>
                {detailDescription?.(detailItem) && (
                  <SheetDescription>{detailDescription(detailItem)}</SheetDescription>
                )}
              </SheetHeader>
              <div className="mt-4 space-y-4 pb-8">{renderDetail?.(detailItem)}</div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

const rowClass = "border-b border-border/60 last:border-0 hover:bg-secondary/40";

function SetupRow({
  id,
  label,
  draggable,
  children,
}: {
  id: string;
  label: string;
  draggable: boolean;
  children: ReactNode;
}) {
  if (!draggable) return <tr className={rowClass}>{children}</tr>;
  return (
    <DraggableRow id={id} label={label}>
      {children}
    </DraggableRow>
  );
}

function DraggableRow({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 30 : undefined,
      }}
      className={cn(rowClass, isDragging && "bg-secondary opacity-90")}
    >
      <td className="pl-2 align-middle">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Geser ${label}`}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-secondary active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      {children}
    </tr>
  );
}


/** Baris label + kontrol di dalam panel detail. */
export function DetailField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-primary">{label}</p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
