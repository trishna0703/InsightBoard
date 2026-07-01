import { useEffect, useRef, useCallback } from "react";
import { useImmer } from "use-immer";
import { enableMapSet } from "immer";
import { supabase } from "../services/supabase";

enableMapSet();

const TEAM_ID = process.env.EXPO_PUBLIC_TEAM_ID!;

export type SignalType = "viewing" | "editing" | "swiping";

export interface UserSignal {
  userId: string;
  userName: string;
  insightId: string;
  type: SignalType;
}

// Wire payload: a signal plus its action and an optional `reply` flag.
// `reply: true` marks a re-announcement sent in response to someone else's join,
// so it updates their state without triggering yet another reply (no ping-pong).
type SignalMessage = UserSignal & {
  action: "start" | "stop";
  reply?: boolean;
};

export interface BroadcastState {
  viewing: Record<string, UserSignal[]>; // insightId → users viewing
  editing: Record<string, UserSignal[]>; // insightId → users editing
  swiping: Set<string>; // insightIds being swiped
}

const THROTTLE_MS = 300;

export function useBroadcast(currentUser: { id: string; name: string } | null) {
  const [state, setState] = useImmer<BroadcastState>({
    viewing: {},
    editing: {},
    swiping: new Set(),
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const throttleRef = useRef<Record<string, number>>({});
  // My currently-active viewing/editing signals (keyed `type:insightId`).
  // Broadcast doesn't replay past events, so when a user joins AFTER me they
  // never saw my original "start". We replay these to them on demand.
  const activeSignalsRef = useRef<
    Map<string, { type: SignalType; insightId: string }>
  >(new Map());

  const sendSignal = useCallback(
    (msg: {
      type: SignalType;
      insightId: string;
      action: "start" | "stop";
      reply?: boolean;
    }) => {
      if (!currentUser || !channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "signal",
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          insightId: msg.insightId,
          type: msg.type,
          action: msg.action,
          // Only include the flag on replies so normal signals stay unchanged.
          ...(msg.reply ? { reply: true } : {}),
        },
      });
    },
    [currentUser],
  );

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`broadcast:${TEAM_ID}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        const signal = payload as SignalMessage;

        // Ignore our own signals
        if (signal.userId === currentUser.id) return;

        setState((draft) => {
          if (signal.type === "swiping") {
            if (signal.action === "start") {
              draft.swiping.add(signal.insightId);
            } else {
              draft.swiping.delete(signal.insightId);
            }
            return;
          }

          const map = signal.type === "viewing" ? draft.viewing : draft.editing;

          if (signal.action === "start") {
            if (!map[signal.insightId]) map[signal.insightId] = [];
            const exists = map[signal.insightId].some(
              (u) => u.userId === signal.userId,
            );
            if (!exists) map[signal.insightId].push(signal);
          } else {
            if (map[signal.insightId]) {
              map[signal.insightId] = map[signal.insightId].filter(
                (u) => u.userId !== signal.userId,
              );
            }
          }
        });

        // Late-joiner fix: when another user announces they've STARTED
        // viewing/editing an insight, re-announce any of my own active signals
        // for that same insight so they learn I'm already here. Mark as a reply
        // so it doesn't bounce back and forth.
        if (
          !signal.reply &&
          signal.action === "start" &&
          signal.type !== "swiping"
        ) {
          activeSignalsRef.current.forEach(({ type, insightId }) => {
            if (insightId === signal.insightId) {
              sendSignal({ type, insightId, action: "start", reply: true });
            }
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUser, setState, sendSignal]);

  const emit = useCallback(
    (type: SignalType, insightId: string, action: "start" | "stop") => {
      if (!currentUser || !channelRef.current) return;

      if (type === "swiping") {
        // Throttle high-frequency swipe signals.
        const key = `${type}:${insightId}:${action}`;
        const now = Date.now();
        if (now - (throttleRef.current[key] ?? 0) < THROTTLE_MS) return;
        throttleRef.current[key] = now;
      } else {
        // Track viewing/editing so we can replay to users who join later.
        const key = `${type}:${insightId}`;
        if (action === "start") {
          activeSignalsRef.current.set(key, { type, insightId });
        } else {
          activeSignalsRef.current.delete(key);
        }
      }

      sendSignal({ type, insightId, action });
    },
    [currentUser, sendSignal],
  );

  return { state, emit };
}
