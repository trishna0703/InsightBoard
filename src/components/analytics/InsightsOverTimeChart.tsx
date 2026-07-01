import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { WeeklyBucket } from "../../utils/analyticsUtils";
import { Colors } from "../../constants/colors";

interface InsightsOverTimeChartProps {
  data: WeeklyBucket[];
}

interface TimeBarProps {
  bucket: WeeklyBucket;
  targetHeight: number;
  index: number;
}

function TimeBar({ bucket, targetHeight, index }: TimeBarProps) {
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (targetHeight === 0) return;
    heightAnim.setValue(0);
    Animated.timing(heightAnim, {
      toValue: targetHeight,
      duration: 500,
      delay: index * 60,
      useNativeDriver: false,
    }).start();
  }, [targetHeight]);

  const animatedHeight =
    targetHeight > 0
      ? heightAnim.interpolate({
          inputRange: [0, targetHeight],
          outputRange: ["0%", `${targetHeight}%`],
        })
      : "0%";

  return (
    <View style={styles.column}>
      <Text style={styles.count}>
        {bucket.count > 0 ? bucket.count : ""}
      </Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.bar, { height: animatedHeight }]} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {bucket.week}
      </Text>
    </View>
  );
}

export default function InsightsOverTimeChart({
  data,
}: InsightsOverTimeChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      {data.map((bucket, i) => {
        const targetHeight = Math.max(
          (bucket.count / max) * 100,
          bucket.count > 0 ? 4 : 0,
        );
        return (
          <TimeBar
            key={bucket.week}
            bucket={bucket}
            targetHeight={targetHeight}
            index={i}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 160,
    gap: 4,
  },
  column: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  count: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: 2,
    height: 14,
  },
  barTrack: {
    flex: 1,
    width: "80%",
    justifyContent: "flex-end",
    maxHeight: 110,
  },
  bar: {
    width: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: 4,
    minHeight: 2,
  },
  label: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    width: "100%",
  },
});
