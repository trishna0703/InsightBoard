import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
import { DateRange } from "../../hooks/useAnalyticsData";

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 365 },
];

interface DateRangePickerProps {
  dateRange: DateRange;
  onChangeRange: (range: DateRange) => void;
}

export default function DateRangePicker({
  dateRange,
  onChangeRange,
}: DateRangePickerProps) {
  const getDays = () => {
    return Math.round(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24),
    );
  };

  return (
    <View style={styles.container}>
      {PRESETS.map((preset) => {
        const isActive = getDays() === preset.days;
        return (
          <TouchableOpacity
            key={preset.label}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => {
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - preset.days);
              onChangeRange({ start, end });
            }}
            accessibilityLabel={`Show last ${preset.label}`}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
});
