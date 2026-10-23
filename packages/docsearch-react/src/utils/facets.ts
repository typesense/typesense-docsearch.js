import type { DocSearchFacet } from '../DocSearch';

import type { FacetSelections } from './createDocSearchSources';

export const MAX_FACETS = 5;

export function normalizeFacets(
  facets: DocSearchFacet[] = []
): DocSearchFacet[] {
  const facetsMap = new Map<string, DocSearchFacet>();

  for (const facet of facets) {
    const key = facet.key.trim().toLowerCase();
    if (key.length === 0 || facetsMap.has(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (facetsMap.size >= MAX_FACETS) {
      break;
    }

    facetsMap.set(key, facet);
  }

  if (process.env.NODE_ENV !== 'production' && facets.length > MAX_FACETS) {
    // eslint-disable-next-line no-console
    console.warn(
      `DocSearch supports a maximum of ${MAX_FACETS} facets. Extra facets were ignored.`
    );
  }

  return Array.from(facetsMap.values());
}

export function getFacetLabel(facet: DocSearchFacet): string {
  if (facet.label) {
    return facet.label;
  }

  return facet.key
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Selections the FacetBar starts with, from each facet's `defaultValues`.
 * Values are stringified like the facet values Typesense returns, since untyped
 * configs may pass numbers or booleans.
 */
export function getDefaultFacetSelections(
  facets: DocSearchFacet[]
): FacetSelections {
  const selections: FacetSelections = {};

  for (const facet of facets) {
    if (facet.defaultValues?.length) {
      selections[facet.key] = Array.from(
        new Set(facet.defaultValues.map(String))
      );
    }
  }

  return selections;
}
