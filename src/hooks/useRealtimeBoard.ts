import { useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import Toast from 'react-native-toast-message';
import { supabase } from '../services/supabase';
import { LIST_INSIGHTS, GET_INSIGHT_DETAIL } from '../graphql/queries/insights';
import { InsightStage } from '../types';
import { STAGE_VALUES } from './useInsights';

// Reverse map: db value "observation" → display name "Observation"
const STAGE_DISPLAY: Record<string, InsightStage> = Object.entries(STAGE_VALUES).reduce(
  (acc, [display, value]) => ({ ...acc, [value]: display as InsightStage }),
  {} as Record<string, InsightStage>,
);

const TEAM_ID = process.env.EXPO_PUBLIC_TEAM_ID!;

// ── Broadcast payload ──────────────────────────────────────────────────────────
// Sent alongside every mutation so other users know who did what.
// Echo-suppressed by comparing userId with the receiver's own ID.
export type BoardBroadcastPayload =
  | { action: 'created'; userId: string; userName: string; insightId: string; title: string; stage: string }
  | { action: 'moved';   userId: string; userName: string; insightId: string; title: string; fromStage: string; toStage: string }
  | { action: 'updated'; userId: string; userName: string; insightId: string; title: string };

// Module-level ref to the subscribed channel.
// Set when useRealtimeBoard mounts, cleared on unmount.
// Lets any mutation hook call sendBoardBroadcast() without prop-drilling.
let _boardChannel: ReturnType<typeof supabase.channel> | null = null;

export function sendBoardBroadcast(payload: BoardBroadcastPayload): void {
  _boardChannel?.send({ type: 'broadcast', event: 'insight_change', payload });
}

// Card IDs that just arrived from another user's create.
// InsightCard checks this on mount to decide whether to play the fade-in animation.
export const recentlyArrivedIds = new Set<string>();

// ── Postgres row shape from Realtime payload ───────────────────────────────────
interface RealtimeInsightRow {
  id: string;
  title: string;
  stage: string;
  priority: string;
  column_order: number;
  created_at: string;
  updated_at: string;
  hcp_id: string | null;
  category_id: string | null;
  drug_name: string | null;
  description: string;
  created_by: string;
}

export function useRealtimeBoard(
  currentUserId: string | null,
  /** ID of the insight whose detail panel is currently open; null when closed. */
  openDetailId: string | null = null,
  /** Fires when a remote user edits the currently-open detail insight.
   *  Receives the list of changed field names for yellow-flash highlighting. */
  onDetailChanged?: (changedFields: string[]) => void,
  /** Fires on any broadcast from another user (created/moved/updated).
   *  Use this to trigger side-effects like refreshing the activity feed. */
  onRemoteBroadcast?: () => void,
): void {
  const client = useApolloClient();

  // Refs let the subscription closure always read the latest values
  // without needing to be recreated on every render.
  const openDetailIdRef = useRef(openDetailId);
  const onDetailChangedRef = useRef(onDetailChanged);
  const onRemoteBroadcastRef = useRef(onRemoteBroadcast);

  useEffect(() => { openDetailIdRef.current = openDetailId; }, [openDetailId]);
  useEffect(() => { onDetailChangedRef.current = onDetailChanged; }, [onDetailChanged]);
  useEffect(() => { onRemoteBroadcastRef.current = onRemoteBroadcast; }, [onRemoteBroadcast]);

  useEffect(() => {
    if (!currentUserId) return;

    // ── Cache helpers (defined inside effect so they capture stable `client`) ──

    function handleCacheInsert(row: RealtimeInsightRow) {
      const filter = { stage: { eq: row.stage } };
      try {
        const existing = client.readQuery<{
          insightsCollection: {
            edges: { node: Record<string, unknown> }[];
            pageInfo: { hasNextPage: boolean; endCursor: string };
          };
        }>({ query: LIST_INSIGHTS, variables: { filter } });

        if (existing) {
          const alreadyExists = existing.insightsCollection.edges.some((e) => e.node.id === row.id);
          if (!alreadyExists) {
            client.writeQuery({
              query: LIST_INSIGHTS,
              variables: { filter },
              data: {
                insightsCollection: {
                  ...existing.insightsCollection,
                  edges: [
                    { __typename: 'InsightsEdge', node: rowToNode(row) },
                    ...existing.insightsCollection.edges,
                  ],
                },
              },
            });
          }
        }
      } catch { /* cache miss — next query will pick it up */ }

      client.refetchQueries({ include: ['GetStageCounts'] });
    }

    function handleCacheUpdate(newRow: RealtimeInsightRow, oldRow: Partial<RealtimeInsightRow>) {
      const newStage = STAGE_DISPLAY[newRow.stage];
      const oldStage = oldRow.stage ? STAGE_DISPLAY[oldRow.stage] : null;
      const stageChanged = oldStage && newStage && oldStage !== newStage;

      if (stageChanged) {
        // Remove from old stage list
        const oldFilter = { stage: { eq: oldRow.stage } };
        try {
          const oldData = client.readQuery<{
            insightsCollection: { edges: { node: { id: string } }[]; pageInfo: object };
          }>({ query: LIST_INSIGHTS, variables: { filter: oldFilter } });
          if (oldData) {
            client.writeQuery({
              query: LIST_INSIGHTS,
              variables: { filter: oldFilter },
              data: {
                insightsCollection: {
                  ...oldData.insightsCollection,
                  edges: oldData.insightsCollection.edges.filter((e) => e.node.id !== newRow.id),
                },
              },
            });
          }
        } catch { /* cache miss */ }

        // Prepend to new stage list
        const newFilter = { stage: { eq: newRow.stage } };
        try {
          const newData = client.readQuery<{
            insightsCollection: { edges: { node: Record<string, unknown> }[]; pageInfo: object };
          }>({ query: LIST_INSIGHTS, variables: { filter: newFilter } });
          if (newData) {
            const alreadyExists = newData.insightsCollection.edges.some((e) => e.node.id === newRow.id);
            if (!alreadyExists) {
              client.writeQuery({
                query: LIST_INSIGHTS,
                variables: { filter: newFilter },
                data: {
                  insightsCollection: {
                    ...newData.insightsCollection,
                    edges: [
                      { __typename: 'InsightsEdge', node: rowToNode(newRow) },
                      ...newData.insightsCollection.edges,
                    ],
                  },
                },
              });
            }
          }
        } catch { /* cache miss */ }

        client.refetchQueries({ include: ['GetStageCounts'] });
      } else if (newStage) {
        // Non-stage edit: patch only scalar fields in the cached node.
        // Preserve existing relation objects (hcp, category, insightTagsCollection)
        // because the Postgres row doesn't carry join data. Only null out a relation
        // when its FK actually changed; the concurrent GetInsightDetail refetch will
        // fill in the correct joined value.
        const filter = { stage: { eq: newRow.stage } };
        try {
          const data = client.readQuery<{
            insightsCollection: { edges: { node: Record<string, unknown> }[]; pageInfo: object };
          }>({ query: LIST_INSIGHTS, variables: { filter } });
          if (data) {
            client.writeQuery({
              query: LIST_INSIGHTS,
              variables: { filter },
              data: {
                insightsCollection: {
                  ...data.insightsCollection,
                  edges: data.insightsCollection.edges.map((e) => {
                    if (e.node.id !== newRow.id) return e;
                    const existingHcpId = (e.node.hcp as { id?: string } | null)?.id ?? null;
                    const existingCatId = (e.node.category as { id?: string } | null)?.id ?? null;
                    return {
                      ...e,
                      node: {
                        ...e.node,
                        title: newRow.title,
                        description: newRow.description,
                        stage: newRow.stage,
                        priority: newRow.priority,
                        columnOrder: newRow.column_order,
                        drugName: newRow.drug_name,
                        updatedAt: newRow.updated_at,
                        hcp: newRow.hcp_id !== existingHcpId ? null : e.node.hcp,
                        category: newRow.category_id !== existingCatId ? null : e.node.category,
                        insightTagsCollection: e.node.insightTagsCollection,
                      },
                    };
                  }),
                },
              },
            });
          }
        } catch { /* cache miss */ }
      }

      // If the detail panel is open for this insight, always refetch so the
      // drawer shows fresh data. Detect changed fields by comparing the incoming
      // row against the current cache — payload.old only carries the PK under
      // Supabase's default REPLICA IDENTITY so we cannot rely on it.
      if (newRow.id === openDetailIdRef.current) {
        client.refetchQueries({ include: ['GetInsightDetail'] });
        if (onDetailChangedRef.current) {
          const changedFields = detectChangedFieldsVsCache(client, newRow, openDetailIdRef.current);
          if (changedFields.length > 0) {
            onDetailChangedRef.current(changedFields);
          }
        }
      }
    }

    // ── Broadcast handler: toasts + fade animation markers ───────────────────

    function handleBroadcast(payload: BoardBroadcastPayload) {
      // Notify listeners (e.g. activity feed) that a remote user acted.
      onRemoteBroadcastRef.current?.();
      // currentUserId is captured from the outer effect scope — stable for the
      // effect's lifetime. If the user changes, the effect re-runs with a new closure.
      switch (payload.action) {
        case 'created':
          // Mark card so InsightCard plays a fade-in on mount
          recentlyArrivedIds.add(payload.insightId);
          setTimeout(() => recentlyArrivedIds.delete(payload.insightId), 8000);
          Toast.show({
            type: 'info',
            text1: `${payload.userName} added a new insight`,
            text2: payload.title,
            position: 'bottom',
            visibilityTime: 3000,
          });
          break;
        case 'moved':
          Toast.show({
            type: 'info',
            text1: `${payload.userName} moved insight to ${payload.toStage}`,
            text2: payload.title,
            position: 'bottom',
            visibilityTime: 3000,
          });
          break;
        case 'updated':
          Toast.show({
            type: 'info',
            text1: `${payload.userName} updated an insight`,
            text2: payload.title,
            position: 'bottom',
            visibilityTime: 3000,
          });
          break;
      }
    }

    // ── Subscribe ─────────────────────────────────────────────────────────────

    const channel = supabase
      .channel(`board:${TEAM_ID}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'insights' }, (payload) => {
        const row = payload.new as RealtimeInsightRow;
        if (row?.id) handleCacheInsert(row);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'insights' }, (payload) => {
        const newRow = payload.new as RealtimeInsightRow;
        const oldRow = payload.old as Partial<RealtimeInsightRow>;
        if (newRow?.id) handleCacheUpdate(newRow, oldRow);
      })
      .on('broadcast', { event: 'insight_change' }, ({ payload }: { payload: BoardBroadcastPayload }) => {
        if (!payload || payload.userId === currentUserId) return;
        handleBroadcast(payload);
      })
      .subscribe();

    _boardChannel = channel;

    return () => {
      supabase.removeChannel(channel);
      _boardChannel = null;
    };
  }, [currentUserId, client]);
}

// ── Module-level helpers (no closure deps) ────────────────────────────────────

// Compare the incoming Postgres row against what Apollo currently has cached for
// the detail query. payload.old is unreliable under Supabase's default REPLICA
// IDENTITY (only the PK is returned), so we diff against the cache instead.
function detectChangedFieldsVsCache(
  client: import('@apollo/client').ApolloClient<object>,
  newRow: RealtimeInsightRow,
  insightId: string,
): string[] {
  let cached: Record<string, unknown> | null = null;
  try {
    const data = client.readQuery<{
      insightsCollection: { edges: { node: Record<string, unknown> }[] };
    }>({ query: GET_INSIGHT_DETAIL, variables: { id: insightId } });
    cached = data?.insightsCollection?.edges?.[0]?.node ?? null;
  } catch { /* cache miss — can't highlight but refetch still runs */ }

  if (!cached) return [];

  const checks: Array<{ rowKey: keyof RealtimeInsightRow; fieldName: string; cacheVal: unknown }> = [
    { rowKey: 'title',       fieldName: 'title',       cacheVal: cached.title },
    { rowKey: 'description', fieldName: 'description', cacheVal: cached.description },
    { rowKey: 'priority',    fieldName: 'priority',    cacheVal: cached.priority },
    { rowKey: 'stage',       fieldName: 'stage',       cacheVal: cached.stage },
    { rowKey: 'drug_name',   fieldName: 'drugName',    cacheVal: cached.drugName },
    { rowKey: 'hcp_id',      fieldName: 'hcp',         cacheVal: (cached.hcp as { id?: string } | null)?.id ?? null },
    { rowKey: 'category_id', fieldName: 'category',    cacheVal: (cached.category as { id?: string } | null)?.id ?? null },
  ];

  return checks
    .filter(({ rowKey, cacheVal }) => newRow[rowKey] !== cacheVal)
    .map(({ fieldName }) => fieldName);
}

function rowToNode(row: RealtimeInsightRow): Record<string, unknown> {
  return {
    __typename: 'Insights',
    nodeId: `insights:${row.id}`,
    id: row.id,
    title: row.title,
    description: row.description,
    stage: row.stage,
    priority: row.priority,
    columnOrder: row.column_order,
    drugName: row.drug_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hcp: null,
    category: null,
    insightTagsCollection: { edges: [] },
  };
}
