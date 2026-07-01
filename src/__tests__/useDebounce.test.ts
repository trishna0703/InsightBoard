/**
 * Module 1.4 — Search input "debounced 300ms" (custom-hook test).
 */
import { renderHook, act } from "@testing-library/react-native";
import { useDebounce } from "../hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the initial value immediately", async () => {
    const { result } = await renderHook(() => useDebounce("a", 300));
    expect(result.current).toBe("a");
  });

  it("does not update until the delay elapses", async () => {
    const { result, rerender } = await renderHook<string, { value: string }>(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    await rerender({ value: "ab" });
    expect(result.current).toBe("a"); // still the old value

    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab"); // 300ms reached
  });

  it("resets the timer on rapid successive changes (only last value wins)", async () => {
    const { result, rerender } = await renderHook<string, { value: string }>(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    await rerender({ value: "ab" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: "abc" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // 400ms total elapsed, but only 200ms since the last change → no update yet.
    expect(result.current).toBe("a");

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("abc");
  });
});
