import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import DetailSheet from "../common/DetailSheet";
import { ActivityEntry } from "../../hooks/useActivityFeed";
import { Colors } from "../../constants/colors";
import { getRelativeTime } from "../../utils/dateUtils";
import { InsightStage } from "../../types";

interface ActivityFeedSheetProps {
  visible: boolean;
  onClose: () => void;
  activities: ActivityEntry[];
  loading: boolean;
  onTapEntry: (insightId: string, stage: string) => void;
}

function getActivityText(entry: ActivityEntry): string {
  if (entry.field === "stage") {
    const newStage = entry.newValue
      ? entry.newValue.charAt(0).toUpperCase() + entry.newValue.slice(1)
      : "?";
    return `moved insight to ${newStage}`;
  }
  if (entry.field === "created") return "created a new insight";
  return `updated ${entry.field}`;
}

export default function ActivityFeedSheet({
  visible,
  onClose,
  activities,
  loading,
  onTapEntry,
}: ActivityFeedSheetProps) {
  return (
    <DetailSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Activity Feed</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary[500]} />
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.empty}>No activity yet</Text>
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.entry}
                onPress={() => onTapEntry(item.insightId, item.insightStage)}
                accessibilityLabel={`${item.userName} ${getActivityText(item)}`}
              >
                <View style={styles.dot} />
                <View style={styles.entryContent}>
                  <Text style={styles.entryText}>
                    <Text style={styles.userName}>{item.userName} </Text>
                    {getActivityText(item)}
                  </Text>
                  <Text style={styles.entryTitle} numberOfLines={1}>
                    {item.insightTitle}
                  </Text>
                  <Text style={styles.entryTime}>
                    {getRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </DetailSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: Colors.textSecondary, fontSize: 14 },
  list: { paddingBottom: 40 },
  entry: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
    marginTop: 5,
    flexShrink: 0,
  },
  entryContent: { flex: 1, gap: 2 },
  entryText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  userName: { fontWeight: "700" },
  entryTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  entryTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
