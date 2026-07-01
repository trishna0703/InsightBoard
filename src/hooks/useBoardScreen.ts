import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { useQuery } from "@apollo/client";
import { InsightStage, Insight } from "../types";
import { LIST_CATEGORIES, LIST_TAGS } from "../graphql/queries/tags";
import { useInsights, countActiveFilters } from "./useInsights";
import { useFilters } from "../context/FiltersContext";
import { useMoveInsight } from "./useMoveInsight";
import { useInsightDetail } from "./useInsightDetail";
import { useCreateInsight } from "./useCreateInsight";
import {
  useUpdateInsight,
  ConflictError,
  ConflictField,
  DetailNode,
} from "./useUpdateInsight";
import { useDebounce } from "./useDebounce";
import { useKanbanData } from "./useKanbanData";
import { useReorderInsights } from "./useReorderInsights";
import { useCurrentUser } from "./useCurrentUser";
import { useRealtimeBoard } from "./useRealtimeBoard";
import { usePresence } from "./usePresence";
import { useBroadcast } from "./useBroadcast";
import { useActivityFeed } from "./useActivityFeed";
import { InsightFormValues } from "../schemas/insightForm";
import type { ActiveChip } from "../components/board/FilterBar";

type ViewMode = "list" | "kanban";

interface ConflictPayload {
  fields: ConflictField[];
  serverNode: DetailNode;
  pendingValues: InsightFormValues;
}

/**
 * Container hook for BoardScreen: owns ALL board business logic — data fetching,
 * realtime subscriptions, filter/detail/form/conflict state, and the handlers
 * that mutate them. BoardScreen consumes this and only renders UI, keeping
 * presentation and logic cleanly separated.
 */
export function useBoardScreen() {
  const currentUser = useCurrentUser();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [reorderMode, setReorderMode] = useState(false);
  const [moveSheetInsight, setMoveSheetInsight] = useState<Insight | null>(null);
  const [selectedStage, setSelectedStage] =
    useState<InsightStage>("Observation");
  const { filters, setFilters, clearFilters } = useFilters();
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Detail sheet state
  const [detailInsightId, setDetailInsightId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Form sheet state: null = create mode, Insight = edit mode
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fields in the detail panel to highlight yellow (remote user just edited them)
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Card highlighted in the list after tapping an activity feed entry
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(
    null,
  );
  const cardHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Pending conflict resolution — set when useUpdateInsight throws ConflictError
  const [conflictState, setConflictState] = useState<ConflictPayload | null>(
    null,
  );

  // Track the form's dirty state without causing re-renders
  const formIsDirtyRef = useRef(false);
  // Set to true when Edit is tapped — consumed by the detail sheet's onClosed
  // callback so the form only opens after the detail modal is fully unmounted.
  const pendingEditRef = useRef(false);
  // When a ConflictError is caught, we close the form sheet and park the
  // conflict data here. The form's onClosed callback picks it up and calls
  // setConflictState — this avoids showing a Modal on top of another Modal,
  // which is unsupported on iOS.
  const pendingConflictRef = useRef<ConflictPayload | null>(null);

  const { state: broadcastState, emit: emitSignal } = useBroadcast(currentUser);
  const {
    activities,
    unreadCount,
    loading: feedLoading,
    markRead,
    markClosed,
    refetch: refetchActivities,
  } = useActivityFeed(currentUser?.id ?? null);
  const [feedVisible, setFeedVisible] = useState(false);

  // When user taps an activity entry — navigate to that stage and highlight the card
  const handleTapActivity = useCallback((insightId: string, stage: string) => {
    const stageDisplay = (stage.charAt(0).toUpperCase() +
      stage.slice(1)) as InsightStage;
    setSelectedStage(stageDisplay);
    setFeedVisible(false);
    // Small delay so the list re-renders with the new stage before the highlight fires
    setTimeout(() => {
      setHighlightedCardId(insightId);
      if (cardHighlightTimerRef.current)
        clearTimeout(cardHighlightTimerRef.current);
      cardHighlightTimerRef.current = setTimeout(
        () => setHighlightedCardId(null),
        2000,
      );
    }, 300);
  }, []);

  const debouncedSearch = useDebounce(filters.search, 300);

  // Lookup maps for active-chip labels (both queries are cache-first — no extra network cost).
  const { data: categoryData } = useQuery<{
    categoriesCollection: { edges: { node: { id: string; name: string } }[] };
  }>(LIST_CATEGORIES, { fetchPolicy: "cache-first" });
  const { data: tagData } = useQuery<{
    tagsCollection: { edges: { node: { id: string; name: string } }[] };
  }>(LIST_TAGS, { fetchPolicy: "cache-first" });

  const categoryNameById = useMemo(
    () =>
      new Map(
        categoryData?.categoriesCollection?.edges?.map((e) => [
          e.node.id,
          e.node.name,
        ]) ?? [],
      ),
    [categoryData],
  );
  const tagNameById = useMemo(
    () =>
      new Map(
        tagData?.tagsCollection?.edges?.map((e) => [e.node.id, e.node.name]) ??
          [],
      ),
    [tagData],
  );

  const activeChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    if (filters.priorities.length > 0)
      chips.push({
        key: "priorities",
        label: filters.priorities.join(", "),
        onRemove: () => setFilters((f) => ({ ...f, priorities: [] })),
      });
    if (filters.categoryId)
      chips.push({
        key: "category",
        label: categoryNameById.get(filters.categoryId) ?? "Category",
        onRemove: () => setFilters((f) => ({ ...f, categoryId: null })),
      });
    if (filters.hcpId)
      chips.push({
        key: "hcp",
        label: filters.hcpName ?? "HCP",
        onRemove: () =>
          setFilters((f) => ({ ...f, hcpId: null, hcpName: null })),
      });
    filters.tagIds.forEach((tid) =>
      chips.push({
        key: `tag-${tid}`,
        label: tagNameById.get(tid) ?? tid,
        onRemove: () =>
          setFilters((f) => ({
            ...f,
            tagIds: f.tagIds.filter((x) => x !== tid),
          })),
      }),
    );
    if (filters.dateFrom || filters.dateTo)
      chips.push({
        key: "date",
        label: [filters.dateFrom, filters.dateTo].filter(Boolean).join(" → "),
        onRemove: () =>
          setFilters((f) => ({ ...f, dateFrom: null, dateTo: null })),
      });
    return chips;
  }, [filters, categoryNameById, tagNameById, setFilters]);

  const handleDetailChanged = useCallback((fields: string[]) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedFields(fields);
    highlightTimerRef.current = setTimeout(
      () => setHighlightedFields([]),
      1500,
    );
  }, []);

  // Clear timers on unmount
  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (cardHighlightTimerRef.current)
        clearTimeout(cardHighlightTimerRef.current);
    },
    [],
  );

  useRealtimeBoard(
    currentUser?.id ?? null,
    showDetail ? detailInsightId : null,
    handleDetailChanged,
    refetchActivities,
  );

  const { onlineUsers } = usePresence(currentUser);

  const { insights, counts, filter, loading, refetch, loadMore } = useInsights(
    selectedStage,
    { ...filters, search: debouncedSearch },
  );

  const {
    insight: detailInsight,
    loading: detailLoading,
    refetch: refetchDetail,
  } = useInsightDetail(detailInsightId);

  const {
    stages: kanbanStages,
    loading: kanbanLoading,
    refetch: refetchKanban,
  } = useKanbanData();
  const { reorderInsight } = useReorderInsights();

  const { moveInsight } = useMoveInsight();
  const { create } = useCreateInsight();
  const { update } = useUpdateInsight();

  const toggleViewMode = useCallback(
    () => setViewMode((m) => (m === "list" ? "kanban" : "list")),
    [],
  );

  const handleSelectKanbanStage = useCallback((stage: InsightStage) => {
    setSelectedStage(stage);
    setViewMode("list");
  }, []);

  const selectStageFromReorder = useCallback((stage: InsightStage) => {
    setSelectedStage(stage);
    setReorderMode(false);
  }, []);

  const exitReorder = useCallback(() => setReorderMode(false), []);

  const changeSearch = useCallback(
    (text: string) => setFilters((f) => ({ ...f, search: text })),
    [setFilters],
  );

  const handlePressCard = useCallback(
    (insight: Insight) => {
      setDetailInsightId(insight.id);
      setShowDetail(true);
      emitSignal("viewing", insight.id, "start");
    },
    [emitSignal],
  );

  // Long-press opens an accessible action sheet (swipe alternative) offering
  // both a direct "Move to…" and entry into drag-to-reorder mode.
  const handleLongPress = useCallback((insight: Insight) => {
    setMoveSheetInsight(insight);
  }, []);

  const handleSheetMoveTo = useCallback(
    (insight: Insight, targetStage: InsightStage) => {
      setMoveSheetInsight(null);
      void moveInsight(insight, targetStage, filter).catch(() => null);
    },
    [moveInsight, filter],
  );

  const handleSheetReorder = useCallback((_insight: Insight) => {
    setMoveSheetInsight(null);
    setReorderMode(true);
  }, []);

  const closeMoveSheet = useCallback(() => setMoveSheetInsight(null), []);

  const handleReorderDone = useCallback(
    (moved: Insight, newOrder: Insight[]) => {
      reorderInsight(moved, newOrder, filter);
    },
    [reorderInsight, filter],
  );

  const handleDetailMove = useCallback(
    async (targetStage: InsightStage) => {
      if (!detailInsight) return;
      await moveInsight(detailInsight, targetStage, filter).catch(() => null);
      refetchDetail();
    },
    [detailInsight, moveInsight, filter, refetchDetail],
  );

  const handleOpenEdit = useCallback(() => {
    if (!detailInsight) return;
    const activeEditors = broadcastState.editing[detailInsight.id] ?? [];
    if (activeEditors.length > 0) {
      Alert.alert(
        `${activeEditors[0].userName} is editing…`,
        "What would you like to do?",
        [
          { text: "View Only", style: "cancel" },
          {
            text: "Edit Anyway",
            style: "destructive",
            onPress: () => {
              emitSignal("editing", detailInsight.id, "start");
              setEditingInsight(detailInsight);
              pendingEditRef.current = true;
              setShowDetail(false);
            },
          },
        ],
      );
      return;
    }
    emitSignal("editing", detailInsight.id, "start");
    setEditingInsight(detailInsight);
    pendingEditRef.current = true;
    setShowDetail(false);
  }, [detailInsight, broadcastState, emitSignal]);

  const handleOpenCreate = useCallback(() => {
    setEditingInsight(null);
    formIsDirtyRef.current = false;
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    if (editingInsight) emitSignal("editing", editingInsight.id, "stop");
    setShowForm(false);
    setConflictState(null);
    formIsDirtyRef.current = false;
  }, [editingInsight, emitSignal]);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    formIsDirtyRef.current = dirty;
  }, []);

  // Called by DetailSheet's onCloseRequest when the user swipes or taps
  // the backdrop on the form sheet. Shows an alert if there are unsaved changes.
  const handleFormCloseRequest = useCallback((proceed: () => void) => {
    if (formIsDirtyRef.current) {
      Alert.alert("Discard changes?", "Your unsaved changes will be lost.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            formIsDirtyRef.current = false;
            proceed(); // runs the dismiss animation then calls onClose
          },
        },
      ]);
    } else {
      proceed();
    }
  }, []);

  const handleFormSubmit = useCallback(
    async (values: InsightFormValues) => {
      setSubmitting(true);
      try {
        if (editingInsight) {
          await update(editingInsight, values);
          refetchDetail();
        } else {
          await create(values);
        }
        closeForm();
        refetch();
      } catch (err) {
        if (err instanceof ConflictError) {
          // Park conflict data and close the form sheet first.
          // iOS doesn't support a Modal rendered on top of another Modal —
          // onClosed on the form's DetailSheet will show ConflictModal once
          // the sheet is fully unmounted.
          pendingConflictRef.current = {
            fields: err.fields,
            serverNode: err.serverNode,
            pendingValues: values,
          };
          if (editingInsight) emitSignal("editing", editingInsight.id, "stop");
          formIsDirtyRef.current = false;
          setShowForm(false);
        }
        // Non-conflict error toast already shown inside the hook
      } finally {
        setSubmitting(false);
      }
    },
    [
      editingInsight,
      update,
      create,
      refetch,
      refetchDetail,
      closeForm,
      emitSignal,
    ],
  );

  const handleKeepMine = useCallback(async () => {
    if (!conflictState || !editingInsight) return;
    setSubmitting(true);
    try {
      await update(editingInsight, conflictState.pendingValues, true);
      refetchDetail();
      setConflictState(null);
      closeForm();
      refetch();
    } catch {
      // toast shown in hook
    } finally {
      setSubmitting(false);
    }
  }, [
    conflictState,
    editingInsight,
    update,
    refetchDetail,
    closeForm,
    refetch,
  ]);

  const handleKeepTheirs = useCallback(() => {
    setConflictState(null);
    closeForm();
    refetchDetail();
  }, [closeForm, refetchDetail]);

  const handleMerge = useCallback(
    async (choices: Record<string, "mine" | "theirs">) => {
      if (!conflictState || !editingInsight) return;
      const { pendingValues, serverNode } = conflictState;
      const merged: InsightFormValues = {
        ...pendingValues,
        title:
          choices["title"] === "theirs"
            ? serverNode.title
            : pendingValues.title,
        description:
          choices["description"] === "theirs"
            ? serverNode.description
            : pendingValues.description,
        stage:
          choices["stage"] === "theirs"
            ? (serverNode.stage as InsightFormValues["stage"])
            : pendingValues.stage,
        priority:
          choices["priority"] === "theirs"
            ? (serverNode.priority as InsightFormValues["priority"])
            : pendingValues.priority,
        drugName:
          choices["drugName"] === "theirs"
            ? serverNode.drugName
            : pendingValues.drugName,
      };
      setSubmitting(true);
      try {
        await update(editingInsight, merged, true);
        refetchDetail();
        setConflictState(null);
        closeForm();
        refetch();
      } catch {
        // toast shown in hook
      } finally {
        setSubmitting(false);
      }
    },
    [conflictState, editingInsight, update, refetchDetail, closeForm, refetch],
  );

  const dismissConflict = useCallback(() => setConflictState(null), []);

  const handleEditAnyway = useCallback(
    (insight: Insight) => {
      setDetailInsightId(insight.id);
      setEditingInsight(insight);
      emitSignal("editing", insight.id, "start");
      pendingEditRef.current = false;
      setShowForm(true);
    },
    [emitSignal],
  );

  // ── Detail / form / feed / filter sheet open-close wiring ──────────────────

  const closeDetail = useCallback(() => {
    if (detailInsightId) emitSignal("viewing", detailInsightId, "stop");
    setShowDetail(false);
  }, [detailInsightId, emitSignal]);

  const onDetailClosed = useCallback(() => {
    if (pendingEditRef.current) {
      pendingEditRef.current = false;
      setShowForm(true);
    }
  }, []);

  const onFormClosed = useCallback(() => {
    if (pendingConflictRef.current) {
      setConflictState(pendingConflictRef.current);
      pendingConflictRef.current = null;
    }
  }, []);

  const openBell = useCallback(() => {
    markRead();
    setFeedVisible(true);
  }, [markRead]);

  const closeFeed = useCallback(() => {
    markClosed();
    setFeedVisible(false);
  }, [markClosed]);

  const openFilterSheet = useCallback(() => setShowFilterSheet(true), []);
  const closeFilterSheet = useCallback(() => setShowFilterSheet(false), []);

  const formInitialValues: Partial<InsightFormValues> | undefined =
    editingInsight
      ? {
          title: editingInsight.title,
          description: editingInsight.description,
          priority: editingInsight.priority,
          stage: editingInsight.stage,
          categoryId: editingInsight.categoryId ?? null,
          hcpId: editingInsight.hcp?.id ?? null,
          drugName: editingInsight.drugName ?? null,
          tagIds: editingInsight.tags.map((t) => t.id),
        }
      : undefined;

  const detailViewers = detailInsightId
    ? (broadcastState.viewing[detailInsightId] ?? [])
    : [];

  return {
    // identity / presence
    currentUser,
    onlineUsers,
    broadcastState,
    emitSignal,

    // view mode / reorder
    viewMode,
    toggleViewMode,
    reorderMode,
    exitReorder,

    // stage + board data
    selectedStage,
    setSelectedStage,
    selectStageFromReorder,
    handleSelectKanbanStage,
    insights,
    counts,
    filter,
    loading,
    refetch,
    loadMore,

    // kanban overview
    kanbanStages,
    kanbanLoading,
    refetchKanban,

    // filters
    filters,
    activeChips,
    activeFilterCount: countActiveFilters(filters),
    changeSearch,
    clearFilters,
    setFilters,
    showFilterSheet,
    openFilterSheet,
    closeFilterSheet,

    // move action sheet
    moveSheetInsight,
    handleLongPress,
    handleSheetMoveTo,
    handleSheetReorder,
    closeMoveSheet,
    handleReorderDone,

    // detail sheet
    showDetail,
    detailInsight,
    detailInsightId,
    detailLoading,
    detailViewers,
    highlightedFields,
    highlightedCardId,
    handlePressCard,
    closeDetail,
    onDetailClosed,
    handleDetailMove,
    handleOpenEdit,

    // form sheet
    showForm,
    editingInsight,
    submitting,
    formInitialValues,
    handleOpenCreate,
    closeForm,
    handleFormCloseRequest,
    onFormClosed,
    handleDirtyChange,
    handleFormSubmit,
    handleEditAnyway,

    // conflict modal
    conflictState,
    handleKeepMine,
    handleKeepTheirs,
    handleMerge,
    dismissConflict,

    // activity feed
    activities,
    unreadCount,
    feedLoading,
    feedVisible,
    openBell,
    closeFeed,
    handleTapActivity,
  };
}
