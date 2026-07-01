/**
 * Module 1.3 / 1.5 + required test #4 —
 * "Pipeline state transition (swipe → optimistic update → revert on failure)".
 *
 * Drives the real useMoveInsight hook against a real Apollo cache + a mocked
 * link. Verifies that a stage move:
 *   • optimistically removes the card from its source-stage list and adjusts the
 *     pipeline counts (no refetch) on success, and
 *   • rejects AND rolls the cache back to its original state when the mutation
 *     fails — the signal SwipeableInsightCard uses to animate the card back.
 */
import React from "react";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { MockLink, MockedResponse } from "@apollo/client/testing";
import { renderHook, act } from "@testing-library/react-native";

import { useMoveInsight } from "../hooks/useMoveInsight";
import { buildInsightsFilter, DEFAULT_FILTER } from "../hooks/useInsights";
import {
  LIST_INSIGHTS,
  GET_STAGE_COUNTS,
  GET_INSIGHT_DETAIL,
} from "../graphql/queries/insights";
import { UPDATE_INSIGHT } from "../graphql/mutations/insights";
import { makeInsight } from "./factories";

jest.mock("../services/supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn(async () => ({ data: { session: null } })) },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      send: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

const insight = makeInsight({
  id: "card-1",
  stage: "Observation",
  updatedAt: "2026-06-01T00:00:00.000Z",
});
const sourceFilter = buildInsightsFilter("Observation", DEFAULT_FILTER);

function listNode() {
  return {
    __typename: "Insights",
    nodeId: insight.nodeId,
    id: insight.id,
    title: insight.title,
    description: insight.description,
    stage: "observation",
    priority: insight.priority,
    columnOrder: insight.columnOrder,
    drugName: null,
    createdAt: insight.createdAt,
    updatedAt: insight.updatedAt,
    hcp: null,
    category: null,
    insightTagsCollection: { __typename: "InsightTagsConnection", edges: [] },
  };
}

function seedCache(cache: InMemoryCache) {
  cache.writeQuery({
    query: LIST_INSIGHTS,
    variables: { filter: sourceFilter },
    data: {
      insightsCollection: {
        __typename: "InsightsConnection",
        edges: [{ __typename: "InsightsEdge", node: listNode() }],
        pageInfo: {
          __typename: "PageInfo",
          hasNextPage: false,
          endCursor: null,
        },
      },
    },
  });
  cache.writeQuery({
    query: GET_STAGE_COUNTS,
    data: {
      observation: { __typename: "InsightsConnection", totalCount: 5 },
      insight: { __typename: "InsightsConnection", totalCount: 3 },
      actionable: { __typename: "InsightsConnection", totalCount: 2 },
      impact: { __typename: "InsightsConnection", totalCount: 1 },
    },
  });
}

const conflictCheckMock = {
  request: { query: GET_INSIGHT_DETAIL, variables: { id: insight.id } },
  result: {
    data: {
      insightsCollection: {
        __typename: "InsightsConnection",
        edges: [
          {
            __typename: "InsightsEdge",
            node: {
              ...listNode(),
              // conflict check only reads updatedAt; matching value => no conflict
              insightActivitiesCollection: {
                __typename: "InsightActivitiesConnection",
                edges: [],
              },
            },
          },
        ],
      },
    },
  },
};

const updateVariables = {
  filter: { id: { eq: insight.id } },
  set: { stage: "insight" },
};

function makeClient(updateMock: MockedResponse) {
  const cache = new InMemoryCache();
  const client = new ApolloClient({
    link: new MockLink([conflictCheckMock, updateMock]),
    cache,
  });
  seedCache(cache);
  return client;
}

function wrapperFor(client: ApolloClient<object>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
  };
}

function sourceEdges(client: ApolloClient<object>) {
  const data = client.readQuery<{
    insightsCollection: { edges: { node: { id: string } }[] };
  }>({ query: LIST_INSIGHTS, variables: { filter: sourceFilter } });
  return data?.insightsCollection.edges ?? [];
}

function counts(client: ApolloClient<object>) {
  return client.readQuery<{
    observation: { totalCount: number };
    insight: { totalCount: number };
  }>({ query: GET_STAGE_COUNTS });
}

describe("useMoveInsight — optimistic update & revert", () => {
  it("optimistically removes the card and adjusts counts on success", async () => {
    const client = makeClient({
      request: { query: UPDATE_INSIGHT, variables: updateVariables },
      result: {
        data: {
          updateInsightsCollection: {
            __typename: "InsightsUpdateResponse",
            affectedCount: 1,
            records: [
              {
                __typename: "Insights",
                nodeId: insight.id,
                id: insight.id,
                title: insight.title,
                stage: "insight",
                priority: insight.priority,
                columnOrder: insight.columnOrder,
                updatedAt: "2026-06-02T00:00:00.000Z",
              },
            ],
          },
        },
      },
    });

    // Sanity: card starts in the source list.
    expect(sourceEdges(client)).toHaveLength(1);

    const { result } = await renderHook(() => useMoveInsight(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.moveInsight(insight, "Insight", sourceFilter);
    });

    // Card gone from the source (Observation) list…
    expect(sourceEdges(client)).toHaveLength(0);
    // …and counts moved one from observation → insight, with no refetch.
    expect(counts(client)?.observation.totalCount).toBe(4);
    expect(counts(client)?.insight.totalCount).toBe(4);
  });

  it("rejects and rolls the cache back when the mutation fails", async () => {
    const client = makeClient({
      request: { query: UPDATE_INSIGHT, variables: updateVariables },
      error: new Error("network down"),
    });

    const { result } = await renderHook(() => useMoveInsight(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await expect(
        result.current.moveInsight(insight, "Insight", sourceFilter),
      ).rejects.toThrow();
    });

    // Optimistic write was rolled back: card is back in its original list…
    expect(sourceEdges(client)).toHaveLength(1);
    expect(sourceEdges(client)[0].node.id).toBe(insight.id);
    // …and the pipeline counts are unchanged.
    expect(counts(client)?.observation.totalCount).toBe(5);
    expect(counts(client)?.insight.totalCount).toBe(3);
  });
});
