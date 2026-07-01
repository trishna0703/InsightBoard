import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { apolloClient } from "../services/apollo";
import { gql } from "@apollo/client";

const TEAM_ID = process.env.EXPO_PUBLIC_TEAM_ID!;

export const LIST_ACTIVITIES = gql`
  query ListActivities {
    insightActivitiesCollection(
      first: 50
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id
          insightId
          userId
          fieldName
          oldValue
          newValue
          createdAt
          insight {
            id
            title
            stage
          }
          user {
            id
            fullName
          }
        }
      }
    }
  }
`;

export interface ActivityEntry {
  id: string;
  insightId: string;
  insightTitle: string;
  insightStage: string;
  userId: string;
  userName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export function useActivityFeed(currentUserId: string | null) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const isOpenRef = useRef(false);

  // Initial fetch
  useEffect(() => {
    if (!currentUserId) return;

    apolloClient
      .query({ query: LIST_ACTIVITIES, fetchPolicy: "network-only" })
      .then(({ data }) => {
        const entries = transformActivities(data);
        setActivities(entries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUserId]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`activities:${TEAM_ID}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "insight_activities" },
        async (payload) => {
          const row = payload.new as Record<string, unknown>;

          // Refetch to get joined data (user name, insight title)
          const { data } = await apolloClient.query({
            query: LIST_ACTIVITIES,
            fetchPolicy: "network-only",
          });
          const entries = transformActivities(data);
          setActivities(entries);

          // Only increment unread if feed is closed and not our own action
          if (!isOpenRef.current && row.user_id !== currentUserId) {
            setUnreadCount((prev) => prev + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const markRead = () => {
    isOpenRef.current = true;
    setUnreadCount(0);
  };

  const markClosed = () => {
    isOpenRef.current = false;
  };

  const refetch = async () => {
    try {
      const { data } = await apolloClient.query({
        query: LIST_ACTIVITIES,
        fetchPolicy: 'network-only',
      });
      setActivities(transformActivities(data));
    } catch { /* ignore */ }
  };

  return { activities, unreadCount, loading, markRead, markClosed, refetch };
}

function transformActivities(data: Record<string, unknown>): ActivityEntry[] {
  const collection = data?.insightActivitiesCollection as {
    edges: { node: Record<string, unknown> }[];
  } | null;

  return (
    collection?.edges?.map(({ node }) => {
      const insight = node.insight as {
        id: string;
        title: string;
        stage: string;
      } | null;
      const user = node.user as { id: string; fullName: string } | null;

      return {
        id: node.id as string,
        insightId: node.insightId as string,
        insightTitle: insight?.title ?? "Unknown insight",
        insightStage: insight?.stage ?? "observation",
        userId: node.userId as string,
        userName: user?.fullName ?? "Someone",
        field: node.fieldName as string,
        oldValue: (node.oldValue as string | null) ?? null,
        newValue: (node.newValue as string | null) ?? null,
        createdAt: node.createdAt as string,
      };
    }) ?? []
  );
}
