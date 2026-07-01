import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Priority } from "../../types";
import { Colors } from "../../constants/colors";

interface KanbanMiniCardProps {
  title: string;
  priority: Priority;
}

export default function KanbanMiniCard({
  title,
  priority,
}: KanbanMiniCardProps) {
  return (
    <View style={styles.card}>
      <View
        style={[
          styles.priorityStrip,
          { backgroundColor: Colors.priority[priority] },
        ]}
      />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff8f8",
    borderRadius: 8,
    marginRight: 8,
    width: 100,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  priorityStrip: {
    width: 4,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 17,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});
