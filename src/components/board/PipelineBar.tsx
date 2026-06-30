import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { InsightStage } from "../../types";
import { Colors } from "../../constants/colors";

const STAGES: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];

interface PipelineBarProps {
  selectedStage: InsightStage;
  counts: Record<InsightStage, number>;
  onSelectStage: (stage: InsightStage) => void;
}

export default function PipelineBar({
  selectedStage,
  counts,
  onSelectStage,
}: PipelineBarProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {STAGES.map((stage) => {
          const isSelected = stage === selectedStage;
          return (
            <TouchableOpacity
              key={stage}
              style={[
                styles.segment,
                { borderBottomColor: Colors.stage[stage] },
                isSelected && styles.segmentSelected,
              ]}
              onPress={() => onSelectStage(stage)}
              accessibilityLabel={`${stage} tab, ${counts[stage]} insights${isSelected ? ", selected" : ""}`}
              accessibilityRole="tab"
            >
              <Text
                style={[
                  styles.stageName,
                  isSelected && { color: Colors.stage[stage] },
                ]}
              >
                {stage}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: Colors.stage[stage] },
                ]}
              >
                <Text style={styles.countText}>{counts[stage]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  container: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    gap: 8,
  },
  segmentSelected: {
    borderBottomWidth: 3,
    backgroundColor: "#eff6fc",
  },
  stageName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  countText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
});
