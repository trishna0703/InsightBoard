import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Insight } from "../../types";
import { Colors } from "../../constants/colors";
import { getRelativeTime } from "../../utils/dateUtils";
import { recentlyArrivedIds } from "../../hooks/useRealtimeBoard";

interface InsightCardProps {
  insight: Insight;
  onPress: (insight: Insight) => void;
  onLongPress: (insight: Insight) => void;
}

export default function InsightCard({
  insight,
  onPress,
  onLongPress,
}: InsightCardProps) {
  // Play a fade-in when this card just arrived from another user's create.
  const isNewArrival = useRef(recentlyArrivedIds.has(insight.id)).current;
  const fadeAnim = useRef(new Animated.Value(isNewArrival ? 0 : 1)).current;

  useEffect(() => {
    if (!isNewArrival) return;
    // Remove immediately so a re-mount (FlashList recycle) doesn't re-animate.
    recentlyArrivedIds.delete(insight.id);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []); // mount only

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(insight)}
      onLongPress={() => onLongPress(insight)}
      accessibilityLabel={`Insight: ${insight.title}, Priority ${insight.priority}, ${insight.stage}`}
      accessibilityRole="button"
    >
      {/* Header row: priority badge + timestamp */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: Colors.priority[insight.priority] },
          ]}
        >
          <Text style={styles.priorityText}>{insight.priority}</Text>
        </View>
        <Text style={styles.timestamp}>
          {getRelativeTime(insight.createdAt)}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {insight.title}
      </Text>

      {/* HCP name */}
      {insight.hcp && (
        <Text style={styles.hcp} numberOfLines={1}>
          👤 {insight.hcp.name}
        </Text>
      )}

      {/* Footer row: category chip */}
      <View style={styles.footerRow}>
        {insight.category && (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{insight.category}</Text>
          </View>
        )}
        {insight.drugName && (
          <View style={styles.drugChip}>
            <Text style={styles.drugText}>💊 {insight.drugName}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  hcp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  categoryChip: {
    backgroundColor: Colors.primary[500] + "18",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.primary[700],
    fontWeight: "500",
  },
  drugChip: {
    backgroundColor: Colors.neutral[500] + "18",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  drugText: {
    fontSize: 11,
    color: Colors.neutral[700],
    fontWeight: "500",
  },
});