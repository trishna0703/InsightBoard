import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: number;
  subtitle?: string;
}

export default function KPICard({
  title,
  value,
  delta,
  subtitle,
}: KPICardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {delta !== undefined && (
        <Text
          style={[
            styles.delta,
            { color: delta >= 0 ? Colors.system.success : Colors.system.error },
          ]}
        >
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} vs last 7d
        </Text>
      )}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: "45%",
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  title: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginBottom: 6,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  delta: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
