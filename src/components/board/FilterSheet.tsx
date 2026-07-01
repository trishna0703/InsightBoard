import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@apollo/client";
import { LIST_CATEGORIES, LIST_TAGS } from "../../graphql/queries/tags";
import { LIST_HCPS } from "../../graphql/queries/hcps";
import { FilterInput, DEFAULT_FILTER } from "../../hooks/useInsights";
import { Priority, CategoryRecord, Tag } from "../../types";
import { Colors } from "../../constants/colors";

const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function todayStr() {
  return formatDate(new Date());
}

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

function parseDate(str: string | null | undefined): Date {
  return str ? new Date(str) : new Date();
}

// ── iOS date picker shown in a modal overlay ──────────────────────────────
interface IOSDateModalProps {
  visible: boolean;
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  onDone: () => void;
}

function IOSDateModal({
  visible,
  label,
  value,
  onChange,
  onDone,
}: IOSDateModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.dateOverlay}>
        <View style={styles.dateSheet}>
          <View style={styles.dateSheetHeader}>
            <Text style={styles.dateSheetLabel}>{label}</Text>
            <TouchableOpacity onPress={onDone} accessibilityLabel="Done">
              <Text style={styles.dateSheetDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            onChange={(_, selected) => {
              if (selected) onChange(selected);
            }}
            style={styles.iosSpinner}
          />
        </View>
      </View>
    </Modal>
  );
}

interface FilterSheetProps {
  filters: FilterInput;
  onChange: (f: FilterInput) => void;
}

export default function FilterSheet({ filters, onChange }: FilterSheetProps) {
  const [hcpSearch, setHcpSearch] = useState(filters.hcpName ?? "");
  const [showHcpSuggestions, setShowHcpSuggestions] = useState(false);

  // Which picker is open: null | 'from' | 'to'
  const [activePicker, setActivePicker] = useState<null | "from" | "to">(null);

  // Temp date held while iOS spinner is open — committed on Done
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const { data: catData } = useQuery<{
    categoriesCollection: { edges: { node: CategoryRecord }[] };
  }>(LIST_CATEGORIES, { fetchPolicy: "cache-first" });

  const { data: tagData } = useQuery<{
    tagsCollection: { edges: { node: Tag }[] };
  }>(LIST_TAGS, { fetchPolicy: "cache-first" });

  const { data: hcpData, loading: hcpLoading } = useQuery<{
    hcpsCollection: {
      edges: {
        node: {
          id: string;
          name: string;
          specialty: string;
          institution: string;
        };
      }[];
    };
  }>(LIST_HCPS, {
    variables: { search: hcpSearch.length >= 2 ? `%${hcpSearch}%` : null },
    skip: hcpSearch.length < 2,
    fetchPolicy: "cache-and-network",
  });

  const categories = useMemo(
    () => catData?.categoriesCollection?.edges?.map((e) => e.node) ?? [],
    [catData],
  );
  const tags = useMemo(
    () => tagData?.tagsCollection?.edges?.map((e) => e.node) ?? [],
    [tagData],
  );
  const hcpSuggestions = useMemo(
    () => hcpData?.hcpsCollection?.edges?.map((e) => e.node) ?? [],
    [hcpData],
  );

  const set = (partial: Partial<FilterInput>) =>
    onChange({ ...filters, ...partial });

  const togglePriority = (p: Priority) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    set({ priorities: next });
  };

  const toggleTag = (id: string) => {
    const next = filters.tagIds.includes(id)
      ? filters.tagIds.filter((x) => x !== id)
      : [...filters.tagIds, id];
    set({ tagIds: next });
  };

  const clearHcp = () => {
    setHcpSearch("");
    setShowHcpSuggestions(false);
    set({ hcpId: null, hcpName: null });
  };

  const openPicker = (field: "from" | "to") => {
    const current =
      field === "from"
        ? parseDate(filters.dateFrom)
        : parseDate(filters.dateTo);
    setTempDate(current);
    setActivePicker(field);
  };

  const commitDate = () => {
    if (activePicker === "from") {
      set({ dateFrom: formatDate(tempDate) });
    } else if (activePicker === "to") {
      set({ dateTo: formatDate(tempDate) });
    }
    setActivePicker(null);
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headingWrapper}>
          <Text style={styles.heading}>Filter Insights</Text>
          {/* Reset */}
          <TouchableOpacity
            onPress={() => {
              setHcpSearch("");
              setShowHcpSuggestions(false);
              onChange(DEFAULT_FILTER);
            }}
            accessibilityLabel="Reset all filters"
          >
            <Text style={styles.resetText}>Reset all</Text>
          </TouchableOpacity>
        </View>

        {/* ── Date Range ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>DATE RANGE</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateField}
            onPress={() => openPicker("from")}
            accessibilityLabel="Select from date"
          >
            <Text style={styles.dateLabel}>From</Text>
            <View style={styles.dateInput}>
              <Text
                style={{
                  color: filters.dateFrom
                    ? Colors.textPrimary
                    : Colors.textSecondary,
                  fontSize: 13,
                }}
              >
                {filters.dateFrom ?? "Select date"}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dateSep} />

          <TouchableOpacity
            style={styles.dateField}
            onPress={() => openPicker("to")}
            accessibilityLabel="Select to date"
          >
            <Text style={styles.dateLabel}>To</Text>
            <View style={styles.dateInput}>
              <Text
                style={{
                  color: filters.dateTo
                    ? Colors.textPrimary
                    : Colors.textSecondary,
                  fontSize: 13,
                }}
              >
                {filters.dateTo ?? "Select date"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick presets */}
        <View style={styles.presetRow}>
          {[7, 30, 90].map((days) => {
            const active =
              filters.dateFrom === daysAgoStr(days) &&
              filters.dateTo === todayStr();
            return (
              <TouchableOpacity
                key={days}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() =>
                  set({ dateFrom: daysAgoStr(days), dateTo: todayStr() })
                }
              >
                <Text
                  style={[styles.presetText, active && styles.presetTextActive]}
                >
                  Last {days}d
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Priority ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PRIORITY</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map((p) => {
            const active = filters.priorities.includes(p);
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: Colors.priority[p],
                    borderColor: Colors.priority[p],
                  },
                ]}
                onPress={() => togglePriority(p)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Category ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <View style={styles.chipRow}>
          {categories.map((cat) => {
            const active = filters.categoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: cat.color + "dd",
                    borderColor: cat.color,
                  },
                ]}
                onPress={() => set({ categoryId: active ? null : cat.id })}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── HCP ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>HCP</Text>
        {filters.hcpId ? (
          <View style={styles.hcpSelected}>
            <Text style={styles.hcpSelectedName}>{filters.hcpName}</Text>
            <TouchableOpacity
              onPress={clearHcp}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.hcpClear}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="Search HCP name…"
              placeholderTextColor={Colors.textSecondary}
              value={hcpSearch}
              onChangeText={(v) => {
                setHcpSearch(v);
                setShowHcpSuggestions(v.length >= 2);
              }}
              onFocus={() => setShowHcpSuggestions(hcpSearch.length >= 2)}
            />
            {showHcpSuggestions && (
              <View style={styles.suggestions}>
                {hcpLoading && (
                  <ActivityIndicator
                    size="small"
                    color={Colors.primary[500]}
                    style={{ padding: 8 }}
                  />
                )}
                {!hcpLoading && hcpSuggestions.length === 0 && (
                  <Text style={styles.noResults}>No HCPs found</Text>
                )}
                {hcpSuggestions.map((hcp) => (
                  <TouchableOpacity
                    key={hcp.id}
                    style={styles.suggestionRow}
                    onPress={() => {
                      set({ hcpId: hcp.id, hcpName: hcp.name });
                      setHcpSearch(hcp.name);
                      setShowHcpSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionName}>{hcp.name}</Text>
                    <Text style={styles.suggestionSub}>
                      {hcp.specialty} · {hcp.institution}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Tags ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>TAGS</Text>
        <View style={styles.chipRow}>
          {tags.map((tag) => {
            const active = filters.tagIds.includes(tag.id);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleTag(tag.id)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {tag.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {Platform.OS === "ios" && activePicker !== null && (
        <View style={styles.iosPickerContainer}>
          <View style={styles.dateSheetHeader}>
            <Text style={styles.dateSheetLabel}>
              {activePicker === "from" ? "From Date" : "To Date"}
            </Text>
            <TouchableOpacity onPress={commitDate} accessibilityLabel="Done">
              <Text style={styles.dateSheetDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            textColor={Colors.textPrimary}
            onChange={(_, selected) => {
              if (selected) setTempDate(selected);
            }}
            style={{ height: 200, width: "100%" }}
          />
        </View>
      )}
      {/* Android — inline picker, no modal needed */}
      {Platform.OS === "android" && activePicker !== null && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setActivePicker(null);
            if (selected) {
              if (activePicker === "from")
                set({ dateFrom: formatDate(selected) });
              else set({ dateTo: formatDate(selected) });
            }
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 600, width: "auto" },
  headingWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resetText: { fontSize: 13, color: Colors.system.error, fontWeight: "600" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  presetChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  presetChipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  presetText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  presetTextActive: { color: Colors.white },
  dateSep: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginTop: 20,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  chipText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  suggestions: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  suggestionName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  suggestionSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  noResults: {
    fontSize: 13,
    color: Colors.textSecondary,
    padding: 12,
    textAlign: "center",
  },
  hcpSelected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[500] + "15",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  hcpSelectedName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary[700],
  },
  hcpClear: { fontSize: 14, color: Colors.textSecondary, fontWeight: "700" },
  // iOS date modal
  dateOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  dateSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  dateSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dateSheetLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  dateSheetDone: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary[500],
  },
  iosPickerContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 20,
  },
  iosSpinner: { height: 200 },
});
