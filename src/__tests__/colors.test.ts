/**
 * Module 1.2 — Priority badge colours (P1 red, P2 orange, P3 yellow, P4 gray)
 * and stage colours. Also pins the brand palette from the assignment.
 */
import { Colors } from "../constants/colors";

describe("priority badge colours", () => {
  it("maps P1 to red, P2 to orange, P3 to yellow, P4 to gray", () => {
    expect(Colors.priority.P1).toBe("#F44336"); // red
    expect(Colors.priority.P2).toBe("#FF9800"); // orange
    expect(Colors.priority.P3).toBe("#FFC107"); // yellow
    expect(Colors.priority.P4).toBe("#9E9E9E"); // gray
  });

  it("gives every priority a distinct colour", () => {
    const values = Object.values(Colors.priority);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("brand palette", () => {
  it("uses Royal Blue as the primary colour", () => {
    expect(Colors.primary[500]).toBe("#3F51B5");
    expect(Colors.primary[700]).toBe("#303F9F");
    expect(Colors.primary[900]).toBe("#1A237E");
  });

  it("defines the system success/warning/error colours", () => {
    expect(Colors.system.success).toBe("#4CAF50");
    expect(Colors.system.warning).toBe("#FFC107");
    expect(Colors.system.error).toBe("#F44336");
  });
});

describe("stage colours", () => {
  it("defines a colour for each of the four pipeline stages", () => {
    expect(Colors.stage.Observation).toBeDefined();
    expect(Colors.stage.Insight).toBeDefined();
    expect(Colors.stage.Actionable).toBeDefined();
    expect(Colors.stage.Impact).toBeDefined();
  });
});
