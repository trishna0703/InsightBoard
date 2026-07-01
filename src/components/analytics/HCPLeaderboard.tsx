import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { HCPCount } from "../../utils/analyticsUtils";
import { Colors } from "../../constants/colors";

interface HCPLeaderboardProps {
  data: HCPCount[];
}

export default function HCPLeaderboard({ data }: HCPLeaderboardProps) {
  if (data.length === 0) {
    return <Text style={styles.empty}>No HCP data available</Text>;
  }

  const max = data[0].count;

  return (
    <View style={styles.container}>
      {data.map((hcp, i) => (
        <View key={hcp.name} style={styles.row}>
          <Text style={styles.rank}>#{i + 1}</Text>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {hcp.name}
            </Text>
            <View style={styles.barContainer}>
              <View
                style={[styles.bar, { width: `${(hcp.count / max) * 100}%` }]}
              />
            </View>
          </View>
          <Text style={styles.count}>{hcp.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rank: {
    width: 24,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  info: { flex: 1, gap: 4 },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  barContainer: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
  },
  bar: {
    height: 6,
    backgroundColor: Colors.primary[500],
    borderRadius: 3,
  },
  count: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary[500],
    width: 24,
    textAlign: "right",
  },
  empty: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
