import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocSearchFacet } from '../DocSearch';
import { useFacetValues } from '../useFacetValues';

describe('useFacetValues', () => {
  const search = vi.fn();
  const searchClient = { search } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    search.mockResolvedValue({
      results: [
        {
          facets: {
            language: { en: 3, fr: 1 },
            version: { 'v1.0': 4 },
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches facet values once and merges them per facet', async () => {
    const facets: DocSearchFacet[] = [{ key: 'language' }, { key: 'version' }];

    const { result } = renderHook(() =>
      useFacetValues({
        facets,
        typesenseCollectionName: 'docs',
        searchClient,
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        language: ['en', 'fr'],
        version: ['v1.0'],
      });
    });

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({
      requests: [
        expect.objectContaining({
          collection: 'docs',
          facet_by: 'language,version',
          per_page: 0,
        }),
      ],
    });
  });

  it('sorts facet values without case or accent sensitivity', async () => {
    const localeCompare = vi.spyOn(String.prototype, 'localeCompare');
    search.mockResolvedValue({
      results: [
        {
          facets: {
            language: { zulu: 1, Éclair: 1, eclair: 1, alpha: 1 },
          },
        },
      ],
    });

    const { result } = renderHook(() =>
      useFacetValues({
        facets: [{ key: 'language' }],
        typesenseCollectionName: 'docs',
        searchClient,
      })
    );

    await waitFor(() => {
      expect(result.current.language).toEqual([
        'alpha',
        'Éclair',
        'eclair',
        'zulu',
      ]);
    });
    expect(localeCompare).toHaveBeenCalledWith(expect.any(String), undefined, {
      sensitivity: 'base',
    });
  });

  it('does not re-fetch when the facets prop is recreated with identical content', async () => {
    const { result, rerender } = renderHook(
      ({ facets }: { facets: DocSearchFacet[] }) =>
        useFacetValues({
          facets,
          typesenseCollectionName: 'docs',
          searchClient,
        }),
      { initialProps: { facets: [{ key: 'language' }] as DocSearchFacet[] } }
    );

    await waitFor(() => {
      expect(result.current.language).toBeDefined();
    });

    // New array/object identities but identical content (mirrors the
    // per-render prop recreation that previously caused an infinite loop).
    rerender({ facets: [{ key: 'language' }] });
    rerender({ facets: [{ key: 'language' }] });

    expect(search).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when the collection changes', async () => {
    const { result, rerender } = renderHook(
      ({ collection }: { collection: string }) =>
        useFacetValues({
          facets: [{ key: 'language' }],
          typesenseCollectionName: collection,
          searchClient,
        }),
      { initialProps: { collection: 'docs' } }
    );

    await waitFor(() => {
      expect(result.current.language).toBeDefined();
    });

    rerender({ collection: 'guides' });

    await waitFor(() => {
      expect(search).toHaveBeenCalledTimes(2);
    });
  });

  it('scopes the values to the given filter_by', async () => {
    const { rerender } = renderHook<unknown, { filterBy?: string }>(
      ({ filterBy }) =>
        useFacetValues({
          facets: [{ key: 'language' }],
          typesenseCollectionName: 'docs',
          searchClient,
          filterBy,
        }),
      { initialProps: { filterBy: 'version:=[`v1`]' } }
    );

    await waitFor(() => {
      expect(search).toHaveBeenCalledTimes(1);
    });
    expect(search.mock.calls[0][0].requests[0].filter_by).toBe(
      'version:=[`v1`]'
    );

    rerender({ filterBy: undefined });

    await waitFor(() => {
      expect(search).toHaveBeenCalledTimes(2);
    });
    expect(search.mock.calls[1][0].requests[0]).not.toHaveProperty('filter_by');
  });

  it('skips the request when no facets are configured', () => {
    renderHook(() =>
      useFacetValues({
        facets: [],
        typesenseCollectionName: 'docs',
        searchClient,
      })
    );

    expect(search).not.toHaveBeenCalled();
  });

  it('settles every facet without values when the request fails', async () => {
    search.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useFacetValues({
        facets: [{ key: 'language' }, { key: 'version' }],
        typesenseCollectionName: 'docs',
        searchClient,
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual({ language: [], version: [] });
    });
  });
});
