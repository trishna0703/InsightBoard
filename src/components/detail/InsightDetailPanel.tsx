import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Insight, InsightStage } from '../../types';
import { Colors } from '../../constants/colors';
import { getRelativeTime } from '../../utils/dateUtils';
import ActivityTimeline from './ActivityTimeline';

const STAGE_ORDER: InsightStage[] = [
  'Observation',
  'Insight',
  'Actionable',
  'Impact',
];

interface InsightDetailPanelProps {
  insight: Insight | null;
  loading: boolean;
  onEdit: () => void;
  onMove: (targetStage: InsightStage) => void;
  /** Field names currently highlighted yellow (remote user just edited them). */
  highlightedFields?: string[];
}

function FieldRow({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, highlighted && styles.highlightRow]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export default function InsightDetailPanel({
  insight,
  loading,
  onEdit,
  onMove,
  highlightedFields = [],
}: InsightDetailPanelProps) {
  const hl = (field: string) => highlightedFields.includes(field);
  if (loading && !insight) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!insight) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Insight not found.</Text>
      </View>
    );
  }

  const moveTargets = STAGE_ORDER.filter((s) => s !== insight.stage);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: Colors.priority[insight.priority] },
            ]}
          >
            <Text style={styles.priorityText}>{insight.priority}</Text>
          </View>
          <View
            style={[
              styles.stageBadge,
              { backgroundColor: Colors.stage[insight.stage] + '22' },
            ]}
          >
            <Text
              style={[
                styles.stageText,
                { color: Colors.stage[insight.stage] },
              ]}
            >
              {insight.stage}
            </Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {getRelativeTime(insight.updatedAt)}
        </Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, hl('title') && styles.highlightText]}>
        {insight.title}
      </Text>

      {/* Description */}
      <Text style={[styles.description, hl('description') && styles.highlightText]}>
        {insight.description}
      </Text>

      {/* Meta */}
      <View style={styles.metaBlock}>
        {insight.hcp && (
          <>
            <FieldRow label="HCP" value={insight.hcp.name} highlighted={hl('hcp')} />
            <FieldRow label="Specialty" value={insight.hcp.specialty} highlighted={hl('hcp')} />
            <FieldRow label="Institution" value={insight.hcp.institution} highlighted={hl('hcp')} />
          </>
        )}
        {insight.category && (
          <FieldRow label="Category" value={insight.category} highlighted={hl('category')} />
        )}
        {insight.drugName && (
          <FieldRow label="Drug" value={insight.drugName} highlighted={hl('drugName')} />
        )}
        {insight.tags.length > 0 && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={styles.tagsRow}>
              {insight.tags.map((t) => (
                <View key={t.id} style={styles.tagChip}>
                  <Text style={styles.tagText}>{t.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          accessibilityLabel="Edit insight"
          accessibilityRole="button"
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        {moveTargets.map((stage) => (
          <TouchableOpacity
            key={stage}
            style={[
              styles.moveBtn,
              { borderColor: Colors.stage[stage] },
            ]}
            onPress={() => onMove(stage)}
            accessibilityLabel={`Move insight to ${stage}`}
            accessibilityRole="button"
          >
            <Text
              style={[styles.moveBtnText, { color: Colors.stage[stage] }]}
            >
              → {stage}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Activity log */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <ActivityTimeline activities={insight.activities} />

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingTop: 8 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  empty: { color: Colors.textSecondary, fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  priorityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  stageBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stageText: { fontSize: 11, fontWeight: '600' },
  timestamp: { fontSize: 11, color: Colors.textSecondary },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    lineHeight: 28,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  metaBlock: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  highlightRow: {
    backgroundColor: '#FFF176',
    borderRadius: 4,
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
  highlightText: {
    backgroundColor: '#FFF176',
    borderRadius: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 90,
    flexShrink: 0,
  },
  fieldValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  tagsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
  },
  tagChip: {
    backgroundColor: Colors.primary[500] + '18',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary[700],
    fontWeight: '500',
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  editBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  editBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  moveBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  moveBtnText: { fontWeight: '600', fontSize: 13 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  bottomPad: { height: 40 },
});
