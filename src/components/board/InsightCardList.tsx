import React, { useState } from "react";
import { View, Text, StyleSheet, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Insight, InsightStage } from "../../types";
import SwipeableInsightCard from "./SwipeableInsightCard";
import { Colors } from "../../constants/colors";
import { InsightsQueryFilter } from "../../hooks/useInsights";
import { BroadcastState } from "@/hooks/useBroadcast";

interface InsightCardListProps {
  insights: Insight[];
  stage: InsightStage;
  filter: InsightsQueryFilter;
  loading: boolean;
  onRefresh: () => void;
  onPressCard: (insight: Insight) => void;
  onLongPressCard: (insight: Insight) => void;
  onEndReached: () => void;
  broadcastState?: BroadcastState;
  onEmitSignal?: (
    type: "swiping",
    insightId: string,
    action: "start" | "stop",
  ) => void;
  onEditAnyway?: (insight: Insight) => void;
  highlightedCardId?: string | null;
}

function EmptyState({ stage }: { stage: InsightStage }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No insights in {stage}</Text>
      <Text style={styles.emptySubtitle}>Tap + to capture a new insight</Text>
    </View>
  );
}

export default function InsightCardList({
  insights,
  stage,
  filter,
  loading,
  onRefresh,
  onPressCard,
  onLongPressCard,
  onEndReached,
  broadcastState,
  onEmitSignal,
  onEditAnyway,
  highlightedCardId,
}: InsightCardListProps) {
  const [scrollLocked, setScrollLocked] = useState(false);

  return (
    <FlashList
      data={insights}
      scrollEnabled={!scrollLocked}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <SwipeableInsightCard
          insight={item}
          onPress={onPressCard}
          onLongPress={onLongPressCard}
          onDragStart={() => setScrollLocked(true)}
          onDragEnd={() => setScrollLocked(false)}
          highlighted={item.id === highlightedCardId}
          {...{ filter, broadcastState, onEmitSignal, onEditAnyway }}
        />
      )}
      ListEmptyComponent={!loading ? <EmptyState stage={stage} /> : null}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          colors={[Colors.primary[500]]}
          tintColor={Colors.primary[500]}
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingVertical: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary },
});
