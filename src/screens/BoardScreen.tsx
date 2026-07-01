import React, { useLayoutEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import PipelineBar from "../components/board/PipelineBar";
import InsightCardList from "../components/board/InsightCardList";
import KanbanOverview from "../components/board/KanbanOverview";
import DraggableInsightList from "../components/board/DraggableInsightList";
import FilterBar from "../components/board/FilterBar";
import FilterSheet from "../components/board/FilterSheet";
import MoveActionSheet from "../components/board/MoveActionSheet";
import DetailSheet from "../components/common/DetailSheet";
import InsightDetailPanel from "../components/detail/InsightDetailPanel";
import InsightForm from "../components/forms/InsightForm";
import ConflictModal from "../components/forms/ConflictModal";
import ActivityFeedSheet from "../components/board/ActivityFeedSheet";
import OnlineAvatars from "../components/common/OnlineAvatars";
import { Colors } from "../constants/colors";
import { useBoardScreen } from "../hooks/useBoardScreen";

export default function BoardScreen() {
  const b = useBoardScreen();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={b.toggleViewMode}
            accessibilityLabel={
              b.viewMode === "list"
                ? "Switch to Overview"
                : "Switch to List View"
            }
            style={styles.viewToggle}
          >
            <Text style={styles.viewToggleText}>
              {b.viewMode === "list" ? "⊞" : "☰"}
            </Text>
          </TouchableOpacity>
          <OnlineAvatars
            users={b.onlineUsers}
            currentUserId={b.currentUser?.id ?? ""}
          />
        </View>
      ),
    });
  }, [b.onlineUsers, b.currentUser, navigation, b.viewMode, b.toggleViewMode]);

  return (
    <View style={styles.container}>
      {/* Stage list or kanban overview — mutually exclusive */}
      {b.viewMode === "kanban" ? (
        <KanbanOverview
          stages={b.kanbanStages}
          loading={b.kanbanLoading}
          onRefresh={b.refetchKanban}
          onSelectStage={b.handleSelectKanbanStage}
        />
      ) : b.reorderMode ? (
        <>
          <PipelineBar
            selectedStage={b.selectedStage}
            counts={b.counts}
            onSelectStage={b.selectStageFromReorder}
          />
          <DraggableInsightList
            insights={b.insights}
            onPressCard={b.handlePressCard}
            onExitReorder={b.exitReorder}
            onReorderDone={b.handleReorderDone}
          />
        </>
      ) : (
        <>
          <PipelineBar
            selectedStage={b.selectedStage}
            counts={b.counts}
            onSelectStage={b.setSelectedStage}
          />
          <FilterBar
            search={b.filters.search}
            onSearchChange={b.changeSearch}
            activeFilterCount={b.activeFilterCount}
            chips={b.activeChips}
            onOpenSheet={b.openFilterSheet}
            onClearAll={b.clearFilters}
          />
          <InsightCardList
            insights={b.insights}
            stage={b.selectedStage}
            filter={b.filter}
            loading={b.loading}
            onRefresh={b.refetch}
            onPressCard={b.handlePressCard}
            onLongPressCard={b.handleLongPress}
            onEndReached={b.loadMore}
            broadcastState={b.broadcastState}
            onEmitSignal={b.emitSignal}
            onEditAnyway={b.handleEditAnyway}
            highlightedCardId={b.highlightedCardId}
          />
        </>
      )}

      {/* Floating activity bell — always visible */}
      <TouchableOpacity
        style={styles.bellButton}
        onPress={b.openBell}
        accessibilityLabel={`Activity feed, ${b.unreadCount} unread`}
      >
        <Text style={styles.bellIcon}>🔔</Text>
        {b.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{b.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Activity feed sheet */}
      <ActivityFeedSheet
        visible={b.feedVisible}
        onClose={b.closeFeed}
        activities={b.activities}
        loading={b.feedLoading}
        onTapEntry={b.handleTapActivity}
      />

      {/* FAB — create new insight */}
      <TouchableOpacity
        style={styles.fab}
        onPress={b.handleOpenCreate}
        accessibilityLabel="Create new insight"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* Detail sheet — no guard needed, read-only view */}
      <DetailSheet
        visible={b.showDetail}
        onClose={b.closeDetail}
        onClosed={b.onDetailClosed}
      >
        <InsightDetailPanel
          insight={b.detailInsight}
          loading={b.detailLoading}
          onEdit={b.handleOpenEdit}
          onMove={b.handleDetailMove}
          highlightedFields={b.highlightedFields}
          viewers={b.detailViewers}
        />
      </DetailSheet>

      {/* Form sheet — guard intercepts swipe/backdrop when the form is dirty */}
      <DetailSheet
        visible={b.showForm}
        onClose={b.closeForm}
        onCloseRequest={b.handleFormCloseRequest}
        onClosed={b.onFormClosed}
      >
        <InsightForm
          key={b.editingInsight?.id ?? "new"}
          initialValues={b.formInitialValues}
          editingInsight={b.editingInsight}
          submitting={b.submitting}
          onSubmit={b.handleFormSubmit}
          onCancel={b.closeForm}
          onDirtyChange={b.handleDirtyChange}
        />
      </DetailSheet>

      {/* Filter sheet */}
      <DetailSheet visible={b.showFilterSheet} onClose={b.closeFilterSheet}>
        <FilterSheet filters={b.filters} onChange={b.setFilters} />
      </DetailSheet>

      {/* Long-press action sheet (accessible move / reorder) */}
      <MoveActionSheet
        visible={b.moveSheetInsight !== null}
        insight={b.moveSheetInsight}
        onMoveTo={b.handleSheetMoveTo}
        onReorder={b.handleSheetReorder}
        onClose={b.closeMoveSheet}
      />

      {/* Conflict resolution modal */}
      <ConflictModal
        visible={b.conflictState !== null}
        fields={b.conflictState?.fields ?? []}
        onKeepMine={b.handleKeepMine}
        onKeepTheirs={b.handleKeepTheirs}
        onMerge={b.handleMerge}
        onDismiss={b.dismissConflict}
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
    right: 24,
    width: 44,
    height: 44,
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
    bottom: 80,
    right: 24,
    width: 44,
    height: 44,
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
  bellIcon: { fontSize: 18 },
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
