import type { SearchResponses } from 'algoliasearch/lite';
import React from 'react';
import { SearchClient as TypesenseSearchClient } from 'typesense';
import { SearchResponseAdapter as TypesenseSearchResponseAdapter } from 'typesense-instantsearch-adapter/lib/SearchResponseAdapter';
import type { ConfigurationOptions as TypesenseConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import type {
  DocumentSchema,
  SearchResponse as TypesenseSearchResponse,
} from 'typesense/lib/Typesense/Documents';
import type { MultiSearchRequestSchema } from 'typesense/lib/Typesense/Types';

import type { TypesenseDocsearchTransformClient } from './DocSearch';

type AdaptedSearchResponse<T extends DocumentSchema> = {
  hits: Array<AdaptedHit<T>>;
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets: Record<string, Record<string, number>>;
  facets_stats: Record<string, Record<string, number>>;
  query: string;
  processingTimeMS: number;
  renderingContent?: Record<string, unknown>;
  appliedRules?: Array<Record<string, unknown>>;
  userData?: unknown[];
  parsed_nl_query?: TypesenseSearchResponse<T>['parsed_nl_query'];
};

type AdaptedHit<T extends DocumentSchema> = T & {
  objectID: string;
  // eslint-disable-next-line no-warning-comments
  // TODO: find the exact types for these (this is written in js and I'm just winging it)
  _snippetResult?: Record<string, any>;
  _highlightResult?: Record<string, any>;
  _rawTypesenseHit?: unknown;
  _rawTypesenseConversation?: unknown;
  _geoloc?: { lat: number; lng: number };
  group_key?: string;
  _group_key?: string;
  _group_found?: number;
  _grouped_hits?: Array<AdaptedHit<T>>;
};

export function useSearchClient(
  transformSearchClient: (
    searchClient: TypesenseDocsearchTransformClient
  ) => TypesenseDocsearchTransformClient,
  typesenseServerConfig: TypesenseConfigurationOptions
): TypesenseDocsearchTransformClient {
  const searchClient = React.useMemo(() => {
    const typesense = new TypesenseSearchClient({
      ...typesenseServerConfig,
      // Autocomplete refreshes on focus. Cache identical requests and in-flight searches by default.
      cacheSearchResultsForSeconds:
        typesenseServerConfig.cacheSearchResultsForSeconds ?? Infinity,
    });

    const client: TypesenseDocsearchTransformClient = {
      search: async <T extends DocumentSchema>({
        requests,
      }: {
        requests: Array<MultiSearchRequestSchema<T, string>>;
      }): Promise<SearchResponses<T>> => {
        const [request] = requests;
        if (!request) {
          return { results: [] };
        }

        const response = await typesense.multiSearch.perform<[T]>({
          searches: [request],
        });

        const typesenseSearchResponseAdapter =
          new TypesenseSearchResponseAdapter(
            response.results[0],
            {
              params: {
                ...request,
                highlightPreTag: '<mark>',
                highlightPostTag: '</mark>',
              },
            },
            {
              geoLocationField: '',
            }
          );

        const adapted: AdaptedSearchResponse<T> =
          typesenseSearchResponseAdapter.adapt();

        return {
          results: [
            {
              ...adapted,
              index: request.collection,
              params: '',
            },
          ],
        };
      },
    };

    return transformSearchClient(client);
  }, [transformSearchClient, typesenseServerConfig]);

  return searchClient;
}
