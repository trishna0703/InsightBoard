import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PriorityStageCell } from "../../utils/analyticsUtils";
import { Colors } from "../../constants/colors";
import { InsightStage, Priority } from "../../types";

const STAGES: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];
const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

interface PriorityHeatmapProps {
  data: PriorityStageCell[];
}

export default function PriorityHeatmap({ data }: PriorityHeatmapProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  const getCell = (priority: Priority, stage: InsightStage) =>
    data.find((d) => d.priority === priority && d.stage === stage);

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.row}>
        <View style={styles.priorityLabel} />
        {STAGES.map((s) => (
          <Text key={s} style={styles.stageHeader} numberOfLines={1}>
            {s.slice(0, 3)}
          </Text>
        ))}
      </View>

      {PRIORITIES.map((priority) => (
        <View key={priority} style={styles.row}>
          <Text
            style={[styles.priorityLabel, { color: Colors.priority[priority] }]}
          >
            {priority}
          </Text>
          {STAGES.map((stage) => {
            const cell = getCell(priority, stage);
            const intensity = (cell?.count ?? 0) / max;
            return (
              <View
                key={stage}
                style={[
                  styles.cell,
                  {
                    backgroundColor: `rgba(63, 81, 181, ${intensity * 0.8 + 0.05})`,
                  },
                ]}
              >
                <Text style={styles.cellText}>{cell?.count ?? 0}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stageHeader: {
    flex: 1,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  priorityLabel: {
    width: 28,
    fontSize: 11,
    fontWeight: "700",
  },
  cell: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
  },
});
