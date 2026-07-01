import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useAnalyticsData, DateRange } from "../hooks/useAnalyticsData";
import { useCurrentUser } from "../hooks/useCurrentUser";
import KPICard from "../components/analytics/KPICard";
import DateRangePicker from "../components/analytics/DateRangePicker";
import FunnelChart from "../components/analytics/FunnelChart";
import InsightsOverTimeChart from "../components/analytics/InsightsOverTimeChart";
import CategoryBarChart from "../components/analytics/CategoryBarChart";
import PriorityHeatmap from "../components/analytics/PriorityHeatmap";
import HCPLeaderboard from "../components/analytics/HCPLeaderboard";
import { Colors } from "../constants/colors";
import LazyView from "../components/common/LazyView";
import ExportButton from "../components/analytics/ExportButton";

const SCREEN_HEIGHT = Dimensions.get("window").height;

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AnalyticsScreen() {
  const currentUser = useCurrentUser();
  const [scrollY, setScrollY] = useState(0);

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  const { kpis, charts, insights, loading, error, refetch } =
    useAnalyticsData(dateRange);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load analytics</Text>
        <TouchableOpacity onPress={refetch}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      scrollEventThrottle={200}
      onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refetch}
          colors={[Colors.primary[500]]}
          tintColor={Colors.primary[500]}
        />
      }
    >
      {/* Date Range Picker */}
      <DateRangePicker dateRange={dateRange} onChangeRange={setDateRange} />

      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading analytics…</Text>
        </View>
      )}

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <KPICard title="Total Insights" value={kpis.total} delta={kpis.delta} />
        <KPICard title="Avg Pipeline Time" value={`${kpis.avgPipelineTime}d`} />
        <KPICard title="Most Active HCP" value={kpis.mostActiveHCP} />
        <KPICard
          title="Reached Impact"
          value={kpis.byStage.Impact}
          subtitle="insights"
        />
      </View>

      <LazyView scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
        <SectionCard title="Pipeline Funnel">
          <FunnelChart byStage={kpis.byStage} />
        </SectionCard>
      </LazyView>

      <LazyView scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
        <SectionCard title="Insights Over Time">
          {charts.weeklyBuckets.some((b) => b.count > 0) ? (
            <InsightsOverTimeChart data={charts.weeklyBuckets} />
          ) : (
            <Text style={styles.emptyText}>No data available</Text>
          )}
        </SectionCard>
      </LazyView>

      <LazyView scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
        <SectionCard title="By Category">
          {charts.categoryDistribution.length > 0 ? (
            <CategoryBarChart data={charts.categoryDistribution} />
          ) : (
            <Text style={styles.emptyText}>No data available</Text>
          )}
        </SectionCard>
      </LazyView>

      <LazyView scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
        <SectionCard title="Priority × Stage Heatmap">
          <PriorityHeatmap data={charts.priorityHeatmap} />
        </SectionCard>
      </LazyView>

      <LazyView scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
        <SectionCard title="HCP Leaderboard">
          <HCPLeaderboard data={charts.hcpLeaderboard} />
        </SectionCard>
      </LazyView>

      <ExportButton
        insights={insights}
        kpis={kpis}
        dateRange={dateRange}
        userName={currentUser?.name ?? "Unknown"}
      />
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: Colors.system.error, fontSize: 16, marginBottom: 8 },
  retryText: { color: Colors.primary[500], fontSize: 14 },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
  bottomPadding: { height: 40 },
});
