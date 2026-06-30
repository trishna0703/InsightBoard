import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InsightActivity } from '../../types';
import { Colors } from '../../constants/colors';
import { getRelativeTime } from '../../utils/dateUtils';

interface ActivityTimelineProps {
  activities: InsightActivity[];
}

const FIELD_LABELS: Record<string, string> = {
  title: 'updated title',
  description: 'updated description',
  priority: 'changed priority',
  stage: 'moved to',
  drugName: 'updated drug name',
  hcp: 'updated HCP',
  category: 'changed category',
  tags: 'updated tags',
};

function activitySummary(activity: InsightActivity): string {
  if (activity.action === 'created') return 'created this insight';
  if (activity.action === 'moved') return `moved to ${activity.newValue ?? 'new stage'}`;

  // Treat null, JS-undefined, and the string "undefined" as unknown — all
  // result from missing or corrupt fieldName data and should fall back gracefully.
  const fieldName =
    activity.fieldName && activity.fieldName !== 'undefined'
      ? activity.fieldName
      : null;

  if (fieldName === 'stage' && activity.newValue) return `moved to ${activity.newValue}`;

  const label = fieldName
    ? (FIELD_LABELS[fieldName] ?? `updated ${fieldName}`)
    : 'updated this insight';

  return activity.newValue ? `${label}: "${activity.newValue}"` : label;
}

export default function ActivityTimeline({
  activities,
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Text style={styles.empty}>No activity yet.</Text>
    );
  }

  return (
    <View style={styles.container}>
      {activities.map((a, index) => (
        <View key={a.id} style={styles.entry}>
          <View style={styles.dotCol}>
            <View style={styles.dot} />
            {index < activities.length - 1 && (
              <View style={styles.line} />
            )}
          </View>
          <View style={styles.content}>
            <Text style={styles.summary}>
              <Text style={styles.user}>{a.userName} </Text>
              {activitySummary(a)}
            </Text>
            <Text style={styles.time}>{getRelativeTime(a.createdAt)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  empty: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  entry: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 40,
  },
  dotCol: {
    alignItems: 'center',
    width: 12,
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary[500],
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingBottom: 16,
    gap: 2,
  },
  summary: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  user: {
    fontWeight: '600',
    color: Colors.primary[700],
  },
  time: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
