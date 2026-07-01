import React, { useState, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import { InsightStage, Priority, Insight } from "../types";
import { useInsights } from "../hooks/useInsights";
import { useMoveInsight } from "../hooks/useMoveInsight";
import { useInsightDetail } from "../hooks/useInsightDetail";
import { useCreateInsight } from "../hooks/useCreateInsight";
import { useUpdateInsight } from "../hooks/useUpdateInsight";
import { useDebounce } from "../hooks/useDebounce";
import PipelineBar from "../components/board/PipelineBar";
import InsightCardList from "../components/board/InsightCardList";
import FilterBar from "../components/board/FilterBar";
import DetailSheet from "../components/common/DetailSheet";
import InsightDetailPanel from "../components/detail/InsightDetailPanel";
import InsightForm from "../components/forms/InsightForm";
import { InsightFormValues } from "../schemas/insightForm";
import { Colors } from "../constants/colors";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard";
import { usePresence } from "@/hooks/usePresence";
import { useNavigation } from "@react-navigation/native";
import OnlineAvatars from "@/components/common/OnlineAvatars";

const STAGES: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];

export default function BoardScreen() {
  const currentUser = useCurrentUser();

  const [selectedStage, setSelectedStage] =
    useState<InsightStage>("Observation");
  const [search, setSearch] = useState("");
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);

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

  // Track the form's dirty state without causing re-renders
  const formIsDirtyRef = useRef(false);
  // Set to true when Edit is tapped — consumed by the detail sheet's onClosed
  // callback so the form only opens after the detail modal is fully unmounted.
  const pendingEditRef = useRef(false);

  const debouncedSearch = useDebounce(search, 300);

  const handleDetailChanged = useCallback((fields: string[]) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedFields(fields);
    highlightTimerRef.current = setTimeout(() => setHighlightedFields([]), 1500);
  }, []);

  // Clear the timer on unmount
  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  useRealtimeBoard(
    currentUser?.id ?? null,
    showDetail ? detailInsightId : null,
    handleDetailChanged,
  );

  const { onlineUsers } = usePresence(currentUser);

  const { insights, counts, filter, loading, refetch, loadMore } = useInsights(
    selectedStage,
    { search: debouncedSearch, priorities: selectedPriorities },
  );

  const {
    insight: detailInsight,
    loading: detailLoading,
    refetch: refetchDetail,
  } = useInsightDetail(detailInsightId);

  const { moveInsight } = useMoveInsight();
  const { create } = useCreateInsight();
  const { update } = useUpdateInsight();

  const handleTogglePriority = useCallback((priority: Priority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority],
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setSearch("");
    setSelectedPriorities([]);
  }, []);

  const handlePressCard = useCallback((insight: Insight) => {
    setDetailInsightId(insight.id);
    setShowDetail(true);
  }, []);

  const handleLongPress = useCallback(
    (insight: Insight) => {
      const options = STAGES.filter((s) => s !== insight.stage);
      const doMove = (stage: InsightStage) =>
        moveInsight(insight, stage, filter).catch(() => null);

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: `Move "${insight.title}" to…`,
            options: [...options, "Cancel"],
            cancelButtonIndex: options.length,
          },
          (index) => {
            if (index < options.length) doMove(options[index]);
          },
        );
      } else {
        Alert.alert("Move to…", undefined, [
          ...options.map((s) => ({
            text: s,
            onPress: () => doMove(s),
          })),
          { text: "Cancel", style: "cancel" as const },
        ]);
      }
    },
    [moveInsight, filter],
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
    setEditingInsight(detailInsight);
    pendingEditRef.current = true;
    setShowDetail(false);
  }, [detailInsight]);

  const handleOpenCreate = useCallback(() => {
    setEditingInsight(null);
    formIsDirtyRef.current = false;
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    formIsDirtyRef.current = false;
  }, []);

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
      } catch {
        // Error toast already shown inside the hook — just keep the form open
      } finally {
        setSubmitting(false);
      }
    },
    [editingInsight, update, create, refetch, refetchDetail, closeForm],
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
        <View style={{ marginRight: 12 }}>
          <OnlineAvatars
            users={onlineUsers}
            currentUserId={currentUser?.id ?? ""}
          />
        </View>
      ),
    });
  }, [onlineUsers, currentUser, navigation]);
  return (
    <View style={styles.container}>
      <PipelineBar
        selectedStage={selectedStage}
        counts={counts}
        onSelectStage={setSelectedStage}
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedPriorities={selectedPriorities}
        onTogglePriority={handleTogglePriority}
        onClearAll={handleClearAll}
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
        onClose={() => setShowDetail(false)}
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
        />
      </DetailSheet>

      {/* Form sheet — guard intercepts swipe/backdrop when the form is dirty */}
      <DetailSheet
        visible={showForm}
        onClose={closeForm}
        onCloseRequest={handleFormCloseRequest}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
});
