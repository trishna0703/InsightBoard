import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Colors } from "../../constants/colors";
import { InsightStage } from "../../types";

const STAGES: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];

interface FunnelChartProps {
  byStage: Record<InsightStage, number>;
}

interface FunnelBarProps {
  stage: InsightStage;
  count: number;
  percentage: number;
  color: string;
  index: number;
}

function FunnelBar({ stage, count, percentage, color, index }: FunnelBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    widthAnim.setValue(0);
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 500,
      delay: index * 100,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, percentage],
    outputRange: ["0%", `${percentage}%`],
  });

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{stage}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.bar, { width: animatedWidth, backgroundColor: color }]}
        >
          <Text style={styles.countInside}>{count}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export default function FunnelChart({ byStage }: FunnelChartProps) {
  const max = Math.max(...Object.values(byStage), 1);

  return (
    <View style={styles.container}>
      {STAGES.map((stage, index) => {
        const count = byStage[stage];
        const percentage = Math.max((count / max) * 100, 8);
        return (
          <FunnelBar
            key={stage}
            stage={stage}
            count={count}
            percentage={percentage}
            color={Colors.stage[stage]}
            index={index}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    width: 90,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  barTrack: {
    flex: 1,
    height: 32,
    backgroundColor: Colors.background,
    borderRadius: 8,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 10,
  },
  countInside: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
