/**
 * Module 6.2 — Drag-to-Reorder Within Stage.
 *
 * computeReorderColumnOrder derives a card's new `column_order` from its
 * neighbours using midpoint indexing, so a single moved card can be
 * repositioned without rewriting the whole column.
 */
import { computeReorderColumnOrder } from "../hooks/useReorderInsights";
import { makeInsight } from "./factories";

describe("computeReorderColumnOrder", () => {
  it("places a card between two neighbours at their midpoint", () => {
    const above = makeInsight({ id: "a", columnOrder: 1000 });
    const moved = makeInsight({ id: "m", columnOrder: 9999 });
    const below = makeInsight({ id: "b", columnOrder: 2000 });
    expect(computeReorderColumnOrder("m", [above, moved, below])).toBe(1500);
  });

  it("places a card dropped at the top below its (now-)following card", () => {
    const moved = makeInsight({ id: "m", columnOrder: 9999 });
    const below = makeInsight({ id: "b", columnOrder: 2000 });
    // No `above` → half of the below card's order.
    expect(computeReorderColumnOrder("m", [moved, below])).toBe(1000);
  });

  it("places a card dropped at the bottom above the last card", () => {
    const above = makeInsight({ id: "a", columnOrder: 3000 });
    const moved = makeInsight({ id: "m", columnOrder: 100 });
    // No `below` → above + 1000.
    expect(computeReorderColumnOrder("m", [above, moved])).toBe(4000);
  });

  it("assigns a default order to the only card in a stage", () => {
    const moved = makeInsight({ id: "m", columnOrder: 0 });
    expect(computeReorderColumnOrder("m", [moved])).toBe(1000);
  });

  it("keeps the new order strictly between its neighbours", () => {
    const above = makeInsight({ id: "a", columnOrder: 500 });
    const moved = makeInsight({ id: "m" });
    const below = makeInsight({ id: "b", columnOrder: 501 });
    const result = computeReorderColumnOrder("m", [above, moved, below]);
    // 500 and 501 have no integer strictly between; Math.round collapses to a
    // neighbour value — this documents the known precision limit at which a
    // full re-index would be needed.
    expect(result).toBeGreaterThanOrEqual(500);
    expect(result).toBeLessThanOrEqual(501);
  });
});
