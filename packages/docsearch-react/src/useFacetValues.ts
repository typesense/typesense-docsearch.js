import React from 'react';
import type { DocumentSchema } from 'typesense/lib/Typesense/Documents';

import type { DocSearchFacet } from './DocSearch';
import type { DocSearchHit } from './types';
import type { useSearchClient } from './useSearchClient';

export type FacetValues = Record<string, string[]>;

// The search client adapts Typesense's `facet_counts` into the InstantSearch
// shape: value counts keyed by facet field.
type AdaptedFacetCounts = {
  facets?: Record<string, Record<string, number>>;
};

export function useFacetValues({
  facets,
  typesenseCollectionName,
  searchClient,
  filterBy,
}: {
  facets: DocSearchFacet[];
  typesenseCollectionName: string;
  searchClient: ReturnType<typeof useSearchClient>;
  /**
   * The caller's `filter_by`, so menus only list values that can match inside
   * the scope it sets.
   */
  filterBy?: string;
}): FacetValues {
  const [facetValues, setFacetValues] = React.useState<FacetValues>({});

  // Derive a stable string key so the effect only re-runs when the actual facet
  // keys change, not on every render (the `facets` prop is recreated on each
  // render and would otherwise loop).
  const stableFacetKeys = facets.map((facet) => facet.key).join(',');

  React.useEffect(() => {
    let isMounted = true;

    const facetKeys = stableFacetKeys ? stableFacetKeys.split(',') : [];

    if (facetKeys.length === 0 || !typesenseCollectionName) {
      return () => {
        isMounted = false;
      };
    }

    searchClient
      .search<DocSearchHit & DocumentSchema>({
        requests: [
          {
            collection: typesenseCollectionName,
            q: '*',
            per_page: 0,
            facet_by: facetKeys.join(','),
            max_facet_values: 100,
            ...(filterBy ? { filter_by: filterBy } : {}),
          },
        ],
      })
      .then(({ results }) => {
        if (!isMounted) {
          return;
        }

        const { facets: facetCounts = {} } = (results[0] ??
          {}) as AdaptedFacetCounts;

        const valuesByFacet = facetKeys.reduce<FacetValues>((acc, facet) => {
          acc[facet] = Object.keys(facetCounts[facet] ?? {}).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          );
          return acc;
        }, {});

        setFacetValues(valuesByFacet);
      })
      .catch(() => {
        if (isMounted) {
          setFacetValues({});
        }
      });

    return () => {
      isMounted = false;
    };
  }, [stableFacetKeys, typesenseCollectionName, searchClient, filterBy]);

  return facetValues;
}
