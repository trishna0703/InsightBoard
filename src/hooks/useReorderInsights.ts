import { useMutation, useApolloClient } from "@apollo/client";
import { useCallback } from "react";
import { UPDATE_INSIGHT } from "../graphql/mutations/insights";
import { LIST_INSIGHTS } from "../graphql/queries/insights";
import { Insight } from "../types";
import { InsightsQueryFilter } from "./useInsights";
import Toast from "react-native-toast-message";

// Pure computation of a card's new `column_order` after a drag-to-reorder.
// Uses fractional/midpoint indexing so a single moved row can be repositioned
// without rewriting every other row's order. Exported for unit testing.
export function computeReorderColumnOrder(
  movedId: string,
  newOrder: Insight[],
): number {
  const idx = newOrder.findIndex((i) => i.id === movedId);
  const above = idx > 0 ? newOrder[idx - 1] : null;
  const below = idx < newOrder.length - 1 ? newOrder[idx + 1] : null;

  if (!above && !below) {
    return 1000;
  } else if (!above) {
    return Math.round((below!.columnOrder ?? 1000) / 2);
  } else if (!below) {
    return (above.columnOrder ?? 0) + 1000;
  } else {
    return Math.round(
      ((above.columnOrder ?? 0) + (below.columnOrder ?? 0)) / 2,
    );
  }
}

export function useReorderInsights() {
  const client = useApolloClient();
  const [updateInsight] = useMutation(UPDATE_INSIGHT);

  const reorderInsight = useCallback(
    async (
      moved: Insight,
      newOrder: Insight[],
      filter: InsightsQueryFilter,
    ) => {
      const newColumnOrder = computeReorderColumnOrder(moved.id, newOrder);

      // Optimistically rewrite the cached list order so the board reflects the
      // new position immediately — before the network round-trip completes.
      try {
        const cached = client.readQuery<{
          insightsCollection: {
            edges: { node: Record<string, unknown> }[];
            pageInfo: { hasNextPage: boolean; endCursor: string };
          };
        }>({ query: LIST_INSIGHTS, variables: { filter } });

        if (cached) {
          const edgeMap = new Map(
            cached.insightsCollection.edges.map((e) => [
              e.node.id as string,
              e,
            ]),
          );
          const newEdges = newOrder
            .map((i) => edgeMap.get(i.id))
            .filter((e): e is NonNullable<typeof e> => e !== undefined);

          client.writeQuery({
            query: LIST_INSIGHTS,
            variables: { filter },
            data: {
              insightsCollection: {
                ...cached.insightsCollection,
                edges: newEdges,
              },
            },
          });
        }
      } catch {
        // Cache miss — the list will refetch on next render
      }

      await updateInsight({
        variables: {
          filter: { id: { eq: moved.id } },
          set: { columnOrder: newColumnOrder },
        },
      }).catch(() => {
        Toast.show({
          type: "error",
          text1: "Failed to save order",
          position: "bottom",
        });
      });
    },
    [client, updateInsight],
  );

  return { reorderInsight };
}
