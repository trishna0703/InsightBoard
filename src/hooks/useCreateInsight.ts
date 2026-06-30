import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { CREATE_INSIGHT } from '../graphql/mutations/insights';
import { CREATE_INSIGHT_ACTIVITY } from '../graphql/mutations/activities';
import { INSERT_INSIGHT_TAGS } from '../graphql/mutations/tags';
import { GET_STAGE_COUNTS } from '../graphql/queries/insights';
import { InsightFormValues } from '../schemas/insightForm';
import { STAGE_VALUES } from './useInsights';
import { supabase } from '../services/supabase';
import Toast from 'react-native-toast-message';

export function useCreateInsight() {
  const [createInsight] = useMutation(CREATE_INSIGHT);
  const [createActivity] = useMutation(CREATE_INSIGHT_ACTIVITY);
  const [insertTags] = useMutation(INSERT_INSIGHT_TAGS);

  const create = useCallback(
    async (values: InsightFormValues) => {
      // Fetch userId from the live session at call-time — more reliable than
      // reading from a useState that may not have resolved yet.
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        Toast.show({ type: 'error', text1: 'Not authenticated', position: 'bottom' });
        throw new Error('Not authenticated');
      }

      const teamId = process.env.EXPO_PUBLIC_TEAM_ID ?? '';

      let insightId: string;

      // Apollo throws ApolloError on GraphQL errors (errorPolicy: 'none' default).
      // Catching here lets us show a toast before re-throwing.
      try {
        const { data } = await createInsight({
          variables: {
            objects: [
              {
                title: values.title,
                description: values.description,
                stage: STAGE_VALUES[values.stage],
                priority: values.priority,
                categoryId: values.categoryId ?? null,
                hcpId: values.hcpId ?? null,
                drugName: values.drugName ?? null,
                teamId,
                createdBy: userId,
                columnOrder: Math.floor(Date.now() / 1000),
              },
            ],
          },
          // Refetch counts immediately; the board list is refetched by
          // BoardScreen's explicit refetch() call after this hook returns.
          refetchQueries: [{ query: GET_STAGE_COUNTS }],
          awaitRefetchQueries: false,
        });

        const record = data?.insertIntoInsightsCollection?.records?.[0];
        if (!record?.id) throw new Error('Create returned no record');
        insightId = record.id as string;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useCreateInsight]', msg);
        Toast.show({
          type: 'error',
          text1: 'Failed to create insight',
          text2: msg.slice(0, 120),
          position: 'bottom',
          visibilityTime: 4000,
        });
        throw err;
      }

      // Await the activity so it's present the next time the detail panel opens.
      await createActivity({
        variables: {
          objects: [{ insightId, userId, teamId, action: 'created', newValue: values.title }],
        },
      }).catch((err) => {
        console.error('[useCreateInsight] activity log failed:', err instanceof Error ? err.message : err);
      });

      if (values.tagIds.length > 0) {
        void insertTags({
          variables: { objects: values.tagIds.map((tagId) => ({ insightId, tagId })) },
        }).catch(() => null);
      }

      Toast.show({
        type: 'success',
        text1: 'Insight created',
        position: 'bottom',
        visibilityTime: 2000,
      });

      return insightId;
    },
    [createInsight, createActivity, insertTags],
  );

  return { create };
}
