import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DocSearchFacet,
  TypesenseDocsearchTransformClient,
} from '../../DocSearch';
import { useDocSearchFacets } from '../useDocSearchFacets';

describe('useDocSearchFacets', () => {
  const search = vi.fn();
  const searchClient = {
    search,
  } as unknown as TypesenseDocsearchTransformClient;
  const typesenseCollectionName = 'docs';

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

  it('exposes only facets that have values', async () => {
    const facets: DocSearchFacet[] = [
      { key: 'language' },
      { key: 'version' },
      { key: 'empty' },
    ];

    const { result } = renderHook(() =>
      useDocSearchFacets({ facets, typesenseCollectionName, searchClient })
    );

    expect(result.current.visibleFacets).toEqual([]);

    await waitFor(() => {
      expect(result.current.visibleFacets).toEqual([
        { key: 'language', values: ['en', 'fr'] },
        { key: 'version', values: ['v1.0'] },
      ]);
    });
  });

  it('updates selections state, ref, and notifies on selection change', () => {
    const onSelectionsChange = vi.fn();
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
        onSelectionsChange,
      })
    );

    act(() => {
      result.current.handleFacetSelectionChange('language', ['en']);
    });

    expect(result.current.facetSelections).toEqual({ language: ['en'] });
    expect(result.current.facetSelectionsRef.current).toEqual({
      language: ['en'],
    });
    expect(onSelectionsChange).toHaveBeenCalledTimes(1);
  });

  it('starts with nothing selected', () => {
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
      })
    );

    expect(result.current.facetSelections).toEqual({});
  });

  it('supports multiple selected values per facet', () => {
    const onSelectionsChange = vi.fn();
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
        onSelectionsChange,
      })
    );

    act(() => {
      result.current.handleFacetSelectionChange('language', ['en', 'fr']);
    });

    expect(result.current.facetSelections).toEqual({ language: ['en', 'fr'] });
    expect(onSelectionsChange).toHaveBeenCalledTimes(1);
  });

  it('resolves functional updates against the current selections', () => {
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
      })
    );

    // Two toggles in the same act: the second must see the first's result.
    act(() => {
      result.current.handleFacetSelectionChange('language', (current) => [
        ...current,
        'en',
      ]);
      result.current.handleFacetSelectionChange('language', (current) => [
        ...current,
        'fr',
      ]);
    });

    expect(result.current.facetSelections).toEqual({ language: ['en', 'fr'] });
  });

  it('does not notify when the selected values are unchanged', () => {
    const onSelectionsChange = vi.fn();
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
        onSelectionsChange,
      })
    );

    act(() => {
      result.current.handleFacetSelectionChange('language', ['en', 'fr']);
    });
    act(() => {
      result.current.handleFacetSelectionChange('language', ['en', 'fr']);
    });

    expect(onSelectionsChange).toHaveBeenCalledTimes(1);
  });

  it('does not notify when clearing a facet that has no selection', () => {
    const onSelectionsChange = vi.fn();
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
        onSelectionsChange,
      })
    );

    act(() => {
      result.current.handleFacetSelectionChange('language', []);
    });

    expect(result.current.facetSelections).toEqual({});
    expect(onSelectionsChange).not.toHaveBeenCalled();
  });

  it('updates the ref synchronously so getSources closures read fresh selections', () => {
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
      })
    );

    let refValueDuringChange: Record<string, string[]> | undefined;
    act(() => {
      result.current.handleFacetSelectionChange('language', ['fr']);
      refValueDuringChange = { ...result.current.facetSelectionsRef.current };
    });

    expect(refValueDuringChange).toEqual({ language: ['fr'] });
  });

  it('clears all selections and notifies', () => {
    const onSelectionsChange = vi.fn();
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
        onSelectionsChange,
      })
    );

    act(() => {
      result.current.handleFacetSelectionChange('language', ['en', 'fr']);
    });
    act(() => {
      result.current.clearFacetSelections();
    });

    expect(result.current.facetSelections).toEqual({});
    expect(result.current.facetSelectionsRef.current).toEqual({});
    expect(onSelectionsChange).toHaveBeenCalledTimes(2);
  });

  it('does not notify when clearing all with no selected values', () => {
    const onSelectionsChange = vi.fn();
    const { result } = renderHook(() =>
      useDocSearchFacets({
        facets: [{ key: 'language' }],
        typesenseCollectionName,
        searchClient,
        onSelectionsChange,
      })
    );

    act(() => {
      result.current.handleFacetSelectionChange('language', ['en']);
    });
    act(() => {
      result.current.handleFacetSelectionChange('language', []);
    });
    act(() => {
      result.current.clearFacetSelections();
    });

    expect(result.current.facetSelections).toEqual({ language: [] });
    expect(onSelectionsChange).toHaveBeenCalledTimes(2);
  });

  it('keeps selection callbacks stable across renders', () => {
    const { result, rerender } = renderHook(
      ({ onSelectionsChange }: { onSelectionsChange: () => void }) =>
        useDocSearchFacets({
          facets: [{ key: 'language' }],
          typesenseCollectionName,
          searchClient,
          onSelectionsChange,
        }),
      { initialProps: { onSelectionsChange: vi.fn() } }
    );

    const firstHandleChange = result.current.handleFacetSelectionChange;
    const firstClear = result.current.clearFacetSelections;

    const latestOnSelectionsChange = vi.fn();
    rerender({ onSelectionsChange: latestOnSelectionsChange });

    expect(result.current.handleFacetSelectionChange).toBe(firstHandleChange);
    expect(result.current.clearFacetSelections).toBe(firstClear);

    // the latest callback is invoked, not the one from the first render
    act(() => {
      result.current.handleFacetSelectionChange('language', ['en']);
    });
    expect(latestOnSelectionsChange).toHaveBeenCalledTimes(1);
  });
});
