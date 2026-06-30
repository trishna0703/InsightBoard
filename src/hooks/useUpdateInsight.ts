import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { UPDATE_INSIGHT_FIELDS } from '../graphql/mutations/insights';
import { CREATE_INSIGHT_ACTIVITY } from '../graphql/mutations/activities';
import { INSERT_INSIGHT_TAGS, DELETE_INSIGHT_TAGS } from '../graphql/mutations/tags';
import { GET_INSIGHT_DETAIL } from '../graphql/queries/insights';
import { Insight } from '../types';
import { InsightFormValues } from '../schemas/insightForm';
import { STAGE_VALUES } from './useInsights';
import { supabase } from '../services/supabase';
import Toast from 'react-native-toast-message';

const DIFFABLE_FIELDS: Array<{
  key: keyof InsightFormValues;
  fieldName: string;
  getOld: (i: Insight) => string | null;
}> = [
  { key: 'title', fieldName: 'title', getOld: (i) => i.title },
  { key: 'description', fieldName: 'description', getOld: (i) => i.description },
  { key: 'priority', fieldName: 'priority', getOld: (i) => i.priority },
  { key: 'stage', fieldName: 'stage', getOld: (i) => i.stage },
  { key: 'drugName', fieldName: 'drugName', getOld: (i) => i.drugName },
  { key: 'hcpId', fieldName: 'hcp', getOld: (i) => i.hcp?.id ?? null },
  { key: 'categoryId', fieldName: 'category', getOld: (i) => i.categoryId },
];

export function useUpdateInsight() {
  const [updateInsightFields] = useMutation(UPDATE_INSIGHT_FIELDS);
  const [createActivity] = useMutation(CREATE_INSIGHT_ACTIVITY);
  const [deleteTags] = useMutation(DELETE_INSIGHT_TAGS);
  const [insertTags] = useMutation(INSERT_INSIGHT_TAGS);

  const update = useCallback(
    async (original: Insight, values: InsightFormValues) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
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

      // Diff fields → one activity entry per changed field
      const changedActivities = DIFFABLE_FIELDS.flatMap(({ key, fieldName, getOld }) => {
        const oldVal = getOld(original);
        const newVal = (values[key] ?? null) as string | null;
        if (oldVal === newVal) return [];
        return [{ insightId: original.id, userId, teamId, action: 'updated', fieldName, oldValue: oldVal, newValue: newVal }];
      });

      // Tag diff
      const oldTagIds = new Set(original.tags.map((t) => t.id));
      const newTagIds = new Set(values.tagIds);
      const tagsChanged =
        oldTagIds.size !== newTagIds.size ||
        [...newTagIds].some((id) => !oldTagIds.has(id));

      if (tagsChanged) {
        changedActivities.push({
          insightId: original.id,
          userId,
          teamId,
          action: 'updated',
          fieldName: 'tags',
          oldValue: original.tags.map((t) => t.name).join(', ') || null,
          newValue: values.tagIds.join(', ') || null,
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

      Toast.show({ type: 'success', text1: 'Insight updated', position: 'bottom', visibilityTime: 2000 });
    },
    [updateInsightFields, createActivity, deleteTags, insertTags],
  );

  return { update };
}
