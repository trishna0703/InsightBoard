import { useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { LIST_HCPS } from '../graphql/queries/hcps';
import { HCP } from '../types';
import { useDebounce } from './useDebounce';

type RawHCP = { id: string; name: string; specialty: string; institution: string };

export function useHCPs() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const hasSearch = debouncedSearch.trim().length > 0;

  const { data, loading } = useQuery<{
    hcpsCollection: { edges: { node: RawHCP }[] };
  }>(LIST_HCPS, {
    variables: { search: `%${debouncedSearch.trim()}%` },
    skip: !hasSearch,
    fetchPolicy: 'cache-and-network',
  });

  const hcps: HCP[] = useMemo(
    () =>
      data?.hcpsCollection?.edges?.map((e) => ({
        id: e.node.id,
        name: e.node.name,
        specialty: e.node.specialty,
        institution: e.node.institution,
      })) ?? [],
    [data],
  );

  return { hcps, loading, search, setSearch };
}
