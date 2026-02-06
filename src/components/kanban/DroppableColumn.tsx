import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import type { KanbanColumn } from "@/components/kanban/KanbanColumnSettings";

interface DroppableColumnProps {
  column: KanbanColumn;
  leadIds: string[];
  children: React.ReactNode;
  isOver?: boolean;
}

export function DroppableColumn({ column, leadIds, children, isOver }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  return (
    <div className="min-w-[280px] flex-1">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 className="font-display text-sm font-semibold text-foreground">{column.name}</h3>
        {column.is_won && <Badge variant="outline" className="text-[10px] border-success/30 text-success">Venda</Badge>}
        {column.is_lost && <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Perda</Badge>}
        <Badge variant="secondary" className="ml-auto text-xs">{leadIds.length}</Badge>
      </div>

      <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`min-h-[100px] space-y-2 rounded-lg p-1 transition-colors ${
            isOver ? "bg-primary/10 ring-2 ring-primary/30 ring-inset" : ""
          }`}
        >
          {children}
          {leadIds.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              Arraste leads aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
