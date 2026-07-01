import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Colors } from "../../constants/colors";
import { ConflictField } from "../../hooks/useUpdateInsight";

export type { ConflictField };

interface ConflictModalProps {
  visible: boolean;
  fields: ConflictField[];
  onKeepMine: () => void;
  onKeepTheirs: () => void;
  onMerge: (choices: Record<string, "mine" | "theirs">) => void;
  onDismiss: () => void;
}

export default function ConflictModal({
  visible,
  fields,
  onKeepMine,
  onKeepTheirs,
  onMerge,
  onDismiss,
}: ConflictModalProps) {
  const [merging, setMerging] = useState(false);
  const [choices, setChoices] = useState<Record<string, "mine" | "theirs">>({});

  const startMerge = () => {
    const initial: Record<string, "mine" | "theirs"> = {};
    fields.forEach((f) => { initial[f.field] = "mine"; });
    setChoices(initial);
    setMerging(true);
  };

  const handleDismiss = () => {
    setMerging(false);
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>⚠️ Edit Conflict</Text>
          <Text style={styles.subtitle}>
            Someone else saved changes while you were editing.
          </Text>

          <ScrollView style={styles.fieldsScroll}>
            {merging ? (
              // Per-field choice UI
              fields.map((f) => (
                <View key={f.field} style={styles.fieldRow}>
                  <Text style={styles.fieldName}>{f.field}</Text>
                  <View style={styles.compareRow}>
                    <TouchableOpacity
                      style={[
                        styles.choiceBox,
                        styles.mine,
                        choices[f.field] === "mine" && styles.choiceSelected,
                      ]}
                      onPress={() =>
                        setChoices((c) => ({ ...c, [f.field]: "mine" }))
                      }
                    >
                      <Text style={styles.valueLabel}>
                        Yours {choices[f.field] === "mine" ? "✓" : ""}
                      </Text>
                      <Text style={styles.valueText} numberOfLines={3}>
                        {f.mine}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.choiceBox,
                        styles.theirs,
                        choices[f.field] === "theirs" && styles.choiceSelected,
                      ]}
                      onPress={() =>
                        setChoices((c) => ({ ...c, [f.field]: "theirs" }))
                      }
                    >
                      <Text style={styles.valueLabel}>
                        Theirs {choices[f.field] === "theirs" ? "✓" : ""}
                      </Text>
                      <Text style={styles.valueText} numberOfLines={3}>
                        {f.theirs}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              // Read-only comparison
              fields.map((f) => (
                <View key={f.field} style={styles.fieldRow}>
                  <Text style={styles.fieldName}>{f.field}</Text>
                  <View style={styles.compareRow}>
                    <View style={[styles.valueBox, styles.mine]}>
                      <Text style={styles.valueLabel}>Yours</Text>
                      <Text style={styles.valueText} numberOfLines={3}>
                        {f.mine}
                      </Text>
                    </View>
                    <View style={[styles.valueBox, styles.theirs]}>
                      <Text style={styles.valueLabel}>Theirs</Text>
                      <Text style={styles.valueText} numberOfLines={3}>
                        {f.theirs}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {merging ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.mergeBtn]}
                onPress={() => {
                  setMerging(false);
                  onMerge(choices);
                }}
                accessibilityLabel="Apply merge"
              >
                <Text style={styles.actionBtnText}>Apply Merge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelMergeBtn]}
                onPress={() => setMerging(false)}
                accessibilityLabel="Back"
              >
                <Text style={styles.actionBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.mineBtn]}
                onPress={onKeepMine}
                accessibilityLabel="Keep my changes"
              >
                <Text style={styles.actionBtnText}>Keep Mine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.theirsBtn]}
                onPress={onKeepTheirs}
                accessibilityLabel="Keep their changes"
              >
                <Text style={styles.actionBtnText}>Keep Theirs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.mergeBtn]}
                onPress={startMerge}
                accessibilityLabel="Merge changes"
              >
                <Text style={styles.actionBtnText}>Merge</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxHeight: "85%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  fieldsScroll: { maxHeight: 300 },
  fieldRow: { marginBottom: 16 },
  fieldName: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  compareRow: { flexDirection: "row", gap: 8 },
  valueBox: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
  },
  choiceBox: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  choiceSelected: {
    borderColor: Colors.primary[500],
  },
  mine: { backgroundColor: Colors.primary[500] + "15" },
  theirs: { backgroundColor: Colors.system.warning + "20" },
  valueLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    color: Colors.textSecondary,
  },
  valueText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  mineBtn: { backgroundColor: Colors.primary[500] },
  theirsBtn: { backgroundColor: Colors.system.warning },
  mergeBtn: { backgroundColor: Colors.system.success },
  cancelMergeBtn: { backgroundColor: Colors.textSecondary },
  actionBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 12,
  },
  dismissBtn: { marginTop: 12, alignItems: "center" },
  dismissText: { color: Colors.textSecondary, fontSize: 13 },
});
