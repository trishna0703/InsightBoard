import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { HCP } from '../../types';
import { Colors } from '../../constants/colors';
import { useHCPs } from '../../hooks/useHCPs';

interface HCPAutocompleteProps {
  selectedId: string | null;
  /** Pass the full HCP object in edit mode so the chip renders before the
   *  user searches (the query is skipped when idle). */
  preloadedHCP?: HCP | null;
  onChange: (id: string | null) => void;
}

export default function HCPAutocomplete({
  selectedId,
  preloadedHCP,
  onChange,
}: HCPAutocompleteProps) {
  const { hcps, loading, search, setSearch } = useHCPs();

  // Store the full HCP object locally so the chip stays visible after the
  // query is skipped (once search is cleared on selection, hcps[] becomes
  // empty, making hcps.find() return undefined and collapsing the chip).
  const [localHCP, setLocalHCP] = useState<HCP | null>(preloadedHCP ?? null);

  // Sync when preloadedHCP arrives (edit mode, where the prop may be null
  // on first render and populated once useInsightDetail resolves).
  useEffect(() => {
    if (preloadedHCP && !localHCP) setLocalHCP(preloadedHCP);
  }, [preloadedHCP, localHCP]);

  // If the parent clears selectedId (e.g. form reset), clear local state too.
  useEffect(() => {
    if (!selectedId) setLocalHCP(null);
  }, [selectedId]);

  const handleSelect = useCallback(
    (hcp: HCP) => {
      onChange(hcp.id);
      setLocalHCP(hcp);
      setSearch('');
    },
    [onChange, setSearch],
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setLocalHCP(null);
    setSearch('');
  }, [onChange, setSearch]);

  const showResults = search.trim().length > 0;

  return (
    <View style={styles.container}>
      {localHCP ? (
        <View style={styles.selectedRow}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName}>{localHCP.name}</Text>
            <Text style={styles.selectedMeta}>
              {localHCP.specialty} · {localHCP.institution}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            accessibilityLabel="Clear HCP selection"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Type to search HCP by name…"
            placeholderTextColor={Colors.textSecondary}
            accessibilityLabel="Search HCP"
            autoCorrect={false}
            returnKeyType="search"
          />

          {showResults && (
            <View style={styles.dropdown}>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.primary[500]}
                  style={styles.spinner}
                />
              ) : hcps.length === 0 ? (
                <Text style={styles.noResults}>No HCPs found for "{search}"</Text>
              ) : (
                <ScrollView
                  style={styles.list}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {hcps.map((hcp) => (
                    <TouchableOpacity
                      key={hcp.id}
                      style={styles.listItem}
                      onPress={() => handleSelect(hcp)}
                      accessibilityLabel={`Select HCP ${hcp.name}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.listName}>{hcp.name}</Text>
                      <Text style={styles.listMeta}>
                        {hcp.specialty} · {hcp.institution}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  spinner: { margin: 12 },
  noResults: {
    fontSize: 13,
    color: Colors.textSecondary,
    padding: 12,
    fontStyle: 'italic',
  },
  list: { maxHeight: 200 },
  listItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  listName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  listMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500] + '12',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  selectedInfo: { flex: 1, gap: 2 },
  selectedName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  selectedMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, color: Colors.textSecondary },
});
