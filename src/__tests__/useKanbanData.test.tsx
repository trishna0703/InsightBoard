/**
 * Module 6.1 — Pipeline Overview Mode.
 *
 * useKanbanData groups the board into the four stages, showing at most 3
 * mini-cards per stage with a "+N more" overflow count derived from totalCount.
 */
import React from "react";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { MockLink } from "@apollo/client/testing";
import { renderHook, waitFor } from "@testing-library/react-native";

import { useKanbanData } from "../hooks/useKanbanData";
import { GET_KANBAN_OVERVIEW } from "../graphql/queries/insights";

function conn(totalCount: number, n: number) {
  return {
    __typename: "InsightsConnection",
    totalCount,
    edges: Array.from({ length: n }, (_, i) => ({
      __typename: "InsightsEdge",
      node: {
        __typename: "Insights",
        id: `c${i}`,
        title: `Card ${i}`,
        priority: "P2",
      },
    })),
  };
}

const overviewMock = {
  request: { query: GET_KANBAN_OVERVIEW },
  result: {
    data: {
      observation: conn(5, 4), // 5 total, query returns first 4
      insight: conn(2, 2),
      actionable: conn(0, 0),
      impact: conn(3, 3),
    },
  },
};

function renderKanban() {
  const client = new ApolloClient({
    link: new MockLink([overviewMock]),
    cache: new InMemoryCache(),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  return renderHook(() => useKanbanData(), { wrapper });
}

describe("useKanbanData", () => {
  it("returns all four stages in pipeline order", async () => {
    const { result } = await renderKanban();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stages.map((s) => s.stage)).toEqual([
      "Observation",
      "Insight",
      "Actionable",
      "Impact",
    ]);
  });

  it("caps mini-cards at 3 and reports overflow via moreCount", async () => {
    const { result } = await renderKanban();
    await waitFor(() => expect(result.current.loading).toBe(false));

    const observation = result.current.stages[0];
    expect(observation.totalCount).toBe(5);
    expect(observation.cards).toHaveLength(3); // max 3 shown
    expect(observation.moreCount).toBe(2); // "+2 more"
  });

  it("shows no overflow when a stage has 3 or fewer cards", async () => {
    const { result } = await renderKanban();
    await waitFor(() => expect(result.current.loading).toBe(false));

    const insight = result.current.stages[1];
    expect(insight.cards).toHaveLength(2);
    expect(insight.moreCount).toBe(0);
  });

  it("handles an empty stage (empty-state)", async () => {
    const { result } = await renderKanban();
    await waitFor(() => expect(result.current.loading).toBe(false));

    const actionable = result.current.stages[2];
    expect(actionable.totalCount).toBe(0);
    expect(actionable.cards).toHaveLength(0);
    expect(actionable.moreCount).toBe(0);
  });
});
