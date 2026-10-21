import type {
  AutocompleteSource,
  AutocompleteState,
} from '@algolia/autocomplete-core';
import type { SearchResponse } from 'algoliasearch/lite';
import type React from 'react';
import type { MultiSearchRequestSchema } from 'typesense/lib/Typesense/Types';

import type { DocSearchProps } from '../DocSearch';
import type {
  DocSearchHit,
  DocSearchState,
  InternalDocSearchHit,
} from '../types';
import type { useSearchClient } from '../useSearchClient';

import { SOURCE_IDS } from './collections';
import { groupBy } from './groupBy';
import { identity } from './identity';
import { isModifierEvent } from './isModifierEvent';
import { removeHighlightTags } from './removeHighlightTags';

export type BuildQuerySourcesState = Pick<
  AutocompleteState<InternalDocSearchHit>,
  'context'
>;

export type StoredSearchesLike<TItem> = {
  getAll: () => TItem[];
};

/**
 * Selected values per facet key. An empty array means nothing is selected for
 * that facet.
 */
export type FacetSelections = Record<string, string[]>;

/**
 * Next selected values for a facet, or an updater that receives the current
 * values. Updaters are resolved against the always-current selections so
 * toggles can't lose selections to stale props.
 */
export type FacetSelectionUpdate =
  | string[]
  | ((currentValues: string[]) => string[]);

/**
 * Backtick-quotes a facet value so it can contain spaces and punctuation.
 * Booleans and numbers stay bare so filters on `bool` and numeric facet fields
 * still parse, matching typesense-instantsearch-adapter.
 */
function escapeFacetValue(value: string): string {
  if (
    value === 'true' ||
    value === 'false' ||
    (value.trim() !== '' && Number.isFinite(Number(value)))
  ) {
    return value;
  }

  return `\`${value}\``;
}

/**
 * Translates the FacetBar selections into a Typesense `filter_by` expression.
 * Values of one facet are ORed and facets are ANDed:
 *
 *     { language: ['en', 'fr'], version: ['v2'] }
 *     → language:=[`en`,`fr`] && version:=[`v2`]
 *
 * Facets without values contribute nothing.
 */
export function createFilterBy(facetSelections: FacetSelections): string {
  return Object.entries(facetSelections)
    .filter(([, values]) => values.length > 0)
    .map(
      ([facet, values]) =>
        `${facet}:=[${values.map(escapeFacetValue).join(',')}]`
    )
    .join(' && ');
}

export function buildNoQuerySources({
  recentSearches,
  favoriteSearches,
  saveRecentSearch,
  onClose,
  disableUserPersonalization,
}: {
  recentSearches: StoredSearchesLike<unknown>;
  favoriteSearches: StoredSearchesLike<unknown>;
  saveRecentSearch: (item: InternalDocSearchHit) => void;
  onClose: () => void;
  disableUserPersonalization: boolean;
}): Array<AutocompleteSource<InternalDocSearchHit>> {
  if (disableUserPersonalization) {
    return [];
  }

  return [
    {
      sourceId: SOURCE_IDS.favoriteSearches,
      onSelect({ item, event }): void {
        saveRecentSearch(item);
        if (!isModifierEvent(event)) {
          onClose();
        }
      },
      getItemUrl({ item }): string {
        return item.url;
      },
      getItems(): InternalDocSearchHit[] {
        return favoriteSearches.getAll() as InternalDocSearchHit[];
      },
    },
    {
      sourceId: SOURCE_IDS.recentSearches,
      onSelect({ item, event }): void {
        saveRecentSearch(item);
        if (!isModifierEvent(event)) {
          onClose();
        }
      },
      getItemUrl({ item }): string {
        return item.url;
      },
      getItems(): InternalDocSearchHit[] {
        return recentSearches.getAll() as InternalDocSearchHit[];
      },
    },
  ];
}

const TYPESENSE_HIERARCHY_FIELDS = [
  'hierarchy.lvl0',
  'hierarchy.lvl1',
  'hierarchy.lvl2',
  'hierarchy.lvl3',
  'hierarchy.lvl4',
  'hierarchy.lvl5',
  'hierarchy.lvl6',
  'content',
].join(',');

export async function buildTypesenseQuerySources({
  query,
  state: sourcesState,
  setContext,
  searchClient,
  typesenseCollectionName,
  typesenseSearchParameters,
  maxResultsPerGroup,
  transformItems = identity,
  saveRecentSearch,
  onClose,
  facetSelections,
}: {
  query: string;
  state: BuildQuerySourcesState;
  setContext: (
    context: Partial<DocSearchState<InternalDocSearchHit>['context']>
  ) => void;
  searchClient: ReturnType<typeof useSearchClient>;
  typesenseCollectionName: string;
  typesenseSearchParameters?: DocSearchProps['typesenseSearchParameters'];
  maxResultsPerGroup?: number;
  transformItems?: DocSearchProps['transformItems'];
  saveRecentSearch: (item: InternalDocSearchHit) => void;
  onClose: () => void;
  facetSelections?: React.MutableRefObject<FacetSelections>;
}): Promise<Array<AutocompleteSource<InternalDocSearchHit>>> {
  try {
    const filterBy = createFilterBy(facetSelections?.current ?? {});

    const typesenseRequest: MultiSearchRequestSchema<DocSearchHit, string> = {
      collection: typesenseCollectionName,
      q: query,
      query_by: TYPESENSE_HIERARCHY_FIELDS,
      include_fields: `${TYPESENSE_HIERARCHY_FIELDS},anchor,url,type,id`,
      highlight_full_fields: TYPESENSE_HIERARCHY_FIELDS,
      group_by: 'url',
      group_limit: 3,
      sort_by: 'item_priority:desc',
      snippet_threshold: 8,
      highlight_affix_num_tokens: 4,
      ...(typesenseSearchParameters ?? {}),
      // Like typesense-instantsearch-adapter, FacetBar selections replace the
      // caller's `filter_by`, which only applies while nothing is selected.
      ...(filterBy ? { filter_by: filterBy } : {}),
    };

    const { results } = await searchClient.search<DocSearchHit>({
      requests: [typesenseRequest],
    });

    const result = results[0] as SearchResponse<DocSearchHit>;
    const { hits, nbHits } = result;
    const transformedHits = transformItems(hits);
    const sources = groupBy<DocSearchHit>(
      transformedHits,
      (hit) => removeHighlightTags(hit),
      maxResultsPerGroup
    );

    // We store the `lvl0`s to display them as search suggestions
    // in the "no results" screen.
    if (
      (sourcesState.context.searchSuggestions as unknown[]).length <
      Object.keys(sources).length
    ) {
      setContext({
        searchSuggestions: {
          ...(sourcesState.context.searchSuggestions ?? []),
          ...Object.keys(sources),
        },
      });
    }

    if (nbHits) {
      const currentNbHits = sourcesState.context.nbHits as number | undefined;
      setContext({
        nbHits: (currentNbHits ?? 0) + nbHits,
      });
    }

    return Object.values<DocSearchHit[]>(sources).map((items, index) => ({
      sourceId: `hits_${typesenseCollectionName}_${index}`,
      onSelect({ item, event }): void {
        saveRecentSearch(item);
        if (!isModifierEvent(event)) {
          onClose();
        }
      },
      getItemUrl({ item }): string {
        return item.url;
      },
      getItems(): InternalDocSearchHit[] {
        return Object.values(
          groupBy(items, (item) => item.hierarchy.lvl1, maxResultsPerGroup)
        )
          .map((groupedHits) =>
            groupedHits.map((item) => {
              let parent: InternalDocSearchHit | null = null;

              const potentialParent = groupedHits.find(
                (siblingItem) =>
                  siblingItem.type === 'lvl1' &&
                  siblingItem.hierarchy.lvl1 === item.hierarchy.lvl1
              ) as InternalDocSearchHit | undefined;

              if (item.type !== 'lvl1' && potentialParent) {
                parent = potentialParent;
              }

              return {
                ...item,
                __docsearch_parent: parent,
              };
            })
          )
          .flat();
      },
    }));
  } catch (error) {
    // Report the failure as an empty source instead of rejecting: autocomplete
    // resets `status` to `idle` once a request settles, but applies resolved
    // collections in request order, so a stale response can't hide the error
    // and the next successful search replaces it.
    // eslint-disable-next-line no-console
    console.error(error);
    return [{ sourceId: SOURCE_IDS.searchError, getItems: () => [] }];
  }
}
