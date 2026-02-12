import { useState, useCallback, useRef } from "react";

interface DragReorderOptions<T extends { id: string; sort_order: number }> {
  items: T[];
  onReorder: (reorderedItems: T[]) => void;
}

export function useDragReorder<T extends { id: string; sort_order: number }>({
  items,
  onReorder,
}: DragReorderOptions<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback(
    (index: number, e: React.DragEvent) => {
      setDragIndex(index);
      dragNodeRef.current = e.currentTarget as HTMLElement;
      e.dataTransfer.effectAllowed = "move";
      // Make drag image semi-transparent
      if (e.currentTarget instanceof HTMLElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (index: number, e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragIndex !== null && index !== dragIndex) {
        setOverIndex(index);
      }
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const reordered = [...items];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      const updated = reordered.map((item, i) => ({ ...item, sort_order: i }));
      onReorder(updated);
    }
    setDragIndex(null);
    setOverIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, overIndex, items, onReorder]);

  const handleDragLeave = useCallback(() => {
    setOverIndex(null);
  }, []);

  return {
    dragIndex,
    overIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragLeave,
  };
}
