import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { GET_INSIGHT_DETAIL } from '../graphql/queries/insights';
import { Insight, InsightActivity, InsightStage, Priority } from '../types';

type RawActivity = {
  id: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { fullName: string } | null;
};

type RawDetailNode = Record<string, unknown>;

function transformDetail(node: RawDetailNode): Insight {
  const tags =
    (
      node.insightTagsCollection as {
        edges: { node: { tag: { id: string; name: string } } }[];
      } | null
    )?.edges?.map((e) => e.node.tag) ?? [];

  const category = node.category as
    | { id: string; name: string; color: string }
    | null;

  const hcp = node.hcp as
    | { id: string; name: string; specialty: string; institution: string }
    | null;

  const rawActivities =
    (
      node.insightActivitiesCollection as {
        edges: { node: RawActivity }[];
      } | null
    )?.edges ?? [];

  const activities: InsightActivity[] = rawActivities.map(({ node: a }) => ({
    id: a.id,
    insightId: node.id as string,
    userId: '',
    userName: a.user?.fullName ?? 'Unknown',
    action: a.action,
    fieldName: a.fieldName,
    oldValue: a.oldValue,
    newValue: a.newValue,
    createdAt: a.createdAt,
  }));

  const stageRaw = node.stage as string;
  const stage = (stageRaw.charAt(0).toUpperCase() +
    stageRaw.slice(1)) as InsightStage;

  return {
    id: node.id as string,
    nodeId: node.nodeId as string,
    title: node.title as string,
    description: node.description as string,
    stage,
    priority: node.priority as Priority,
    category: (category?.name ?? null) as Insight['category'],
    categoryId: category?.id ?? null,
    drugName: (node.drugName as string | null) ?? null,
    columnOrder: node.columnOrder as number,
    hcp: hcp ?? null,
    tags,
    activities,
    createdAt: node.createdAt as string,
    updatedAt: node.updatedAt as string,
    teamId: '',
    userId: '',
  };
}

export function useInsightDetail(insightId: string | null) {
  const { data, loading, error, refetch } = useQuery<{
    insightsCollection: { edges: { node: RawDetailNode }[] };
  }>(GET_INSIGHT_DETAIL, {
    variables: { id: insightId },
    skip: !insightId,
    fetchPolicy: 'cache-and-network',
    // Return partial data even if nested fields (e.g. insightActivitiesCollection)
    // fail schema validation — core insight fields will still render.
    errorPolicy: 'all',
  });

  if (error) console.error('[useInsightDetail]', error.message, error.graphQLErrors);

  const insight = useMemo(() => {
    const node = data?.insightsCollection?.edges?.[0]?.node;
    return node ? transformDetail(node) : null;
  }, [data]);

  return { insight, loading, error, refetch };
}
