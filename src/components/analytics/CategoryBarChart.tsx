import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { CategoryCount } from "../../utils/analyticsUtils";
import { Colors } from "../../constants/colors";

interface CategoryBarChartProps {
  data: CategoryCount[];
}

const CATEGORY_COLORS = [
  Colors.primary[500],
  Colors.primary[700],
  "#009688",
  "#FF5722",
  "#9C27B0",
  "#FF9800",
];

interface CategoryBarProps {
  item: CategoryCount;
  percentage: number;
  color: string;
  index: number;
}

function CategoryBar({ item, percentage, color, index }: CategoryBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    widthAnim.setValue(0);
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 500,
      delay: index * 80,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, percentage],
    outputRange: ["0%", `${percentage}%`],
  });

  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.bar, { width: animatedWidth, backgroundColor: color }]}
        >
          <Text style={styles.countInside}>{item.count}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => (
        <CategoryBar
          key={item.name}
          item={item}
          percentage={Math.max((item.count / max) * 100, 4)}
          color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
          index={i}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
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
    flexShrink: 0,
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
    minWidth: 32,
  },
  countInside: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
});
