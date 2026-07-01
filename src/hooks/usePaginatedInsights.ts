import { useState, useEffect, useCallback } from "react";
import { useApolloClient, ApolloQueryResult } from "@apollo/client";
import { LIST_ALL_INSIGHTS } from "../graphql/queries/analytics";
import { Insight } from "../types";
import { STAGE_VALUES } from "./useInsights";

type InsightsPageData = {
  insightsCollection: {
    edges: { node: Record<string, unknown> }[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

function transformNode(node: Record<string, unknown>): Insight {
  const stageRaw = node.stage as string;
  const category = node.category as { id: string; name: string } | null;
  const hcp = node.hcp as { id: string; name: string } | null;

  return {
    id: node.id as string,
    nodeId: node.id as string,
    title: node.title as string,
    description: "",
    stage: (stageRaw.charAt(0).toUpperCase() +
      stageRaw.slice(1)) as Insight["stage"],
    priority: node.priority as Insight["priority"],
    category: (category?.name ?? null) as Insight["category"],
    categoryId: category?.id ?? null,
    drugName: (node.drugName as string | null) ?? null,
    columnOrder: 0,
    hcp: hcp
      ? { id: hcp.id, name: hcp.name, specialty: "", institution: "" }
      : null,
    tags: [],
    activities: [],
    createdAt: node.createdAt as string,
    updatedAt: node.updatedAt as string,
    teamId: "",
    userId: "",
  };
}

export function usePaginatedInsights(dateFilter?: { start: Date; end: Date }) {
  const client = useApolloClient();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const all: Insight[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    // Build date filter if provided
    const filter = dateFilter
      ? {
          createdAt: {
            gte: dateFilter.start.toISOString(),
            lte: dateFilter.end.toISOString(),
          },
        }
      : undefined;

    try {
      while (hasMore) {
        const result: ApolloQueryResult<InsightsPageData> = await client.query<InsightsPageData>({
          query: LIST_ALL_INSIGHTS,
          variables: { cursor, filter },
          fetchPolicy: "network-only",
        });

        const edges = result.data?.insightsCollection?.edges ?? [];
        all.push(...edges.map((e) => transformNode(e.node)));
        hasMore =
          result.data?.insightsCollection?.pageInfo?.hasNextPage ?? false;
        cursor = result.data?.insightsCollection?.pageInfo?.endCursor ?? null;
      }
      setInsights(all);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to fetch"));
    } finally {
      setLoading(false);
    }
  }, [client, dateFilter?.start.toISOString(), dateFilter?.end.toISOString()]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { insights, loading, error, refetch: fetchAll };
}
