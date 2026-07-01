import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Insight, InsightStage } from "../../types";
import { Colors } from "../../constants/colors";

const STAGE_ORDER: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];

interface MoveActionSheetProps {
  visible: boolean;
  insight: Insight | null;
  onMoveTo: (insight: Insight, stage: InsightStage) => void;
  onReorder: (insight: Insight) => void;
  onClose: () => void;
}

/**
 * Accessible long-press alternative to swipe (baseline A11Y requirement):
 * choose a destination stage without gestures, or enter drag-to-reorder mode
 * (Module 6.2). Every row is a labelled button for screen readers.
 */
export default function MoveActionSheet({
  visible,
  insight,
  onMoveTo,
  onReorder,
  onClose,
}: MoveActionSheetProps) {
  if (!insight) return null;

  const targets = STAGE_ORDER.filter((s) => s !== insight.stage);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Dismiss menu"
      >
        <Pressable style={styles.sheet}>
          <Text style={styles.title} numberOfLines={1}>
            {insight.title}
          </Text>
          <Text style={styles.subtitle}>Move to…</Text>

          {targets.map((stage) => (
            <TouchableOpacity
              key={stage}
              style={styles.row}
              onPress={() => onMoveTo(insight, stage)}
              accessibilityRole="button"
              accessibilityLabel={`Move to ${stage}`}
            >
              <View
                style={[
                  styles.stageDot,
                  { backgroundColor: Colors.stage[stage] },
                ]}
              />
              <Text style={styles.rowText}>{stage}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => onReorder(insight)}
            accessibilityRole="button"
            accessibilityLabel="Reorder cards within this stage"
          >
            <Text style={styles.rowIcon}>↕</Text>
            <Text style={styles.rowText}>Reorder cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rowIcon: {
    fontSize: 16,
    width: 18,
    textAlign: "center",
    color: Colors.primary[500],
  },
  rowText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
});
