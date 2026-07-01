import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { InsightStage } from "../../types";
import { KanbanStageData } from "../../hooks/useKanbanData";
import KanbanMiniCard from "./KanbanMiniCard";
import { Colors } from "../../constants/colors";

interface KanbanOverviewProps {
  stages: KanbanStageData[];
  loading: boolean;
  onRefresh: () => void;
  onSelectStage: (stage: InsightStage) => void;
}

export default function KanbanOverview({
  stages,
  loading,
  onRefresh,
  onSelectStage,
}: KanbanOverviewProps) {
  if (loading && stages.every((s) => s.totalCount === 0)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          colors={[Colors.primary[500]]}
          tintColor={Colors.primary[500]}
        />
      }
    >
      {stages.map(({ stage, totalCount, cards, moreCount }) => (
        <View key={stage} style={styles.section}>
          {/* Section header — tappable to jump to list view for this stage */}
          <TouchableOpacity
            style={styles.header}
            onPress={() => onSelectStage(stage)}
            accessibilityLabel={`Go to ${stage} list view`}
          >
            <View
              style={[
                styles.stageDot,
                { backgroundColor: Colors.stage[stage] },
              ]}
            />
            <Text style={styles.stageName}>{stage}</Text>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: Colors.stage[stage] + "22" },
              ]}
            >
              <Text style={[styles.countText, { color: Colors.stage[stage] }]}>
                {totalCount}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <FlatList
            data={cards}
            keyExtractor={(c) => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={styles.cardsRow}
            ListEmptyComponent={
              <Text style={styles.empty}>No insights yet</Text>
            }
            renderItem={({ item }) => (
              <KanbanMiniCard title={item.title} priority={item.priority} />
            )}
          />

          {moreCount > 0 && (
            <TouchableOpacity
              onPress={() => onSelectStage(stage)}
              style={styles.moreLink}
              accessibilityLabel={`Show ${moreCount} more ${stage} insights`}
            >
              <Text style={styles.moreLinkText}>+{moreCount} more</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 12, gap: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chevron: {
    fontSize: 18,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  cardsRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "stretch",
  },
  empty: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
    paddingVertical: 8,
    textAlign: "center",
  },
  moreLink: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    alignSelf: "flex-start",
  },
  moreLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary[500],
  },
});
