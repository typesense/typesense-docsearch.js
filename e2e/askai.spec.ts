import { test, expect, ASK_AI_ANSWER } from './fixtures';

test.describe('Ask AI', () => {
  test.beforeEach(async ({ docSearch }) => {
    await docSearch.goto();
    await docSearch.openModal();
  });

  test('Results are displayed after a query', async ({ docSearch }) => {
    await docSearch.typeQueryMatching();
    await expect(docSearch.hits).toBeVisible();
  });

  test('Shows Ask AI as a hit on search', async ({ docSearch, page }) => {
    await docSearch.typeQueryMatching();
    await expect(page.locator('#docsearch-askAI-item-0')).toBeVisible();
  });

  test('Opens Ask AI on enter key', async ({ docSearch, page, askAiMock }) => {
    await docSearch.typeQueryMatching();
    await docSearch.expectAskAiItemActive();
    await page.keyboard.press('Enter');
    await expect(page.locator('.DocSearch-AskAiScreen')).toBeVisible();
    expect(askAiMock.requests).toHaveLength(1);
  });

  test('Opens Ask AI on click', async ({ docSearch, page, askAiMock }) => {
    await docSearch.typeQueryMatching();
    await page.locator('#docsearch-askAI-item-0').click();
    await expect(page.locator('.DocSearch-AskAiScreen')).toBeVisible();
    expect(askAiMock.requests).toHaveLength(1);
  });

  test('Streams response after query', async ({
    docSearch,
    page,
    askAiMock,
  }) => {
    await docSearch.goToAskAi();
    await expect(page.locator('.DocSearch-AskAiScreen-Query')).toHaveText('g');
    await expect(
      page.locator('.DocSearch-AskAiScreen-Message--assistant')
    ).toContainText(ASK_AI_ANSWER);

    const url = new URL(askAiMock.requests[0]!.url());
    expect(url.searchParams.get('q')).toBe('g');
    expect(url.searchParams.get('conversation_model_id')).toBe(
      'e2e-conversation-model'
    );
  });

  test('Copy button copies the response to the clipboard', async ({
    docSearch,
    page,
    context,
    askAiMock: _askAiMock,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await docSearch.goToAskAi();
    await expect(
      page.locator('.DocSearch-AskAiScreen-Message--assistant')
    ).toContainText(ASK_AI_ANSWER);
    await page.locator('.DocSearch-AskAiScreen-CopyButton').click();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toBe(ASK_AI_ANSWER);
  });
});

test.describe('Ask AI > Hybrid', () => {
  test('Ask AI from the modal continues in the Sidepanel', async ({
    docSearch,
    sidepanel,
    askAiMock,
  }) => {
    await docSearch.goto('/hybrid');
    await docSearch.openModal();
    await docSearch.typeQueryMatching();
    await docSearch.expectAskAiItemActive();
    await docSearch.input.press('Enter');

    await docSearch.expectModalNotVisible();
    await expect(sidepanel.sidepanel).toHaveClass(/is-open/);
    await expect(
      sidepanel.sidepanel.locator('.DocSearch-AskAiScreen-Query')
    ).toHaveText('g');
    await expect(sidepanel.sidepanel).toContainText(ASK_AI_ANSWER);
    expect(askAiMock.requests).toHaveLength(1);
  });
});
