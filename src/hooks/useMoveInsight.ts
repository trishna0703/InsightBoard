import { useMutation } from "@apollo/client";
import { useCallback } from "react";
import { UPDATE_INSIGHT } from "../graphql/mutations/insights";
import { CREATE_INSIGHT_ACTIVITY } from "../graphql/mutations/activities";
import { LIST_INSIGHTS, GET_STAGE_COUNTS } from "../graphql/queries/insights";
import { Insight, InsightStage } from "../types";
import { STAGE_VALUES, InsightsQueryFilter } from "./useInsights";
import Toast from "react-native-toast-message";
import { sendBoardBroadcast } from './useRealtimeBoard';
import { supabase } from "../services/supabase";


const STAGE_ORDER: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];

export function getNextStage(stage: InsightStage): InsightStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}

export function getPrevStage(stage: InsightStage): InsightStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx > 0 ? STAGE_ORDER[idx - 1] : null;
}

type StageCountsData = {
  observation: { totalCount: number };
  insight: { totalCount: number };
  actionable: { totalCount: number };
  impact: { totalCount: number };
};

export function useMoveInsight() {
  const [updateInsight] = useMutation(UPDATE_INSIGHT);
  const [createActivity] = useMutation(CREATE_INSIGHT_ACTIVITY);

  const moveInsight = useCallback(
    // sourceFilter MUST be the exact filter object the board screen's
    // active LIST_INSIGHTS query is using for this stage (from
    // buildInsightsFilter / useInsights' `filter` return value) — Apollo
    // caches by variables, so a mismatched filter here reads/writes a
    // cache entry nothing is watching, leaving a stale row on screen.
    async (
      insight: Insight,
      targetStage: InsightStage,
      sourceFilter: InsightsQueryFilter
    ) => {
      try {
        // Fetch session once — used for both broadcast and activity log.
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const userName =
          (session?.user?.user_metadata?.name as string | undefined) ??
          (session?.user?.user_metadata?.full_name as string | undefined) ??
          session?.user?.email ??
          'Someone';

        await updateInsight({
          variables: {
            filter: { id: { eq: insight.id } },
            set: { stage: STAGE_VALUES[targetStage] },
          },
          optimisticResponse: {
            updateInsightsCollection: {
              __typename: "InsightsUpdateResponse",
              affectedCount: 1,
              records: [
                {
                  __typename: "Insights",
                  nodeId: insight.id,
                  id: insight.id,
                  title: insight.title,
                  stage: STAGE_VALUES[targetStage],
                  priority: insight.priority,
                  columnOrder: insight.columnOrder,
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          },
          update(cache) {
            // Remove from the source stage's cached list — using the same
            // filter shape the active query is keyed on.
            const sourceData = cache.readQuery<{
              insightsCollection: {
                edges: { node: { id: string } }[];
                pageInfo: { hasNextPage: boolean; endCursor: string };
              };
            }>({
              query: LIST_INSIGHTS,
              variables: { filter: sourceFilter },
            });

            if (sourceData) {
              cache.writeQuery({
                query: LIST_INSIGHTS,
                variables: { filter: sourceFilter },
                data: {
                  insightsCollection: {
                    ...sourceData.insightsCollection,
                    edges: sourceData.insightsCollection.edges.filter(
                      (e) => e.node.id !== insight.id
                    ),
                  },
                },
              });
            }
            // Deliberately NOT writing into the target stage's cached list:
            // BoardScreen only mounts one stage's FlashList at a time, and
            // useInsights uses fetchPolicy "cache-and-network", so switching
            // to the target tab triggers a network fetch that picks up the
            // moved insight automatically. Hand-writing it here would add
            // fragile duplicate-edge logic (this `update` fires twice —
            // once optimistic, once on real response) for no visible benefit.

            // Update pipeline counts directly — no evict/refetch needed,
            // which also means no network round-trip before the count
            // reflects the move (matches 1.1's "counts update instantly").
            const countsData = cache.readQuery<StageCountsData>({
              query: GET_STAGE_COUNTS,
            });

            if (countsData) {
              const sourceKey = STAGE_VALUES[
                insight.stage
              ] as keyof StageCountsData;
              const targetKey = STAGE_VALUES[
                targetStage
              ] as keyof StageCountsData;

              cache.writeQuery({
                query: GET_STAGE_COUNTS,
                data: {
                  ...countsData,
                  [sourceKey]: {
                    ...countsData[sourceKey],
                    totalCount: Math.max(
                      0,
                      countsData[sourceKey].totalCount - 1
                    ),
                  },
                  [targetKey]: {
                    ...countsData[targetKey],
                    totalCount: countsData[targetKey].totalCount + 1,
                  },
                },
              });
            }
          },
        });

        // Broadcast to other users (echo-suppressed on their end by userId check).
        if (userId) {
          sendBoardBroadcast({
            action: 'moved',
            userId,
            userName,
            insightId: insight.id,
            title: insight.title,
            fromStage: insight.stage,
            toStage: targetStage,
          });
        }

        // Activity log — fire-and-forget, uses userId already fetched above.
        if (userId) {
          void createActivity({
            variables: {
              objects: [{
                insightId: insight.id,
                userId,
                teamId: process.env.EXPO_PUBLIC_TEAM_ID ?? '',
                action: 'moved',
                fieldName: 'stage',
                oldValue: STAGE_VALUES[insight.stage],
                newValue: STAGE_VALUES[targetStage],
              }],
            },
          }).catch(() => null);
        }

        Toast.show({
          type: "success",
          text1: `Moved to ${targetStage}`,
          position: "bottom",
          visibilityTime: 2000,
        });
      } catch (err) {
        Toast.show({
          type: "error",
          text1: "Failed to move insight",
          text2: "Please try again",
          position: "bottom",
        });
        throw err;
      }
    },
    [updateInsight, createActivity]
  );

  return { moveInsight, getNextStage, getPrevStage };
}