import React from 'react';
import { SearchClient } from 'typesense';
import { SearchResponseAdapter as TypesenseSearchResponseAdapter } from 'typesense-instantsearch-adapter/lib/SearchResponseAdapter';

export function useSearchClient(
  typesenseServerConfig: object,
  transformSearchClient: (searchClient: SearchClient) => SearchClient
): SearchClient {
  return React.useMemo(() => {
    const typesense = new SearchClient(typesenseServerConfig);

    const client = {
      search: async ([request]) => {
        const response = await typesense.multiSearch.perform({
          searches: [request],
        });
        const typesenseSearchResponseAdapter = new TypesenseSearchResponseAdapter(
          response.results[0],
          {
            params: {
              ...request.params,
              highlightPreTag: '<mark>',
              highlightPostTag: '</mark>',
            },
          },
          {
            geoLocationField: '',
          }
        );
        return {
          results: [typesenseSearchResponseAdapter.adapt()],
        };
      },
    };

    return transformSearchClient(client);
  }, [transformSearchClient]);
}
