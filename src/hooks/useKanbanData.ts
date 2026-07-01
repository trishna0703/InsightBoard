import { useQuery } from "@apollo/client";
import { useMemo } from "react";
import { GET_KANBAN_OVERVIEW } from "../graphql/queries/insights";
import { InsightStage, Priority } from "../types";

export interface KanbanCard {
  id: string;
  title: string;
  priority: Priority;
}

export interface KanbanStageData {
  stage: InsightStage;
  totalCount: number;
  cards: KanbanCard[];
  moreCount: number;
}

type RawCollection = {
  totalCount: number;
  edges: { node: { id: string; title: string; priority: string } }[];
};

type KanbanQueryResult = {
  observation: RawCollection;
  insight: RawCollection;
  actionable: RawCollection;
  impact: RawCollection;
};

const STAGE_KEYS: Array<{ stage: InsightStage; key: keyof KanbanQueryResult }> = [
  { stage: "Observation", key: "observation" },
  { stage: "Insight",     key: "insight" },
  { stage: "Actionable",  key: "actionable" },
  { stage: "Impact",      key: "impact" },
];

export function useKanbanData() {
  const { data, loading, refetch } = useQuery<KanbanQueryResult>(
    GET_KANBAN_OVERVIEW,
    { fetchPolicy: "cache-and-network" },
  );

  const stages: KanbanStageData[] = useMemo(() => {
    return STAGE_KEYS.map(({ stage, key }) => {
      const collection = data?.[key];
      const cards = (collection?.edges ?? []).slice(0, 3).map((e) => ({
        id: e.node.id,
        title: e.node.title,
        priority: e.node.priority as Priority,
      }));
      const totalCount = collection?.totalCount ?? 0;
      return { stage, totalCount, cards, moreCount: Math.max(0, totalCount - 3) };
    });
  }, [data]);

  return { stages, loading, refetch };
}
