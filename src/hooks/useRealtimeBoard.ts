import { useEffect, useRef } from "react";
import { useApolloClient } from "@apollo/client";
import Toast from "react-native-toast-message";
import { supabase } from "../services/supabase";
import {
  LIST_INSIGHTS,
  GET_STAGE_COUNTS,
  GET_USER_NAME,
} from "../graphql/queries/insights";
import { InsightStage } from "../types";
import { STAGE_VALUES } from "./useInsights";

// Reverse map: "observation" → "Observation"
const STAGE_DISPLAY: Record<string, InsightStage> = Object.entries(
  STAGE_VALUES,
).reduce(
  (acc, [display, value]) => ({ ...acc, [value]: display as InsightStage }),
  {} as Record<string, InsightStage>,
);

const TEAM_ID = process.env.EXPO_PUBLIC_TEAM_ID!;

// Global set to track IDs we just mutated — shared across hook instances
const pendingMutationIds = new Set<string>();

export function trackMutation(id: string) {
  pendingMutationIds.add(id);
  // Auto-clear after 3s in case the event never arrives
  setTimeout(() => pendingMutationIds.delete(id), 3000);
}

interface RealtimeInsightPayload {
  id: string;
  title: string;
  stage: string;
  priority: string;
  column_order: number;
  created_at: string;
  updated_at: string;
  hcp_id: string | null;
  category_id: string | null;
  drug_name: string | null;
  description: string;
  created_by: string;
}

export function useRealtimeBoard(currentUserId: string | null) {
  const client = useApolloClient();
  // Keep currentUserId fresh inside the subscription callback

  async function fetchUserName(userId: string): Promise<string> {
    try {
      const result = await client.query({
        query: GET_USER_NAME,
        variables: { id: userId },
      });
      return (
        result.data?.usersCollection?.edges?.[0]?.node?.fullName ?? "Someone"
      );
    } catch {
      return "Someone";
    }
  }

  const userIdRef = useRef(currentUserId);
  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`board:${TEAM_ID}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insights" },
        (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as RealtimeInsightPayload | null;
          const oldRow = payload.old as Partial<RealtimeInsightPayload> | null;

          // Echo suppression — skip events caused by our own mutations
          const changedId = newRow?.id ?? oldRow?.id;
          if (!changedId) return;
          if (pendingMutationIds.has(changedId)) {
            pendingMutationIds.delete(changedId);
            return;
          }

          if (eventType === "INSERT" && newRow) {
            handleInsert(newRow);
          } else if (eventType === "UPDATE" && newRow && oldRow) {
            handleUpdate(newRow, oldRow);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function handleInsert(row: RealtimeInsightPayload) {
    const stage = STAGE_DISPLAY[row.stage];
    if (!stage) return;

    const filter = { stage: { eq: row.stage } };

    try {
      const existing = client.readQuery<{
        insightsCollection: {
          edges: { node: Record<string, unknown> }[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      }>({ query: LIST_INSIGHTS, variables: { filter } });

      if (existing) {
        // Check not already in cache
        const alreadyExists = existing.insightsCollection.edges.some(
          (e) => e.node.id === row.id,
        );
        if (!alreadyExists) {
          client.writeQuery({
            query: LIST_INSIGHTS,
            variables: { filter },
            data: {
              insightsCollection: {
                ...existing.insightsCollection,
                edges: [
                  {
                    __typename: "InsightsEdge",
                    node: rowToNode(row),
                  },
                  ...existing.insightsCollection.edges,
                ],
              },
            },
          });
        }
      }
    } catch {
      // Cache miss — that's fine, next query will pick it up
    }

    // Refresh counts
    client.refetchQueries({ include: ["GetStageCounts"] });

    const name = await fetchUserName(row.created_by);
    Toast.show({
      type: "info",
      text1: `${name} added a new insight`,
      text2: row.title,
      position: "bottom",
      visibilityTime: 3000,
    });
  }

  async function handleUpdate(
    newRow: RealtimeInsightPayload,
    oldRow: Partial<RealtimeInsightPayload>,
  ) {
    const newStage = STAGE_DISPLAY[newRow.stage];
    const oldStage = oldRow.stage ? STAGE_DISPLAY[oldRow.stage] : null;

    // Stage changed — remove from old stage list, add to new stage list
    if (oldStage && newStage && oldStage !== newStage) {
      // Remove from old stage
      const oldFilter = { stage: { eq: oldRow.stage } };
      try {
        const oldData = client.readQuery<{
          insightsCollection: {
            edges: { node: { id: string } }[];
            pageInfo: { hasNextPage: boolean; endCursor: string };
          };
        }>({ query: LIST_INSIGHTS, variables: { filter: oldFilter } });

        if (oldData) {
          client.writeQuery({
            query: LIST_INSIGHTS,
            variables: { filter: oldFilter },
            data: {
              insightsCollection: {
                ...oldData.insightsCollection,
                edges: oldData.insightsCollection.edges.filter(
                  (e) => e.node.id !== newRow.id,
                ),
              },
            },
          });
        }
      } catch {
        /* cache miss */
      }

      // Add to new stage
      const newFilter = { stage: { eq: newRow.stage } };
      try {
        const newData = client.readQuery<{
          insightsCollection: {
            edges: { node: Record<string, unknown> }[];
            pageInfo: { hasNextPage: boolean; endCursor: string };
          };
        }>({ query: LIST_INSIGHTS, variables: { filter: newFilter } });

        if (newData) {
          const alreadyExists = newData.insightsCollection.edges.some(
            (e) => e.node.id === newRow.id,
          );
          if (!alreadyExists) {
            client.writeQuery({
              query: LIST_INSIGHTS,
              variables: { filter: newFilter },
              data: {
                insightsCollection: {
                  ...newData.insightsCollection,
                  edges: [
                    {
                      __typename: "InsightsEdge",
                      node: rowToNode(newRow),
                    },
                    ...newData.insightsCollection.edges,
                  ],
                },
              },
            });
          }
        }
      } catch {
        /* cache miss */
      }

      const name = await fetchUserName(newRow.created_by);
      Toast.show({
        type: "info",
        text1: `${name} moved insight to ${newStage}`,
        text2: newRow.title,
        position: "bottom",
        visibilityTime: 3000,
      });

      // Refresh counts
      client.refetchQueries({ include: ["GetStageCounts"] });
    }
  }

  // Convert raw Postgres row to GraphQL node shape
  function rowToNode(row: RealtimeInsightPayload): Record<string, unknown> {
    return {
      __typename: "Insights",
      nodeId: `insights:${row.id}`,
      id: row.id,
      title: row.title,
      description: row.description,
      stage: row.stage,
      priority: row.priority,
      columnOrder: row.column_order,
      drugName: row.drug_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hcp: null,
      category: null,
      insightTagsCollection: { edges: [] },
    };
  }
}
