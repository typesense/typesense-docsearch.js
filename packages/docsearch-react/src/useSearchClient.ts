import React from 'react';
import { SearchClient as TypesenseSearchClient } from 'typesense';
import type { SearchClient } from 'typesense-instantsearch-adapter';
import { SearchResponseAdapter as TypesenseSearchResponseAdapter } from 'typesense-instantsearch-adapter/lib/SearchResponseAdapter';
import type { ConfigurationOptions as TypesenseConfigurationOptions } from 'typesense/lib/Typesense/Configuration';

export function useSearchClient(
  typesenseServerConfig: TypesenseConfigurationOptions,
  transformSearchClient: (searchClient: SearchClient) => SearchClient
): SearchClient {
  return React.useMemo(() => {
    const typesense = new TypesenseSearchClient(typesenseServerConfig);

    const client = {
      search: async ([request]) => {
        const response = await typesense.multiSearch.perform({
          searches: [request],
        });
        const typesenseSearchResponseAdapter =
          new TypesenseSearchResponseAdapter(
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
  }, [transformSearchClient, typesenseServerConfig]);
}
