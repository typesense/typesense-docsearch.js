import type { Page } from '@playwright/test';

import { test, expect, ASK_AI_ANSWER } from './fixtures';

// `/js` mounts `typesense-docsearch.js` and `typesense-docsearch-sidepanel-js`
// and exposes their instances on `window`.
type InstanceName = 'docsearch' | 'sidepanel';
type VanillaWindow = Record<
  InstanceName,
  { isOpen: boolean; open: () => void; close: () => void }
>;

async function callInstance(
  page: Page,
  name: InstanceName,
  method: 'close' | 'open'
): Promise<void> {
  await page.evaluate(
    ([instance, action]) =>
      (window as unknown as VanillaWindow)[instance][action](),
    [name, method] as const
  );
}

async function isInstanceOpen(
  page: Page,
  name: InstanceName
): Promise<boolean> {
  return await page.evaluate(
    (instance) => (window as unknown as VanillaWindow)[instance].isOpen,
    name
  );
}

test.describe('Vanilla JS', () => {
  test.beforeEach(async ({ docSearch }) => {
    await docSearch.goto('/js');
    await docSearch.waitForLoad();
  });

  test('docsearch() searches the collection', async ({ docSearch }) => {
    await docSearch.openModal();
    await docSearch.typeQueryMatching();
    await expect(docSearch.firstHit).toBeVisible();
  });

  test('docsearch() instance opens and closes the modal', async ({
    docSearch,
    page,
  }) => {
    await callInstance(page, 'docsearch', 'open');
    await docSearch.expectModalVisibleAndFocused();
    expect(await isInstanceOpen(page, 'docsearch')).toBe(true);

    await callInstance(page, 'docsearch', 'close');
    await docSearch.expectModalNotVisible();
    expect(await isInstanceOpen(page, 'docsearch')).toBe(false);
  });

  test('sidepanel() instance opens and closes the panel', async ({
    sidepanel,
    page,
  }) => {
    await callInstance(page, 'sidepanel', 'open');
    await expect(sidepanel.sidepanel).toHaveClass(/is-open/);
    expect(await isInstanceOpen(page, 'sidepanel')).toBe(true);

    await callInstance(page, 'sidepanel', 'close');
    await expect(sidepanel.sidepanel).not.toHaveClass(/is-open/);
    expect(await isInstanceOpen(page, 'sidepanel')).toBe(false);
  });

  test('interceptAskAiEvent routes Ask AI into the Sidepanel', async ({
    docSearch,
    sidepanel,
    askAiMock,
  }) => {
    await docSearch.openModal();
    await docSearch.typeQueryMatching();
    await docSearch.expectAskAiItemActive();
    await docSearch.input.press('Enter');

    await docSearch.expectModalNotVisible();
    await expect(sidepanel.sidepanel).toHaveClass(/is-open/);
    await expect(sidepanel.sidepanel).toContainText(ASK_AI_ANSWER);
    expect(askAiMock.requests).toHaveLength(1);
  });
});
