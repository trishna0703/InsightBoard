import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Modal,
} from "react-native";
import { generateAndSharePDF } from "../../services/pdfExport";
import { Insight, InsightStage } from "../../types";
import { Colors } from "../../constants/colors";

interface ExportButtonProps {
  insights: Insight[];
  kpis: {
    total: number;
    delta: number;
    avgPipelineTime: number;
    mostActiveHCP: string;
    byStage: Record<InsightStage, number>;
  };
  dateRange: { start: Date; end: Date };
  userName: string;
}

export default function ExportButton({
  insights,
  kpis,
  dateRange,
  userName,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleExport = async () => {
    setLoading(true);

    // Safety timeout — always dismiss after 30s no matter what
    const timeout = setTimeout(() => {
      setLoading(false);
      setProgress("");
    }, 30000);

    try {
      await generateAndSharePDF({
        insights,
        kpis,
        dateRange,
        userName,
        onProgress: setProgress,
      });
    } catch (err) {
      console.log("Export dismissed or failed:", err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleExport}
        disabled={loading}
        accessibilityLabel="Export report as PDF"
      >
        <Text style={styles.icon}>📄</Text>
        <Text style={styles.label}>Export Report</Text>
      </TouchableOpacity>

      {/* Progress modal */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.progressText}>{progress}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[500],
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginBottom: 16,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  icon: { fontSize: 18 },
  label: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    minWidth: 200,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
