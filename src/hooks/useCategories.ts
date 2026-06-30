import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { LIST_CATEGORIES } from '../graphql/queries/tags';
import { CategoryRecord } from '../types';

export function useCategories() {
  const { data, loading } = useQuery<{
    categoriesCollection: { edges: { node: CategoryRecord }[] };
  }>(LIST_CATEGORIES, { fetchPolicy: 'cache-first' });

  const categories: CategoryRecord[] = useMemo(
    () => data?.categoriesCollection?.edges?.map((e) => e.node) ?? [],
    [data],
  );

  return { categories, loading };
}
