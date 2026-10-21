import { test, expect } from './fixtures';

test.describe('Errors', () => {
  test('A failed search shows the error screen', async ({ docSearch }) => {
    // Known failure: errors only reach the error screen when named
    // `RetryError` (algoliasearch's), which the Typesense client never
    // throws (`createDocSearchSources.ts`). A missing collection instead
    // leaves an empty modal and an uncaught TypeError from the response
    // adapter. Remove `test.fail()` once that's fixed.
    test.fail();

    await docSearch.goto('/?collection=missing');
    await docSearch.openModal();
    await docSearch.typeQueryMatching();

    await expect(docSearch.modal.locator('.DocSearch-Title')).toHaveText(
      'Unable to fetch results'
    );
  });
});
