import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Tag } from '../../types';
import { Colors } from '../../constants/colors';
import { useTags } from '../../hooks/useTags';

interface TagMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function TagMultiSelect({
  selectedIds,
  onChange,
}: TagMultiSelectProps) {
  const { tags, loading } = useTags();

  const toggle = (tag: Tag) => {
    if (selectedIds.includes(tag.id)) {
      onChange(selectedIds.filter((id) => id !== tag.id));
    } else {
      onChange([...selectedIds, tag.id]);
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color={Colors.primary[500]} />;
  }

  return (
    <View style={styles.wrap}>
      {tags.map((tag) => {
        const selected = selectedIds.includes(tag.id);
        return (
          <TouchableOpacity
            key={tag.id}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => toggle(tag)}
            accessibilityLabel={`Tag: ${tag.name}, ${selected ? 'selected' : 'not selected'}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          >
            <Text
              style={[styles.chipText, selected && styles.chipTextSelected]}
            >
              {tag.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[500] + '18',
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary[700],
    fontWeight: '600',
  },
});
