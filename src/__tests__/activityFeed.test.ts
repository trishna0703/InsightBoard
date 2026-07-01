/**
 * Module 5.3 — Activity Feed / Module 2.3 — Activity Log display shaping.
 *
 * transformActivities flattens the GraphQL insight_activities edges into the
 * flat ActivityEntry rows the feed and detail timeline render, resolving the
 * joined insight title/stage and actor name, with safe fallbacks for missing
 * joins.
 */
import { transformActivities } from "../hooks/useActivityFeed";

function activitiesResponse(nodes: Record<string, unknown>[]) {
  return {
    insightActivitiesCollection: {
      edges: nodes.map((node) => ({ node })),
    },
  };
}

describe("transformActivities", () => {
  it("maps a full activity node into a flat entry", () => {
    const entries = transformActivities(
      activitiesResponse([
        {
          id: "a1",
          insightId: "i1",
          userId: "u1",
          fieldName: "stage",
          oldValue: "observation",
          newValue: "insight",
          createdAt: "2026-06-10T10:00:00.000Z",
          insight: { id: "i1", title: "Dosing concern", stage: "insight" },
          user: { id: "u1", fullName: "Bob Rep" },
        },
      ]),
    );

    expect(entries).toEqual([
      {
        id: "a1",
        insightId: "i1",
        insightTitle: "Dosing concern",
        insightStage: "insight",
        userId: "u1",
        userName: "Bob Rep",
        field: "stage",
        oldValue: "observation",
        newValue: "insight",
        createdAt: "2026-06-10T10:00:00.000Z",
      },
    ]);
  });

  it("falls back gracefully when joins are missing", () => {
    const [entry] = transformActivities(
      activitiesResponse([
        {
          id: "a2",
          insightId: "i2",
          userId: "u2",
          fieldName: "title",
          oldValue: null,
          newValue: "New title",
          createdAt: "2026-06-10T11:00:00.000Z",
          insight: null,
          user: null,
        },
      ]),
    );

    expect(entry.insightTitle).toBe("Unknown insight");
    expect(entry.insightStage).toBe("observation");
    expect(entry.userName).toBe("Someone");
    expect(entry.oldValue).toBeNull();
  });

  it("preserves feed order (server sends newest-first)", () => {
    const entries = transformActivities(
      activitiesResponse([
        { id: "newer", insightId: "i", userId: "u", fieldName: "f", createdAt: "2026-06-10T12:00:00.000Z", insight: null, user: null },
        { id: "older", insightId: "i", userId: "u", fieldName: "f", createdAt: "2026-06-10T09:00:00.000Z", insight: null, user: null },
      ]),
    );
    expect(entries.map((e) => e.id)).toEqual(["newer", "older"]);
  });

  it("returns an empty array when there are no activities", () => {
    expect(transformActivities(activitiesResponse([]))).toEqual([]);
    expect(transformActivities({})).toEqual([]);
  });
});
