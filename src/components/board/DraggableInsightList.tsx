import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Insight } from "../../types";
import InsightCard from "./InsightCard";
import { Colors } from "../../constants/colors";

// ─── Drag handle ────────────────────────────────────────────────────────────

interface DragHandlers {
  onStart: (id: string, pageY: number) => void;
  onMove: (dy: number) => void;
  onEnd: () => void;
}

interface DragHandleProps {
  insightId: string;
  handlersRef: React.MutableRefObject<DragHandlers>;
}

// Separate component so each handle gets its own PanResponder created once.
// All mutable state is read via handlersRef.current, which is always up-to-date.
function DragHandle({ insightId, handlersRef }: DragHandleProps) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        handlersRef.current.onStart(insightId, e.nativeEvent.pageY);
      },
      onPanResponderMove: (_, g) => {
        handlersRef.current.onMove(g.dy);
      },
      onPanResponderRelease: () => {
        handlersRef.current.onEnd();
      },
      onPanResponderTerminate: () => {
        handlersRef.current.onEnd();
      },
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={styles.handle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.handleIcon}>≡</Text>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface DraggableInsightListProps {
  insights: Insight[];
  onPressCard: (insight: Insight) => void;
  onExitReorder: () => void;
  onReorderDone: (moved: Insight, newOrder: Insight[]) => void;
}

const NOOP_LONG_PRESS = (_: Insight) => {};

export default function DraggableInsightList({
  insights,
  onPressCard,
  onExitReorder,
  onReorderDone,
}: DraggableInsightListProps) {
  // Local ordering mirrors insights; only overridden on drop.
  const [localOrder, setLocalOrder] = useState<Insight[]>(insights);
  const localOrderRef = useRef<Insight[]>(insights);

  // Sync from parent when not dragging (e.g. after a refetch).
  useEffect(() => {
    if (!draggedIdRef.current) {
      localOrderRef.current = insights;
      setLocalOrder(insights);
    }
  }, [insights]);

  // ── Drag state ──────────────────────────────────────────────────────────
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  // pendingInsertIndex: slot in the non-dragged sub-array where the card will land.
  const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(null);
  const pendingInsertIndexRef = useRef<number | null>(null);

  const ghostY = useRef(new Animated.Value(0)).current;
  const ghostHeightRef = useRef(0);
  const dragStartGhostYRef = useRef(0); // ghost top in container coords at drag start
  const scrollYRef = useRef(0);
  const containerTopRef = useRef(0); // pageY of container on screen

  // Measured layout of each card in scroll-content coordinates.
  const layoutsRef = useRef<Map<string, { y: number; height: number }>>(
    new Map(),
  );

  const containerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── Slot calculation ────────────────────────────────────────────────────
  // Returns the insertion index in the non-dragged sub-array.
  // Uses `dy` (screen pixels dragged) + original layout.y (scroll-content pixels)
  // which agree because scroll is locked during drag.
  const calcSlot = useCallback((dy: number): number => {
    const id = draggedIdRef.current;
    if (!id) return 0;
    const draggedLayout = layoutsRef.current.get(id);
    if (!draggedLayout) return 0;

    // Center of ghost in scroll-content coordinates.
    const ghostCenter =
      draggedLayout.y + dy + draggedLayout.height / 2;

    let slot = 0;
    for (const item of localOrderRef.current) {
      if (item.id === id) continue;
      const layout = layoutsRef.current.get(item.id);
      if (!layout) { slot++; continue; }
      if (ghostCenter < layout.y + layout.height / 2) return slot;
      slot++;
    }
    return slot; // end of list
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onDragStart = useCallback(
    (id: string, pageY: number) => {
      containerRef.current?.measure(
        (_x, _y, _w, _h, _pageX, containerPageY) => {
          containerTopRef.current = containerPageY;
          const ghostTop = pageY - containerPageY;
          const layout = layoutsRef.current.get(id);
          ghostHeightRef.current = layout?.height ?? 100;
          dragStartGhostYRef.current = ghostTop;
          ghostY.setValue(ghostTop);
          draggedIdRef.current = id;
          setDraggedId(id);
          const slot = calcSlot(0);
          pendingInsertIndexRef.current = slot;
          setPendingInsertIndex(slot);
        },
      );
    },
    [ghostY, calcSlot],
  );

  const onDragMove = useCallback(
    (dy: number) => {
      if (!draggedIdRef.current) return;
      ghostY.setValue(dragStartGhostYRef.current + dy);
      const slot = calcSlot(dy);
      if (slot !== pendingInsertIndexRef.current) {
        pendingInsertIndexRef.current = slot;
        setPendingInsertIndex(slot);
      }
    },
    [ghostY, calcSlot],
  );

  const onDragEnd = useCallback(() => {
    const id = draggedIdRef.current;
    const slot = pendingInsertIndexRef.current;
    draggedIdRef.current = null;
    pendingInsertIndexRef.current = null;
    setDraggedId(null);
    setPendingInsertIndex(null);
    if (id === null || slot === null) return;

    const moved = localOrderRef.current.find((i) => i.id === id);
    if (!moved) return;

    const withoutMoved = localOrderRef.current.filter((i) => i.id !== id);
    const insertIdx = Math.max(0, Math.min(slot, withoutMoved.length));
    const newOrder = [...withoutMoved];
    newOrder.splice(insertIdx, 0, moved);

    localOrderRef.current = newOrder;
    setLocalOrder(newOrder);
    onReorderDone(moved, newOrder);
  }, [onReorderDone]);

  // Keep handlers ref always current so PanResponder closures see fresh fns.
  const handlersRef = useRef<DragHandlers>({
    onStart: onDragStart,
    onMove: onDragMove,
    onEnd: onDragEnd,
  });
  handlersRef.current = {
    onStart: onDragStart,
    onMove: onDragMove,
    onEnd: onDragEnd,
  };

  // ── Render list ─────────────────────────────────────────────────────────
  // Build a flat render array with an insert-indicator entry injected at
  // `pendingInsertIndex` in the non-dragged sub-array position.
  const renderItems = useMemo(() => {
    type Entry =
      | { type: "card"; insight: Insight; isDragging: boolean }
      | { type: "indicator" };

    const result: Entry[] = [];
    let nonDraggedCount = 0;

    for (const item of localOrder) {
      const isDragging = item.id === draggedId;
      // Inject indicator before this slot when appropriate
      if (
        pendingInsertIndex !== null &&
        !isDragging &&
        nonDraggedCount === pendingInsertIndex
      ) {
        result.push({ type: "indicator" });
      }
      result.push({ type: "card", insight: item, isDragging });
      if (!isDragging) nonDraggedCount++;
    }
    // Indicator at the very end
    if (
      pendingInsertIndex !== null &&
      nonDraggedCount === pendingInsertIndex
    ) {
      result.push({ type: "indicator" });
    }

    return result;
  }, [localOrder, draggedId, pendingInsertIndex]);

  const draggedInsight = draggedId
    ? localOrder.find((i) => i.id === draggedId) ?? null
    : null;

  return (
    <View ref={containerRef} style={styles.container}>
      {/* Banner */}
      <View
        style={styles.banner}
      >
        <Text style={styles.bannerText}>≡  Drag to reorder</Text>
        <TouchableOpacity
          onPress={onExitReorder}
          style={styles.doneBtn}
          accessibilityLabel="Exit reorder mode"
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        scrollEnabled={draggedId === null}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {renderItems.map((entry, idx) => {
          if (entry.type === "indicator") {
            return <View key={`ind_${idx}`} style={styles.insertLine} />;
          }
          const { insight, isDragging } = entry;
          return (
            <View
              key={insight.id}
              style={[styles.cardRow, isDragging && styles.cardRowDragging]}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                layoutsRef.current.set(insight.id, { y, height });
              }}
            >
              <View style={styles.cardContent}>
                <InsightCard
                  insight={insight}
                  onPress={onPressCard}
                  onLongPress={NOOP_LONG_PRESS}
                />
              </View>
              <DragHandle insightId={insight.id} handlersRef={handlersRef} />
            </View>
          );
        })}
      </ScrollView>

      {/* Ghost — floating copy of the dragged card, follows finger */}
      {draggedInsight && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              top: ghostY,
              height: ghostHeightRef.current,
            },
          ]}
        >
          <InsightCard
            insight={draggedInsight}
            onPress={() => {}}
            onLongPress={NOOP_LONG_PRESS}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary[500] + "18",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary[500] + "44",
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary[700],
  },
  doneBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  doneBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 8 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardRowDragging: {
    opacity: 0.3,
  },
  cardContent: { flex: 1 },
  handle: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginRight: 4,
  },
  handleIcon: {
    fontSize: 22,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  insertLine: {
    height: 3,
    backgroundColor: Colors.primary[500],
    marginHorizontal: 12,
    borderRadius: 2,
    marginVertical: 1,
  },
  ghost: {
    position: "absolute",
    left: 0,
    right: 44, // keeps the drag handle visible
    elevation: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    opacity: 0.92,
  },
});
