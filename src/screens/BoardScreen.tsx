import React, {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
} from "react";
import { View, StyleSheet, TouchableOpacity, Text, Alert } from "react-native";
import { useQuery } from "@apollo/client";
import { InsightStage, Insight } from "../types";
import { LIST_CATEGORIES, LIST_TAGS } from "../graphql/queries/tags";
import { useInsights, FilterInput, DEFAULT_FILTER, countActiveFilters } from "../hooks/useInsights";
import { useMoveInsight } from "../hooks/useMoveInsight";
import { useInsightDetail } from "../hooks/useInsightDetail";
import { useCreateInsight } from "../hooks/useCreateInsight";
import {
  useUpdateInsight,
  ConflictError,
  ConflictField,
  DetailNode,
} from "../hooks/useUpdateInsight";
import { useDebounce } from "../hooks/useDebounce";
import PipelineBar from "../components/board/PipelineBar";
import InsightCardList from "../components/board/InsightCardList";
import KanbanOverview from "../components/board/KanbanOverview";
import DraggableInsightList from "../components/board/DraggableInsightList";
import FilterBar from "../components/board/FilterBar";
import FilterSheet from "../components/board/FilterSheet";
import { useKanbanData } from "../hooks/useKanbanData";
import { useReorderInsights } from "../hooks/useReorderInsights";
import DetailSheet from "../components/common/DetailSheet";
import InsightDetailPanel from "../components/detail/InsightDetailPanel";
import InsightForm from "../components/forms/InsightForm";
import ConflictModal from "../components/forms/ConflictModal";
import { InsightFormValues } from "../schemas/insightForm";
import { Colors } from "../constants/colors";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard";
import { usePresence } from "@/hooks/usePresence";
import { useNavigation } from "@react-navigation/native";
import OnlineAvatars from "@/components/common/OnlineAvatars";
import { useBroadcast } from "../hooks/useBroadcast";
import { useActivityFeed } from "../hooks/useActivityFeed";
import ActivityFeedSheet from "../components/board/ActivityFeedSheet";

export default function BoardScreen() {
  const currentUser = useCurrentUser();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedStage, setSelectedStage] =
    useState<InsightStage>("Observation");
  const [filters, setFilters] = useState<FilterInput>(DEFAULT_FILTER);
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
  const [conflictState, setConflictState] = useState<{
    fields: ConflictField[];
    serverNode: DetailNode;
    pendingValues: InsightFormValues;
  } | null>(null);

  // Track the form's dirty state without causing re-renders
  const formIsDirtyRef = useRef(false);
  // Set to true when Edit is tapped — consumed by the detail sheet's onClosed
  // callback so the form only opens after the detail modal is fully unmounted.
  const pendingEditRef = useRef(false);
  // When a ConflictError is caught, we close the form sheet and park the
  // conflict data here. The form's onClosed callback picks it up and calls
  // setConflictState — this avoids showing a Modal on top of another Modal,
  // which is unsupported on iOS.
  const pendingConflictRef = useRef<{
    fields: ConflictField[];
    serverNode: DetailNode;
    pendingValues: InsightFormValues;
  } | null>(null);

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
        categoryData?.categoriesCollection?.edges?.map((e) => [e.node.id, e.node.name]) ?? [],
      ),
    [categoryData],
  );
  const tagNameById = useMemo(
    () =>
      new Map(
        tagData?.tagsCollection?.edges?.map((e) => [e.node.id, e.node.name]) ?? [],
      ),
    [tagData],
  );

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
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
        onRemove: () => setFilters((f) => ({ ...f, hcpId: null, hcpName: null })),
      });
    filters.tagIds.forEach((tid) =>
      chips.push({
        key: `tag-${tid}`,
        label: tagNameById.get(tid) ?? tid,
        onRemove: () =>
          setFilters((f) => ({ ...f, tagIds: f.tagIds.filter((x) => x !== tid) })),
      }),
    );
    if (filters.dateFrom || filters.dateTo)
      chips.push({
        key: "date",
        label: [filters.dateFrom, filters.dateTo].filter(Boolean).join(" → "),
        onRemove: () => setFilters((f) => ({ ...f, dateFrom: null, dateTo: null })),
      });
    return chips;
  }, [filters, categoryNameById, tagNameById]);

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

  const handleSelectKanbanStage = useCallback((stage: InsightStage) => {
    setSelectedStage(stage);
    setViewMode("list");
  }, []);

  const { moveInsight } = useMoveInsight();
  const { create } = useCreateInsight();
  const { update } = useUpdateInsight();

  const handlePressCard = useCallback(
    (insight: Insight) => {
      setDetailInsightId(insight.id);
      setShowDetail(true);
      emitSignal("viewing", insight.id, "start");
    },
    [emitSignal],
  );

  const handleLongPress = useCallback((_insight: Insight) => {
    setReorderMode(true);
  }, []);

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
    [editingInsight, update, create, refetch, refetchDetail, closeForm],
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

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() =>
              setViewMode((m) => (m === "list" ? "kanban" : "list"))
            }
            accessibilityLabel={
              viewMode === "list" ? "Switch to Overview" : "Switch to List View"
            }
            style={styles.viewToggle}
          >
            <Text style={styles.viewToggleText}>
              {viewMode === "list" ? "⊞" : "☰"}
            </Text>
          </TouchableOpacity>
          <OnlineAvatars
            users={onlineUsers}
            currentUserId={currentUser?.id ?? ""}
          />
        </View>
      ),
    });
  }, [onlineUsers, currentUser, navigation, viewMode]);
  return (
    <View style={styles.container}>
      {/* Stage list or kanban overview — mutually exclusive */}
      {viewMode === "kanban" ? (
        <KanbanOverview
          stages={kanbanStages}
          loading={kanbanLoading}
          onRefresh={refetchKanban}
          onSelectStage={handleSelectKanbanStage}
        />
      ) : reorderMode ? (
        <>
          <PipelineBar
            selectedStage={selectedStage}
            counts={counts}
            onSelectStage={(stage) => {
              setSelectedStage(stage);
              setReorderMode(false);
            }}
          />
          <DraggableInsightList
            insights={insights}
            onPressCard={handlePressCard}
            onExitReorder={() => setReorderMode(false)}
            onReorderDone={handleReorderDone}
          />
        </>
      ) : (
        <>
          <PipelineBar
            selectedStage={selectedStage}
            counts={counts}
            onSelectStage={setSelectedStage}
          />
          <FilterBar
            search={filters.search}
            onSearchChange={(text) => setFilters((f) => ({ ...f, search: text }))}
            activeFilterCount={countActiveFilters(filters)}
            chips={activeChips}
            onOpenSheet={() => setShowFilterSheet(true)}
          />
          <InsightCardList
            insights={insights}
            stage={selectedStage}
            filter={filter}
            loading={loading}
            onRefresh={refetch}
            onPressCard={handlePressCard}
            onLongPressCard={handleLongPress}
            onEndReached={loadMore}
            broadcastState={broadcastState}
            onEmitSignal={emitSignal}
            onEditAnyway={handleEditAnyway}
            highlightedCardId={highlightedCardId}
          />
        </>
      )}

      {/* Floating activity bell — always visible */}
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => {
          markRead();
          setFeedVisible(true);
        }}
        accessibilityLabel={`Activity feed, ${unreadCount} unread`}
      >
        <Text style={styles.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Activity feed sheet */}
      <ActivityFeedSheet
        visible={feedVisible}
        onClose={() => {
          markClosed();
          setFeedVisible(false);
        }}
        activities={activities}
        loading={feedLoading}
        onTapEntry={handleTapActivity}
      />

      {/* FAB — create new insight */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenCreate}
        accessibilityLabel="Create new insight"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* Detail sheet — no guard needed, read-only view */}
      <DetailSheet
        visible={showDetail}
        onClose={() => {
          if (detailInsightId) emitSignal("viewing", detailInsightId, "stop");
          setShowDetail(false);
        }}
        onClosed={() => {
          if (pendingEditRef.current) {
            pendingEditRef.current = false;
            setShowForm(true);
          }
        }}
      >
        <InsightDetailPanel
          insight={detailInsight}
          loading={detailLoading}
          onEdit={handleOpenEdit}
          onMove={handleDetailMove}
          highlightedFields={highlightedFields}
          viewers={
            detailInsightId
              ? (broadcastState.viewing[detailInsightId] ?? [])
              : []
          }
        />
      </DetailSheet>

      {/* Form sheet — guard intercepts swipe/backdrop when the form is dirty */}
      <DetailSheet
        visible={showForm}
        onClose={closeForm}
        onCloseRequest={handleFormCloseRequest}
        onClosed={() => {
          if (pendingConflictRef.current) {
            setConflictState(pendingConflictRef.current);
            pendingConflictRef.current = null;
          }
        }}
      >
        <InsightForm
          key={editingInsight?.id ?? "new"}
          initialValues={formInitialValues}
          editingInsight={editingInsight}
          submitting={submitting}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          onDirtyChange={handleDirtyChange}
        />
      </DetailSheet>

      {/* Filter sheet */}
      <DetailSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
      >
        <FilterSheet filters={filters} onChange={setFilters} />
      </DetailSheet>

      {/* Conflict resolution modal */}
      <ConflictModal
        visible={conflictState !== null}
        fields={conflictState?.fields ?? []}
        onKeepMine={handleKeepMine}
        onKeepTheirs={handleKeepTheirs}
        onMerge={handleMerge}
        onDismiss={() => setConflictState(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  viewToggle: {
    padding: 4,
  },
  viewToggleText: {
    fontSize: 22,
    color: Colors.white,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabIcon: {
    color: Colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "300",
  },
  bellButton: {
    position: "absolute",
    bottom: 24,
    right: 84,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  bellIcon: { fontSize: 22 },
  unreadBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.system.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
});
