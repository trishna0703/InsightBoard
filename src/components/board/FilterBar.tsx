import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Colors } from "../../constants/colors";

export interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  activeFilterCount: number;
  chips: ActiveChip[];
  onOpenSheet: () => void;
  onClearAll: () => void;
}

export default function FilterBar({
  search,
  onSearchChange,
  activeFilterCount,
  chips,
  onOpenSheet,
  onClearAll,
}: FilterBarProps) {
  return (
    <View style={styles.wrapper}>
      {/* Row 1: Search input + Filters button */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search insights…"
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search insights"
        />
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={onOpenSheet}
          accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
        >
          <Text style={styles.filterIcon}>⚙</Text>
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Row 2: Active filter chips */}
      {chips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={styles.activeChip}
              onPress={chip.onRemove}
              accessibilityLabel={`Remove ${chip.label} filter`}
            >
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <Text style={styles.activeChipX}> ✕</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={onClearAll}
            accessibilityLabel="Clear all filters"
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    height:40,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterIcon: { fontSize: 18 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9, color: Colors.white, fontWeight: "700" },
  chipsRow: {
    paddingHorizontal: 12,
    gap: 6,
    paddingBottom: 4,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primary[500] + "18",
    borderWidth: 1,
    borderColor: Colors.primary[500] + "55",
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary[700],
  },
  activeChipX: {
    fontSize: 10,
    color: Colors.primary[500],
    fontWeight: "700",
  },
  clearAllBtn: {
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.system.error,
    textDecorationLine: "underline",
  },
});
