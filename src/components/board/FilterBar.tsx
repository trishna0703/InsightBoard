import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Priority } from "../../types";
import { Colors } from "../../constants/colors";

const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

interface FilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  selectedPriorities: Priority[];
  onTogglePriority: (priority: Priority) => void;
  onClearAll: () => void;
}

export default function FilterBar({
  search,
  onSearchChange,
  selectedPriorities,
  onTogglePriority,
  onClearAll,
}: FilterBarProps) {
  const hasActiveFilters = search.length > 0 || selectedPriorities.length > 0;

  return (
    <View style={styles.wrapper}>
      {/* Search input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search insights..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search insights"
        />
      </View>

      {/* Priority chips + clear all */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {PRIORITIES.map((priority) => {
          const isSelected = selectedPriorities.includes(priority);
          return (
            <TouchableOpacity
              key={priority}
              style={[
                styles.chip,
                isSelected && {
                  backgroundColor: Colors.priority[priority],
                  borderColor: Colors.priority[priority],
                },
              ]}
              onPress={() => onTogglePriority(priority)}
              accessibilityLabel={`Filter by ${priority}${isSelected ? ", active" : ""}`}
              accessibilityRole="checkbox"
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {priority}
              </Text>
            </TouchableOpacity>
          );
        })}

        {hasActiveFilters && (
          <TouchableOpacity
            style={styles.clearChip}
            onPress={onClearAll}
            accessibilityLabel="Clear all filters"
          >
            <Text style={styles.clearText}>✕ Clear all</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchRow: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipsRow: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  clearChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: Colors.system.error,
    backgroundColor: Colors.white,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.system.error,
  },
});
