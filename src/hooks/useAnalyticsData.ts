import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { GET_KPI_COUNTS } from "../graphql/queries/analytics";
import { usePaginatedInsights } from "./usePaginatedInsights";
import {
  computeWeeklyBuckets,
  computeCategoryDistribution,
  computeHCPLeaderboard,
  computeMostActiveHCP,
  computeAvgPipelineTime,
  computePriorityStageHeatmap,
} from "../utils/analyticsUtils";

export interface DateRange {
  start: Date;
  end: Date;
}

export function useAnalyticsData(dateRange: DateRange) {
  const prevStart = new Date(dateRange.start);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(dateRange.start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  // Server-side counts for KPI cards
  const {
    data: kpiData,
    loading: kpiLoading,
    refetch: refetchKpi,
  } = useQuery<{
    total: { totalCount: number };
    prevTotal: { totalCount: number };
    observation: { totalCount: number };
    insight: { totalCount: number };
    actionable: { totalCount: number };
    impact: { totalCount: number };
  }>(GET_KPI_COUNTS, {
    variables: {
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      prevStartDate: prevStart.toISOString(),
      prevEndDate: prevEnd.toISOString(),
    },
  });

  // All insights for client-side chart computation
  const {
    insights,
    loading: insightsLoading,
    error,
    refetch: refetchInsights,
  } = usePaginatedInsights({ start: dateRange.start, end: dateRange.end });

  // KPI values
  const kpis = useMemo(
    () => ({
      total: kpiData?.total?.totalCount ?? 0,
      delta:
        (kpiData?.total?.totalCount ?? 0) -
        (kpiData?.prevTotal?.totalCount ?? 0),
      byStage: {
        Observation: kpiData?.observation?.totalCount ?? 0,
        Insight: kpiData?.insight?.totalCount ?? 0,
        Actionable: kpiData?.actionable?.totalCount ?? 0,
        Impact: kpiData?.impact?.totalCount ?? 0,
      },
      avgPipelineTime: computeAvgPipelineTime(insights),
      mostActiveHCP: computeMostActiveHCP(insights),
    }),
    [kpiData, insights],
  );

  // Chart data — all computed client-side
  const charts = useMemo(
    () => ({
      weeklyBuckets: computeWeeklyBuckets(insights, dateRange),
      categoryDistribution: computeCategoryDistribution(insights),
      hcpLeaderboard: computeHCPLeaderboard(insights),
      priorityHeatmap: computePriorityStageHeatmap(insights),
    }),
    [insights, dateRange],
  );

  const loading = kpiLoading || insightsLoading;

  const refetch = () => {
    refetchKpi();
    refetchInsights();
  };

  return { kpis, charts, insights, loading, error, refetch };
}
