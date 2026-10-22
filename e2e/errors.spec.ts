import { test, expect } from './fixtures';

const ERROR_TITLE = 'Unable to fetch results';

for (const route of ['/', '/keyword']) {
  test(`A missing collection shows the error screen on ${route}`, async ({
    docSearch,
    page,
    askAiMock,
  }) => {
    await docSearch.goto(`${route}?collection=missing`);
    await docSearch.openModal();
    await docSearch.typeQueryMatching();

    await expect(docSearch.modal.locator('.DocSearch-Title')).toHaveText(
      ERROR_TITLE
    );

    // Nothing hidden behind the error screen is selectable.
    await expect(docSearch.input).not.toHaveAttribute('aria-activedescendant');
    await docSearch.input.press('Enter');
    await expect(docSearch.modal.locator('.DocSearch-Title')).toHaveText(
      ERROR_TITLE
    );
    await expect(page.locator('.DocSearch-AskAiScreen')).toHaveCount(0);
    expect(askAiMock.requests).toHaveLength(0);
  });
}

test('A network failure shows the error screen until a search succeeds', async ({
  docSearch,
  page,
}) => {
  await docSearch.goto();
  await docSearch.openModal();
  await page.route('**/multi_search*', (route) => route.abort());
  await docSearch.typeQueryMatching();

  await expect(docSearch.modal.locator('.DocSearch-Title')).toHaveText(
    ERROR_TITLE
  );

  await page.unroute('**/multi_search*');
  await docSearch.search('gu');
  await expect(docSearch.firstHit).toBeVisible();
  await expect(docSearch.modal.locator('.DocSearch-Title')).toHaveCount(0);
});

test('A stale successful search does not hide a newer failure', async ({
  docSearch,
  page,
}) => {
  await docSearch.goto();
  await docSearch.openModal();

  // Hold the search for `g` until the search for `gu` has failed.
  let releaseStaleSearch = (): void => {};
  const staleSearchReleased = new Promise<void>((resolve) => {
    releaseStaleSearch = resolve;
  });
  await page.route('**/multi_search*', async (route) => {
    const [search] = (
      route.request().postDataJSON() as { searches: Array<{ q?: string }> }
    ).searches;

    if (search?.q === 'g') {
      await staleSearchReleased;
      await route.continue();
    } else if (search?.q === 'gu') {
      await route.abort();
    } else {
      await route.continue();
    }
  });

  await docSearch.search('g');
  await docSearch.search('gu');
  await expect(docSearch.modal.locator('.DocSearch-Title')).toHaveText(
    ERROR_TITLE
  );

  const staleResponse = page.waitForResponse((response) =>
    response.request().postData()!.includes('"q":"g"')
  );
  releaseStaleSearch();
  await staleResponse;
  // Give the stale results time to render if they were going to.
  await page.waitForTimeout(500);

  await expect(docSearch.modal.locator('.DocSearch-Title')).toHaveText(
    ERROR_TITLE
  );
  await expect(docSearch.firstHit).toHaveCount(0);
});
