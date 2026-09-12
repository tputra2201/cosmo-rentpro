import type { ReactNode } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/** Pembungkus area yang isinya bisa digeser untuk mengatur urutan. */
export function SortableArea({
  ids,
  onReorder,
  className,
  children,
}: {
  ids: string[];
  onReorder: (activeId: string, overId: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className={className}>{children}</div>
      </SortableContext>
    </DndContext>
  );
}

/** Satu item yang bisa digeser. `handle` = geser hanya lewat ikon pegangan. */
export function SortableItem({
  id,
  className,
  contentClassName,
  handle = true,
  label,
  children,
}: {
  id: string;
  className?: string;
  contentClassName?: string;
  handle?: boolean;
  label?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortableSafe(id);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  } as React.CSSProperties;

  if (!handle) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        aria-label={label ? `Geser ${label}` : undefined}
        className={`touch-none cursor-grab active:cursor-grabbing ${
          isDragging ? "opacity-80 shadow-lg" : ""
        } ${className ?? ""}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "opacity-80 shadow-lg" : ""} ${className ?? ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={label ? `Geser ${label}` : "Geser untuk mengurutkan"}
          className="mt-2 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-secondary active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <div className={`min-w-0 flex-1 ${contentClassName ?? ""}`}>{children}</div>
      </div>
    </div>
  );
}

function useSortableSafe(id: string) {
  const sortable = useSortable({ id });
  return {
    attributes: sortable.attributes,
    listeners: sortable.listeners,
    setNodeRef: sortable.setNodeRef,
    transform: sortable.transform,
    transition: sortable.transition,
    isDragging: sortable.isDragging,
  };
}
