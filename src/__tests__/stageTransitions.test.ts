/**
 * Module 1.1 / 1.3 — Pipeline stage order and swipe-to-move transitions.
 *
 * Covers the pure stage-navigation helpers that drive swipe-right (advance),
 * swipe-left (revert), and the disabled/rubber-band ends of the pipeline
 * (can't go back from Observation, can't advance past Impact). Also exercises
 * the StageTransition discriminated union (NFR: discriminated unions for
 * insight stages).
 */
import { getNextStage, getPrevStage } from "../hooks/useMoveInsight";
import { STAGE_VALUES } from "../hooks/useInsights";
import { InsightStage, StageTransition } from "../types";
import { ALL_STAGES } from "./factories";

describe("getNextStage / getPrevStage", () => {
  it("advances through the pipeline in order", () => {
    expect(getNextStage("Observation")).toBe("Insight");
    expect(getNextStage("Insight")).toBe("Actionable");
    expect(getNextStage("Actionable")).toBe("Impact");
  });

  it("reverts through the pipeline in order", () => {
    expect(getPrevStage("Impact")).toBe("Actionable");
    expect(getPrevStage("Actionable")).toBe("Insight");
    expect(getPrevStage("Insight")).toBe("Observation");
  });

  it("blocks advancing past Impact (right-swipe disabled at end)", () => {
    expect(getNextStage("Impact")).toBeNull();
  });

  it("blocks reverting before Observation (left-swipe disabled at start)", () => {
    expect(getPrevStage("Observation")).toBeNull();
  });

  it("next/prev are inverses for interior stages", () => {
    ALL_STAGES.forEach((stage) => {
      const next = getNextStage(stage);
      if (next) expect(getPrevStage(next)).toBe(stage);
    });
  });
});

describe("STAGE_VALUES mapping (display <-> pg_graphql lowercase)", () => {
  it("maps every display stage to its lowercase db value", () => {
    expect(STAGE_VALUES).toEqual({
      Observation: "observation",
      Insight: "insight",
      Actionable: "actionable",
      Impact: "impact",
    });
  });

  it("covers all four stages", () => {
    ALL_STAGES.forEach((stage) => {
      expect(STAGE_VALUES[stage]).toBe(stage.toLowerCase());
    });
  });
});

/**
 * Mirrors the swipe decision the SwipeableInsightCard makes: a right-swipe
 * produces an ADVANCE transition, a left-swipe a REVERT, and a swipe against a
 * blocked end produces a BLOCKED transition (rubber-band bounce).
 */
function resolveSwipe(
  stage: InsightStage,
  direction: "right" | "left",
): StageTransition {
  if (direction === "right") {
    const to = getNextStage(stage);
    return to
      ? { type: "ADVANCE", from: stage, to }
      : { type: "BLOCKED", reason: "already_at_end" };
  }
  const to = getPrevStage(stage);
  return to
    ? { type: "REVERT", from: stage, to }
    : { type: "BLOCKED", reason: "already_at_start" };
}

describe("StageTransition discriminated union", () => {
  it("right-swipe from Observation is an ADVANCE to Insight", () => {
    expect(resolveSwipe("Observation", "right")).toEqual({
      type: "ADVANCE",
      from: "Observation",
      to: "Insight",
    });
  });

  it("left-swipe from Impact is a REVERT to Actionable", () => {
    expect(resolveSwipe("Impact", "left")).toEqual({
      type: "REVERT",
      from: "Impact",
      to: "Actionable",
    });
  });

  it("right-swipe from Impact is BLOCKED (already_at_end)", () => {
    expect(resolveSwipe("Impact", "right")).toEqual({
      type: "BLOCKED",
      reason: "already_at_end",
    });
  });

  it("left-swipe from Observation is BLOCKED (already_at_start)", () => {
    expect(resolveSwipe("Observation", "left")).toEqual({
      type: "BLOCKED",
      reason: "already_at_start",
    });
  });
});
