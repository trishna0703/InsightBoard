/**
 * Module 5.1 — Broadcast Signals (viewing / editing / swiping indicators).
 *
 * Verifies: incoming signals mutate the shared BroadcastState, a user's own
 * signals are echo-suppressed, duplicate joins are de-duped, and outgoing
 * high-frequency swipe signals are throttled so the channel isn't flooded.
 */
import { renderHook, act } from "@testing-library/react-native";

type SignalHandler = (msg: { payload: unknown }) => void;

interface MockChannel {
  name: string;
  on: jest.Mock;
  subscribe: jest.Mock;
  send: jest.Mock;
  handlers: Record<string, SignalHandler>;
}

const mockChannels: MockChannel[] = [];

jest.mock("../services/supabase", () => ({
  supabase: {
    channel: (name: string): MockChannel => {
      const handlers: Record<string, SignalHandler> = {};
      const ch: MockChannel = {
        name,
        handlers,
        on: jest.fn((_type: string, filter: { event: string }, cb: SignalHandler) => {
          handlers[filter.event] = cb;
          return ch;
        }),
        subscribe: jest.fn(() => ch),
        send: jest.fn(),
      };
      mockChannels.push(ch);
      return ch;
    },
    removeChannel: jest.fn(),
  },
}));

import { useBroadcast } from "../hooks/useBroadcast";

const ME = { id: "me", name: "Alice" };

function latestChannel(): MockChannel {
  return mockChannels[mockChannels.length - 1];
}

async function receiveSignal(payload: Record<string, unknown>): Promise<void> {
  await act(async () => {
    latestChannel().handlers["signal"]({ payload });
  });
}

beforeEach(() => {
  mockChannels.length = 0;
});

describe("useBroadcast — incoming signals", () => {
  it("records another user viewing a card", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    await receiveSignal({
      userId: "bob",
      userName: "Bob",
      insightId: "i1",
      type: "viewing",
      action: "start",
    });
    expect(result.current.state.viewing["i1"]).toHaveLength(1);
    expect(result.current.state.viewing["i1"][0].userName).toBe("Bob");
  });

  it("clears a viewer on a stop signal", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    await receiveSignal({ userId: "bob", userName: "Bob", insightId: "i1", type: "viewing", action: "start" });
    await receiveSignal({ userId: "bob", userName: "Bob", insightId: "i1", type: "viewing", action: "stop" });
    expect(result.current.state.viewing["i1"]).toHaveLength(0);
  });

  it("records an editing lock", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    await receiveSignal({ userId: "bob", userName: "Bob", insightId: "i1", type: "editing", action: "start" });
    expect(result.current.state.editing["i1"][0].userName).toBe("Bob");
  });

  it("tracks a mid-swipe card in the swiping set", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    await receiveSignal({ userId: "bob", userName: "Bob", insightId: "i1", type: "swiping", action: "start" });
    expect(result.current.state.swiping.has("i1")).toBe(true);

    await receiveSignal({ userId: "bob", userName: "Bob", insightId: "i1", type: "swiping", action: "stop" });
    expect(result.current.state.swiping.has("i1")).toBe(false);
  });

  it("echo-suppresses the current user's own signals", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    await receiveSignal({ userId: ME.id, userName: "Alice", insightId: "i1", type: "viewing", action: "start" });
    expect(result.current.state.viewing["i1"]).toBeUndefined();
  });

  it("de-dupes the same user viewing a card twice", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    await receiveSignal({ userId: "bob", userName: "Bob", insightId: "i1", type: "viewing", action: "start" });
    await receiveSignal({ userId: "bob", userName: "Bob", insightId: "i1", type: "viewing", action: "start" });
    expect(result.current.state.viewing["i1"]).toHaveLength(1);
  });
});

describe("useBroadcast — outgoing emit", () => {
  it("sends a well-formed signal payload", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    result.current.emit("viewing", "i1", "start"); // emit performs no state update

    expect(latestChannel().send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "signal",
      payload: {
        userId: ME.id,
        userName: ME.name,
        insightId: "i1",
        type: "viewing",
        action: "start",
      },
    });
  });

  it("throttles rapid swipe signals within the 300ms window", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));

    // Base the fake clock at a realistic (non-zero) epoch: a real Date.now() is
    // always large, so the first swipe is never throttled by the default-0 seed.
    const BASE = 1_000_000;
    jest.useFakeTimers();
    jest.setSystemTime(BASE);
    try {
      result.current.emit("swiping", "i1", "start");
      result.current.emit("swiping", "i1", "start"); // immediate repeat → throttled
      expect(latestChannel().send).toHaveBeenCalledTimes(1);

      jest.setSystemTime(BASE + 400); // past the 300ms throttle window
      result.current.emit("swiping", "i1", "start");
      expect(latestChannel().send).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not throttle non-swipe signals", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    result.current.emit("viewing", "i1", "start");
    result.current.emit("viewing", "i1", "stop");
    expect(latestChannel().send).toHaveBeenCalledTimes(2);
  });
});

describe("useBroadcast — late-joiner re-announce", () => {
  it("replays my active signal when another user joins the same insight", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));

    // I'm already viewing i1.
    result.current.emit("viewing", "i1", "start");
    latestChannel().send.mockClear();

    // Bob joins and starts viewing i1 → I should re-announce my presence as a reply.
    await receiveSignal({
      userId: "bob",
      userName: "Bob",
      insightId: "i1",
      type: "viewing",
      action: "start",
    });

    expect(latestChannel().send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "signal",
      payload: {
        userId: ME.id,
        userName: ME.name,
        insightId: "i1",
        type: "viewing",
        action: "start",
        reply: true,
      },
    });
  });

  it("does not re-announce for a different insight", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    result.current.emit("viewing", "i1", "start");
    latestChannel().send.mockClear();

    await receiveSignal({
      userId: "bob",
      userName: "Bob",
      insightId: "i2", // different insight
      type: "viewing",
      action: "start",
    });

    expect(latestChannel().send).not.toHaveBeenCalled();
  });

  it("does not reply to a reply (no ping-pong)", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    result.current.emit("viewing", "i1", "start");
    latestChannel().send.mockClear();

    await receiveSignal({
      userId: "bob",
      userName: "Bob",
      insightId: "i1",
      type: "viewing",
      action: "start",
      reply: true, // already a reply
    });

    expect(latestChannel().send).not.toHaveBeenCalled();
  });

  it("stops replaying once I stop viewing", async () => {
    const { result } = await renderHook(() => useBroadcast(ME));
    result.current.emit("viewing", "i1", "start");
    result.current.emit("viewing", "i1", "stop");
    latestChannel().send.mockClear();

    await receiveSignal({
      userId: "bob",
      userName: "Bob",
      insightId: "i1",
      type: "viewing",
      action: "start",
    });

    expect(latestChannel().send).not.toHaveBeenCalled();
  });
});
