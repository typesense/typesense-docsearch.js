import { describe, expect, it, vi } from 'vitest';

import type { DocSearchHit, InternalDocSearchHit } from '../../types';
import { buildTypesenseQuerySources } from '../createDocSearchSources';

function createHit({
  objectID,
  lvl0,
  lvl1,
  type,
}: {
  objectID: string;
  lvl0: string;
  lvl1: string;
  type: DocSearchHit['type'];
}): DocSearchHit {
  const hit: DocSearchHit = {
    objectID,
    content: null,
    url: `/${objectID}`,
    url_without_anchor: `/${objectID}`,
    type,
    anchor: null,
    hierarchy: {
      lvl0,
      lvl1,
      lvl2: null,
      lvl3: null,
      lvl4: null,
      lvl5: null,
      lvl6: null,
    },
    _highlightResult: {
      content: { value: '', matchLevel: 'none', matchedWords: [] },
      hierarchy: {
        lvl0: { value: lvl0, matchLevel: 'none', matchedWords: [] },
        lvl1: { value: lvl1, matchLevel: 'none', matchedWords: [] },
        lvl2: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl3: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl4: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl5: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl6: { value: '', matchLevel: 'none', matchedWords: [] },
      },
      hierarchy_camel: [],
    },
    _snippetResult: {
      content: { value: '', matchLevel: 'none' },
      hierarchy: {
        lvl0: { value: lvl0, matchLevel: 'none', matchedWords: [] },
        lvl1: { value: lvl1, matchLevel: 'none', matchedWords: [] },
        lvl2: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl3: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl4: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl5: { value: '', matchLevel: 'none', matchedWords: [] },
        lvl6: { value: '', matchLevel: 'none', matchedWords: [] },
      },
      hierarchy_camel: [],
    },
  };

  return hit;
}

describe('buildTypesenseQuerySources', () => {
  it('creates a source per lvl0 group and scopes parents to that group', async () => {
    const search = vi.fn().mockResolvedValue({
      results: [
        {
          index: 'docs',
          nbHits: 4,
          hits: [
            createHit({
              objectID: 'guide-install',
              lvl0: 'Guides',
              lvl1: 'Installation',
              type: 'lvl1',
            }),
            createHit({
              objectID: 'guide-install-content',
              lvl0: 'Guides',
              lvl1: 'Installation',
              type: 'content',
            }),
            createHit({
              objectID: 'reference-install',
              lvl0: 'Reference',
              lvl1: 'Installation',
              type: 'lvl1',
            }),
            createHit({
              objectID: 'reference-install-content',
              lvl0: 'Reference',
              lvl1: 'Installation',
              type: 'content',
            }),
          ],
        },
      ],
    });
    const sources = await buildTypesenseQuerySources({
      query: 'install',
      state: { context: { searchSuggestions: [] } },
      setContext: vi.fn(),
      searchClient: {
        search,
      } as any,
      typesenseCollectionName: 'docs',
      saveRecentSearch: vi.fn(),
      onClose: vi.fn(),
      facetSelections: { current: { language: 'en' } },
    });

    expect(search).toHaveBeenCalledWith({
      requests: [
        expect.objectContaining({
          collection: 'docs',
          q: 'install',
          group_by: 'url',
          filter_by: 'language:=[`en`]',
        }),
      ],
    });

    expect(sources.map((source) => source.sourceId)).toEqual([
      'hits_docs_0',
      'hits_docs_1',
    ]);

    const [guideSource, referenceSource] = sources;
    const guideItems = (await guideSource.getItems(
      {} as never
    )) as InternalDocSearchHit[];
    const referenceItems = (await referenceSource.getItems(
      {} as never
    )) as InternalDocSearchHit[];

    expect(guideItems.map((item) => item.objectID)).toEqual([
      'guide-install',
      'guide-install-content',
    ]);
    expect(referenceItems.map((item) => item.objectID)).toEqual([
      'reference-install',
      'reference-install-content',
    ]);
    expect(guideItems[1].__docsearch_parent?.objectID).toBe('guide-install');
    expect(referenceItems[1].__docsearch_parent?.objectID).toBe(
      'reference-install'
    );
  });

  it('reports a failed search as an empty searchError source', async () => {
    const error = new Error('Network Error');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const sources = await buildTypesenseQuerySources({
      query: 'install',
      state: { context: { searchSuggestions: [] } },
      setContext: vi.fn(),
      searchClient: { search: vi.fn().mockRejectedValue(error) } as any,
      typesenseCollectionName: 'docs',
      saveRecentSearch: vi.fn(),
      onClose: vi.fn(),
    });

    expect(sources.map((source) => source.sourceId)).toEqual(['searchError']);
    expect(await sources[0].getItems({} as never)).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(error);
    consoleError.mockRestore();
  });
});
