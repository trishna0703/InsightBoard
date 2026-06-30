import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { LIST_TAGS } from '../graphql/queries/tags';
import { Tag } from '../types';

export function useTags() {
  const { data, loading } = useQuery<{
    tagsCollection: { edges: { node: Tag }[] };
  }>(LIST_TAGS, { fetchPolicy: 'cache-first' });

  const tags: Tag[] = useMemo(
    () => data?.tagsCollection?.edges?.map((e) => e.node) ?? [],
    [data],
  );

  return { tags, loading };
}
