import type { Page } from '@playwright/test';

import { test, expect, type DocSearchPage } from './fixtures';

type TypesenseSearch = { q?: string; filter_by?: string };

/**
 * Resolves with the next keyword search sent for `query` (and `filterBy`, when
 * given). The search client caches identical requests, so each assertion uses a
 * query (or filter) the page hasn't sent yet.
 */
async function nextKeywordSearch(
  page: Page,
  query: string,
  filterBy?: string
): Promise<TypesenseSearch> {
  const request = await page.waitForRequest((candidate) => {
    if (
      !candidate.url().includes('/multi_search') ||
      candidate.url().includes('conversation=')
    ) {
      return false;
    }

    const [search] = (
      candidate.postDataJSON() as { searches: TypesenseSearch[] }
    ).searches;
    return (
      search?.q === query &&
      (filterBy === undefined || search.filter_by === filterBy)
    );
  });

  return (request.postDataJSON() as { searches: TypesenseSearch[] })
    .searches[0]!;
}

/** Distinct pages (URL without anchor) of the rendered keyword hits. */
async function hitPages(docSearch: DocSearchPage): Promise<string[]> {
  const urls = await docSearch.modal
    .locator('[id^="docsearch-hits_docsearch_"] .DocSearch-Hit a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

  return Array.from(new Set(urls.map((url) => url!.split('#')[0]!))).sort();
}

for (const route of ['/', '/keyword']) {
  test.describe(`Facets on ${route}`, () => {
    test('Facet values load from the collection', async ({
      docSearch,
      page,
    }) => {
      await docSearch.goto(route);
      await docSearch.openModal();
      await docSearch.typeQueryMatching();

      await docSearch.modal
        .locator('.DocSearch-FacetBar')
        .getByRole('button', { name: 'Language', exact: true })
        .click();
      const menu = page.getByRole('menu');
      await expect(menu.getByRole('menuitem')).toHaveText(['All']);
      await expect(menu.getByRole('menuitemcheckbox')).toHaveText(['En', 'Fr']);
    });

    test('Selecting values filters hits with filter_by', async ({
      docSearch,
      page,
    }) => {
      await docSearch.goto(route);
      await docSearch.openModal();
      await docSearch.typeQueryMatching();
      await expect
        .poll(() => hitPages(docSearch))
        .toContain('/docs/getting-started');

      const languageSearch = nextKeywordSearch(page, 'g');
      await docSearch.selectFacet('Language', 'Fr');
      expect((await languageSearch).filter_by).toBe('language:=[`fr`]');
      await expect
        .poll(() => hitPages(docSearch))
        .toEqual(['/docs/fr/guide-de-demarrage', '/docs/fr/v1/recherche']);

      const versionSearch = nextKeywordSearch(page, 'g');
      await docSearch.selectFacet('Version', 'V1');
      expect((await versionSearch).filter_by).toBe(
        'language:=[`fr`] && version:=[`v1`]'
      );
      await expect
        .poll(() => hitPages(docSearch))
        .toEqual(['/docs/fr/v1/recherche']);
    });

    test('Values of one facet are ORed, facets are ANDed', async ({
      docSearch,
      page,
    }) => {
      await docSearch.goto(route);
      await docSearch.openModal();
      await docSearch.typeQueryMatching();

      const languageSearch = nextKeywordSearch(
        page,
        'g',
        'language:=[`fr`,`en`]'
      );
      await docSearch.selectFacetValues('Language', ['Fr', 'En']);
      await languageSearch;
      await expect(
        page.getByRole('button', { name: 'Language, fr, en selected' })
      ).toHaveAttribute('data-has-selection', 'true');

      const versionSearch = nextKeywordSearch(
        page,
        'g',
        'language:=[`fr`,`en`] && version:=[`v1`]'
      );
      await docSearch.selectFacet('Version', 'V1');
      await versionSearch;
      await expect
        .poll(() => hitPages(docSearch))
        .toEqual(['/docs/fr/v1/recherche', '/docs/v1/guide/faceting']);
      await expect(
        page
          .getByRole('group', { name: 'Selected search filters' })
          .getByRole('button', { name: /^Clear filter:/ })
      ).toHaveCount(3);
    });

    test('Dismissing a chip keeps the other values of its facet', async ({
      docSearch,
      page,
    }) => {
      await docSearch.goto(route);
      await docSearch.openModal();
      await docSearch.typeQueryMatching();
      await docSearch.selectFacetValues('Language', ['Fr', 'En']);

      const search = nextKeywordSearch(page, 'g', 'language:=[`en`]');
      await page
        .getByRole('button', { name: 'Clear filter: Fr (Language)' })
        .click();
      await search;
      await expect(
        page.getByRole('button', { name: 'Clear filter: En (Language)' })
      ).toBeFocused();
    });

    test('Clearing a value removes it from filter_by', async ({
      docSearch,
      page,
    }) => {
      await docSearch.goto(route);
      await docSearch.openModal();
      await docSearch.typeQueryMatching();
      await docSearch.selectFacet('Language', 'Fr');
      await expect
        .poll(() => hitPages(docSearch))
        .toEqual(['/docs/fr/guide-de-demarrage', '/docs/fr/v1/recherche']);

      await page
        .getByRole('button', { name: 'Clear filter: Fr (Language)' })
        .click();
      const search = nextKeywordSearch(page, 'gu');
      await docSearch.search('gu');
      expect((await search).filter_by).toBeUndefined();
    });

    test('Selections replace typesenseSearchParameters.filter_by until cleared', async ({
      docSearch,
      page,
    }) => {
      await docSearch.goto(
        `${route}?filter_by=${encodeURIComponent('version:=[`v1`]')}`
      );
      await docSearch.openModal();
      await docSearch.typeQueryMatching();
      await expect
        .poll(() => hitPages(docSearch))
        .toEqual(['/docs/fr/v1/recherche', '/docs/v1/guide/faceting']);

      const search = nextKeywordSearch(page, 'g', 'language:=[`fr`]');
      await docSearch.selectFacet('Language', 'Fr');
      await search;
      await expect
        .poll(() => hitPages(docSearch))
        .toEqual(['/docs/fr/guide-de-demarrage', '/docs/fr/v1/recherche']);

      await page.getByRole('button', { name: 'Clear all' }).click();
      await expect
        .poll(() => hitPages(docSearch))
        .toEqual(['/docs/fr/v1/recherche', '/docs/v1/guide/faceting']);
    });
  });
}
