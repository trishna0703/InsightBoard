import { useEffect, useRef, useCallback } from "react";
import { useImmer } from "use-immer";
import { supabase } from "../services/supabase";

const TEAM_ID = process.env.EXPO_PUBLIC_TEAM_ID!;

export type SignalType = "viewing" | "editing" | "swiping";

export interface UserSignal {
  userId: string;
  userName: string;
  insightId: string;
  type: SignalType;
}

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

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`broadcast:${TEAM_ID}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        const signal = payload as UserSignal & { action: "start" | "stop" };

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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUser]);

  const emit = useCallback(
    (type: SignalType, insightId: string, action: "start" | "stop") => {
      if (!currentUser || !channelRef.current) return;

      // Throttle high-frequency signals like swiping
      if (type === "swiping") {
        const key = `${type}:${insightId}:${action}`;
        const now = Date.now();
        if (now - (throttleRef.current[key] ?? 0) < THROTTLE_MS) return;
        throttleRef.current[key] = now;
      }

      channelRef.current.send({
        type: "broadcast",
        event: "signal",
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          insightId,
          type,
          action,
        },
      });
    },
    [currentUser],
  );

  return { state, emit };
}
