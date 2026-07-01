import { Insight, InsightStage, Priority } from "../types";

export interface WeeklyBucket {
  week: string; // e.g. "Jun 2"
  count: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface HCPCount {
  name: string;
  count: number;
}

export interface PriorityStageCell {
  priority: Priority;
  stage: InsightStage;
  count: number;
}

const STAGES: InsightStage[] = [
  "Observation",
  "Insight",
  "Actionable",
  "Impact",
];
const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];


export function computeWeeklyBuckets(
  insights: Insight[],
  dateRange: { start: Date; end: Date },
): WeeklyBucket[] {
  const { start, end } = dateRange;
  const diffDays =
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  const bucketDays =
    diffDays <= 14 ? 1 : diffDays <= 56 ? 7 : Math.ceil(diffDays / 8);

  const buckets: WeeklyBucket[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor < end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(cursor.getDate() + bucketDays);

    const count = insights.filter((ins) => {
      const d = new Date(ins.createdAt);
      return d >= bucketStart && d < bucketEnd;
    }).length;

    buckets.push({
      week: bucketStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
    });

    cursor.setDate(cursor.getDate() + bucketDays);
  }

  return buckets;
}

export function computeCategoryDistribution(
  insights: Insight[],
): CategoryCount[] {
  const map: Record<string, number> = {};
  for (const ins of insights) {
    const cat = ins.category ?? "Unknown";
    map[cat] = (map[cat] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeHCPLeaderboard(insights: Insight[]): HCPCount[] {
  const map: Record<string, number> = {};
  for (const ins of insights) {
    if (!ins.hcp) continue;
    map[ins.hcp.name] = (map[ins.hcp.name] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function computeMostActiveHCP(insights: Insight[]): string {
  const leaderboard = computeHCPLeaderboard(insights);
  return leaderboard[0]?.name ?? "N/A";
}

export function computeAvgPipelineTime(insights: Insight[]): number {
  const impactInsights = insights.filter((i) => i.stage === "Impact");
  if (impactInsights.length === 0) return 0;
  const totalDays = impactInsights.reduce((sum, ins) => {
    const created = new Date(ins.createdAt);
    const updated = new Date(ins.updatedAt);
    return (
      sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, 0);
  return Math.round(totalDays / impactInsights.length);
}

export function computePriorityStageHeatmap(
  insights: Insight[],
): PriorityStageCell[] {
  const cells: PriorityStageCell[] = [];
  for (const priority of PRIORITIES) {
    for (const stage of STAGES) {
      const count = insights.filter(
        (i) => i.priority === priority && i.stage === stage,
      ).length;
      cells.push({ priority, stage, count });
    }
  }
  return cells;
}

export function filterByDateRange(
  insights: Insight[],
  start: Date,
  end: Date,
): Insight[] {
  return insights.filter((i) => {
    const d = new Date(i.createdAt);
    return d >= start && d <= end;
  });
}
