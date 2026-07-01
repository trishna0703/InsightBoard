import { useMutation, useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import { UPDATE_INSIGHT_FIELDS } from '../graphql/mutations/insights';
import { CREATE_INSIGHT_ACTIVITY } from '../graphql/mutations/activities';
import { INSERT_INSIGHT_TAGS, DELETE_INSIGHT_TAGS } from '../graphql/mutations/tags';
import { GET_INSIGHT_DETAIL } from '../graphql/queries/insights';
import { LIST_TAGS, LIST_CATEGORIES } from '../graphql/queries/tags';
import { Insight } from '../types';
import { InsightFormValues } from '../schemas/insightForm';
import { STAGE_VALUES } from './useInsights';
import { supabase } from '../services/supabase';
import { sendBoardBroadcast } from './useRealtimeBoard';
import Toast from 'react-native-toast-message';

const DIFFABLE_FIELDS: Array<{
  key: keyof InsightFormValues;
  fieldName: string;
  /** Compared against values[key] to detect a change — must be the same type (ID or value). */
  getOldKey: (i: Insight) => string | null;
  /** Human-readable label stored in the activity log; falls back to getOldKey when omitted. */
  getOldDisplay?: (i: Insight) => string | null;
}> = [
  { key: 'title',       fieldName: 'title',       getOldKey: (i) => i.title },
  { key: 'description', fieldName: 'description', getOldKey: (i) => i.description },
  { key: 'priority',    fieldName: 'priority',    getOldKey: (i) => i.priority },
  { key: 'stage',       fieldName: 'stage',       getOldKey: (i) => i.stage },
  { key: 'drugName',    fieldName: 'drugName',    getOldKey: (i) => i.drugName },
  // Compare by ID so the equality check works; store name for readability.
  { key: 'hcpId',      fieldName: 'hcp',         getOldKey: (i) => i.hcp?.id ?? null,   getOldDisplay: (i) => i.hcp?.name ?? null },
  { key: 'categoryId', fieldName: 'category',    getOldKey: (i) => i.categoryId,         getOldDisplay: (i) => i.category ?? null },
];

export function useUpdateInsight() {
  const client = useApolloClient();
  const [updateInsightFields] = useMutation(UPDATE_INSIGHT_FIELDS);
  const [createActivity] = useMutation(CREATE_INSIGHT_ACTIVITY);
  const [deleteTags] = useMutation(DELETE_INSIGHT_TAGS);
  const [insertTags] = useMutation(INSERT_INSIGHT_TAGS);

  const update = useCallback(
    async (original: Insight, values: InsightFormValues) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const userName =
        (session?.user?.user_metadata?.name as string | undefined) ??
        (session?.user?.user_metadata?.full_name as string | undefined) ??
        session?.user?.email ??
        'Someone';
      if (!userId) {
        Toast.show({ type: 'error', text1: 'Not authenticated', position: 'bottom' });
        throw new Error('Not authenticated');
      }

      try {
        await updateInsightFields({
          variables: {
            filter: { id: { eq: original.id } },
            set: {
              title: values.title,
              description: values.description,
              stage: STAGE_VALUES[values.stage],
              priority: values.priority,
              categoryId: values.categoryId ?? null,
              hcpId: values.hcpId ?? null,
              drugName: values.drugName ?? null,
            },
          },
          refetchQueries: [{ query: GET_INSIGHT_DETAIL, variables: { id: original.id } }],
          awaitRefetchQueries: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useUpdateInsight]', msg);
        Toast.show({
          type: 'error',
          text1: 'Failed to update insight',
          text2: msg.slice(0, 120),
          position: 'bottom',
          visibilityTime: 4000,
        });
        throw err;
      }

      const teamId = process.env.EXPO_PUBLIC_TEAM_ID ?? '';

      // Build name-lookup maps from Apollo cache — synchronous, no network needed.
      // LIST_CATEGORIES is loaded wholesale by the form (cache-first).
      // HCPs are normalized by Apollo from any autocomplete search that ran.
      const cachedCategories = client.readQuery<{
        categoriesCollection: { edges: { node: { id: string; name: string } }[] };
      }>({ query: LIST_CATEGORIES });
      const categoryNameById = new Map(
        cachedCategories?.categoriesCollection?.edges?.map((e) => [e.node.id, e.node.name]) ?? [],
      );

      // Apollo normalizes every HCP it has ever fetched under its nodeId key.
      // Scanning the full cache snapshot lets us resolve a UUID → name without
      // knowing the nodeId or re-running a query.
      const cacheSnapshot = client.cache.extract() as Record<string, unknown>;
      const hcpNameById = new Map(
        Object.values(cacheSnapshot)
          .filter((v): v is Record<string, unknown> =>
            typeof v === 'object' && v !== null &&
            (v as Record<string, unknown>).__typename === 'Hcps',
          )
          .map((v) => [v.id as string, v.name as string]),
      );

      function resolveNewDisplay(key: keyof InsightFormValues, rawVal: string | null): string | null {
        if (key === 'categoryId') return rawVal ? (categoryNameById.get(rawVal) ?? rawVal) : null;
        if (key === 'hcpId')      return rawVal ? (hcpNameById.get(rawVal)      ?? rawVal) : null;
        return rawVal;
      }

      // Diff fields → one activity entry per changed field
      const changedActivities = DIFFABLE_FIELDS.flatMap(({ key, fieldName, getOldKey, getOldDisplay }) => {
        const oldKey = getOldKey(original);
        const newKey = (values[key] ?? null) as string | null;
        if (oldKey === newKey) return [];
        return [{
          insightId: original.id, userId, teamId, action: 'updated', fieldName,
          oldValue: (getOldDisplay ?? getOldKey)(original),
          newValue: resolveNewDisplay(key, newKey),
        }];
      });

      // Tag diff
      const oldTagIds = new Set(original.tags.map((t) => t.id));
      const newTagIds = new Set(values.tagIds);
      const tagsChanged =
        oldTagIds.size !== newTagIds.size ||
        [...newTagIds].some((id) => !oldTagIds.has(id));

      if (tagsChanged) {
        // Resolve new tag IDs → names using the cached tag list (loaded by the
        // form's useTags hook with cache-first, so no network round-trip).
        const cachedTags = client.readQuery<{
          tagsCollection: { edges: { node: { id: string; name: string } }[] };
        }>({ query: LIST_TAGS });
        const tagNameById = new Map(
          cachedTags?.tagsCollection?.edges?.map((e) => [e.node.id, e.node.name]) ?? [],
        );

        changedActivities.push({
          insightId: original.id,
          userId,
          teamId,
          action: 'updated',
          fieldName: 'tags',
          oldValue: original.tags.map((t) => t.name).join(', ') || null,
          newValue: values.tagIds.map((id) => tagNameById.get(id) ?? id).join(', ') || null,
        });
      }

      // Await the activity so it exists before BoardScreen calls refetchDetail().
      // Tag mutations stay fire-and-forget since they don't show in the timeline.
      if (changedActivities.length > 0) {
        await createActivity({ variables: { objects: changedActivities } }).catch((err) => {
          console.error('[useUpdateInsight] activity log failed:', err instanceof Error ? err.message : err);
        });
      }

      if (tagsChanged) {
        void deleteTags({ variables: { insightId: original.id } })
          .then(() => {
            if (values.tagIds.length > 0) {
              return insertTags({
                variables: { objects: values.tagIds.map((tagId) => ({ insightId: original.id, tagId })) },
              });
            }
            return undefined;
          })
          .catch(() => null);
      }

      sendBoardBroadcast({
        action: 'updated',
        userId,
        userName,
        insightId: original.id,
        title: values.title,
      });

      Toast.show({ type: 'success', text1: 'Insight updated', position: 'bottom', visibilityTime: 2000 });
    },
    [client, updateInsightFields, createActivity, deleteTags, insertTags],
  );

  return { update };
}
