import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface DragReorderOptions<T extends { id: string; sort_order: number }> {
  items: T[];
  onReorder: (reorderedItems: T[]) => void;
  queryKey: unknown[];
}

export function useDragReorder<T extends { id: string; sort_order: number }>({
  items,
  onReorder,
  queryKey,
}: DragReorderOptions<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLElement | null>(null);
  const queryClient = useQueryClient();

  const handleDragStart = useCallback(
    (index: number, e: React.DragEvent) => {
      setDragIndex(index);
      dragNodeRef.current = e.currentTarget as HTMLElement;
      e.dataTransfer.effectAllowed = "move";
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

      // Optimistically update the cache immediately
      queryClient.setQueryData(queryKey, (old: T[] | undefined) => {
        if (!old) return updated;
        // Merge updated sort_orders into the existing cache
        const idToOrder = new Map(updated.map((u) => [u.id, u.sort_order]));
        const merged = old.map((item) => {
          const newOrder = idToOrder.get(item.id);
          return newOrder !== undefined ? { ...item, sort_order: newOrder } : item;
        });
        return merged.sort((a, b) => a.sort_order - b.sort_order);
      });

      // Persist to DB in background
      onReorder(updated);
    }
    setDragIndex(null);
    setOverIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, overIndex, items, onReorder, queryClient, queryKey]);

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
