import { Insight, InsightStage, Priority, HCP, Tag } from "../types";

let seq = 0;

/**
 * Deterministic Insight factory for tests. `createdAt`/`updatedAt` default to a
 * fixed epoch so date-based assertions are stable; override per test as needed.
 */
export function makeInsight(overrides: Partial<Insight> = {}): Insight {
  seq += 1;
  return {
    id: `insight-${seq}`,
    nodeId: `node-${seq}`,
    title: "Test insight",
    description: "Test description",
    stage: "Observation",
    priority: "P2",
    category: "Efficacy",
    categoryId: "cat-1",
    drugName: null,
    columnOrder: seq * 1000,
    hcp: null,
    tags: [],
    activities: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    teamId: "team-1",
    userId: "user-1",
    ...overrides,
  };
}

export function makeHCP(overrides: Partial<HCP> = {}): HCP {
  return {
    id: "hcp-1",
    name: "Dr. Smith",
    specialty: "Cardiology",
    institution: "General Hospital",
    ...overrides,
  };
}

export function makeTag(id: string, name: string): Tag {
  return { id, name };
}

export const ALL_STAGES: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];

export const ALL_PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];
