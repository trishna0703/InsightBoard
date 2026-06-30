import { useQuery } from "@apollo/client";
import { useMemo } from "react";
import { LIST_INSIGHTS, GET_STAGE_COUNTS } from "../graphql/queries/insights";
import { InsightStage, Priority, Insight } from "../types";

// These match exactly what pg_graphql expects (lowercase)
export const STAGE_VALUES: Record<InsightStage, string> = {
  Observation: "observation",
  Insight: "insight",
  Actionable: "actionable",
  Impact: "impact",
};

export interface FilterInput {
  search: string;
  priorities: Priority[];
}

// The exact shape of the GraphQL `filter` argument we send to LIST_INSIGHTS.
// Exported so useMoveInsight can build an IDENTICAL filter object — Apollo
// caches query results keyed by variables, so if the mutation's cache read
// uses a differently-shaped filter than the one the active query is using,
// it reads/writes the wrong cache entry (or none at all).
export interface InsightsQueryFilter {
  stage: { eq: string };
  priority?: { in: Priority[] };
  title?: { ilike: string };
}

export function buildInsightsFilter(
  stage: InsightStage,
  filters: FilterInput
): InsightsQueryFilter {
  const f: InsightsQueryFilter = {
    stage: { eq: STAGE_VALUES[stage] },
  };

  if (filters.priorities.length > 0) {
    f.priority = { in: filters.priorities };
  }

  if (filters.search.trim().length > 0) {
    f.title = { ilike: `%${filters.search.trim()}%` };
  }

  return f;
}

// Transform raw GraphQL response into our clean Insight type
function transformInsight(node: Record<string, unknown>): Insight {
  const tags =
    (
      node.insightTagsCollection as {
        edges: { node: { tag: { id: string; name: string } } }[];
      }
    )?.edges?.map((e) => e.node.tag) ?? [];

  const category = node.category as
    | { id: string; name: string; color: string }
    | null;
  const hcp = node.hcp as
    | { id: string; name: string; specialty: string; institution: string }
    | null;

  const stageRaw = node.stage as string;
  return {
    id: node.id as string,
    nodeId: (node.nodeId as string | undefined) ?? (node.id as string),
    title: node.title as string,
    description: node.description as string,
    stage: (stageRaw.charAt(0).toUpperCase() + stageRaw.slice(1)) as InsightStage,
    priority: node.priority as Priority,
    category: (category?.name ?? null) as Insight["category"],
    categoryId: (category?.id as string | undefined) ?? null,
    drugName: (node.drugName as string | null) ?? null,
    columnOrder: node.columnOrder as number,
    hcp: hcp
      ? {
          id: hcp.id,
          name: hcp.name,
          specialty: hcp.specialty,
          institution: hcp.institution,
        }
      : null,
    tags,
    activities: [],
    createdAt: node.createdAt as string,
    updatedAt: node.updatedAt as string,
    teamId: "",
    userId: "",
  };
}

export function useInsights(
  selectedStage: InsightStage,
  filters: FilterInput
) {
  const filter = useMemo(
    () => buildInsightsFilter(selectedStage, filters),
    [selectedStage, filters]
  );

  const { data, loading, error, refetch, fetchMore } = useQuery<{
    insightsCollection: {
      edges: { node: Record<string, unknown> }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  }>(LIST_INSIGHTS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const { data: countsData, refetch: refetchCounts } = useQuery<{
    observation: { totalCount: number };
    insight: { totalCount: number };
    actionable: { totalCount: number };
    impact: { totalCount: number };
  }>(GET_STAGE_COUNTS);

  const insights: Insight[] = useMemo(() => {
    return (
      data?.insightsCollection?.edges?.map(
        (e: { node: Record<string, unknown> }) => transformInsight(e.node)
      ) ?? []
    );
  }, [data]);

  const counts: Record<InsightStage, number> = useMemo(() => {
    return {
      Observation: countsData?.observation?.totalCount ?? 0,
      Insight: countsData?.insight?.totalCount ?? 0,
      Actionable: countsData?.actionable?.totalCount ?? 0,
      Impact: countsData?.impact?.totalCount ?? 0,
    };
  }, [countsData]);

  const hasNextPage =
    data?.insightsCollection?.pageInfo?.hasNextPage ?? false;
  const endCursor = data?.insightsCollection?.pageInfo?.endCursor;

  const loadMore = () => {
    if (!hasNextPage) return;
    fetchMore({ variables: { filter, cursor: endCursor } });
  };

  return {
    insights,
    counts,
    filter,
    loading,
    error,
    refetch: () => {
      refetch();
      refetchCounts();
    },
    loadMore,
    hasNextPage,
  };
}