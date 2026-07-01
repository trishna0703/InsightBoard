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
  categoryId: string | null;
  hcpId: string | null;
  hcpName: string | null; // denormalized for chip label
  tagIds: string[];
  dateFrom: string | null; // "YYYY-MM-DD"
  dateTo: string | null;
}

export const DEFAULT_FILTER: FilterInput = {
  search: '',
  priorities: [],
  categoryId: null,
  hcpId: null,
  hcpName: null,
  tagIds: [],
  dateFrom: null,
  dateTo: null,
};

export function countActiveFilters(f: FilterInput): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.priorities.length > 0) n++;
  if (f.categoryId) n++;
  if (f.hcpId) n++;
  if (f.tagIds.length > 0) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

// The exact shape of the GraphQL `filter` argument we send to LIST_INSIGHTS.
// Exported so useMoveInsight can build an IDENTICAL filter object — Apollo
// caches query results keyed by variables, so if the mutation's cache read
// uses a differently-shaped filter than the one the active query is using,
// it reads/writes the wrong cache entry (or none at all).
export interface InsightsQueryFilter {
  stage: { eq: string };
  priority?: { in: Priority[] };
  // Free-text search spans title AND description via a pg_graphql OR group,
  // AND-ed with the other top-level clauses (stage, priority, …).
  or?: [{ title: { ilike: string } }, { description: { ilike: string } }];
  categoryId?: { eq: string };
  hcpId?: { eq: string };
  createdAt?: { gte?: string; lte?: string };
}

export function buildInsightsFilter(
  stage: InsightStage,
  filters: FilterInput
): InsightsQueryFilter {
  const f: InsightsQueryFilter = {
    stage: { eq: STAGE_VALUES[stage] },
  };

  if (filters.priorities.length > 0) f.priority = { in: filters.priorities };
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    f.or = [{ title: { ilike: term } }, { description: { ilike: term } }];
  }
  if (filters.categoryId) f.categoryId = { eq: filters.categoryId };
  if (filters.hcpId) f.hcpId = { eq: filters.hcpId };

  if (filters.dateFrom || filters.dateTo) {
    f.createdAt = {};
    if (filters.dateFrom) f.createdAt.gte = `${filters.dateFrom}T00:00:00Z`;
    if (filters.dateTo) f.createdAt.lte = `${filters.dateTo}T23:59:59Z`;
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
    const raw =
      data?.insightsCollection?.edges?.map(
        (e: { node: Record<string, unknown> }) => transformInsight(e.node)
      ) ?? [];
    // Tag filtering is AND-logic and done client-side because pg_graphql
    // nested-collection filters on insight_tags would require complex
    // repeated `and` clauses; the server already returns tags per card.
    if (filters.tagIds.length === 0) return raw;
    return raw.filter((i) =>
      filters.tagIds.every((tid) => i.tags.some((t) => t.id === tid)),
    );
  }, [data, filters.tagIds]);

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