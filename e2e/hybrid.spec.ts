import { devices } from '@playwright/test';

import { test, expect, ASK_AI_ANSWER } from './fixtures';

// Shape written by the Ask AI conversation store (`stored-searches.ts`).
const STORED_CONVERSATION = {
  anchor: 'stored',
  chatId: 'stored-chat-id',
  content: null,
  hierarchy: {
    lvl0: 'askAI',
    lvl1: 'What is DocSearch?',
    lvl2: '2026-08-19T00:00:00.000Z',
    lvl3: null,
    lvl4: null,
    lvl5: null,
    lvl6: null,
  },
  messages: [
    {
      id: 'stored-message-id',
      parts: [{ text: 'What is DocSearch?', type: 'text' }],
      role: 'user',
    },
    {
      id: 'stored-answer-id',
      parts: [{ text: 'A search widget.', type: 'text' }],
      role: 'assistant',
    },
  ],
  objectID: 'stored-conversation',
  query: 'What is DocSearch?',
  type: 'askAI',
  url: '',
  url_without_anchor: '',
};

test.describe('Hybrid', () => {
  // algolia/docsearch#3029
  test('Enter on a stored conversation reopens it in the Sidepanel', async ({
    docSearch,
    sidepanel,
    page,
    askAiMock,
  }) => {
    await page.addInitScript((conversation) => {
      window.localStorage.setItem(
        '__DOCSEARCH_ASKAI_CONVERSATIONS__docsearch',
        JSON.stringify([conversation])
      );
    }, STORED_CONVERSATION);
    await docSearch.goto('/hybrid');
    await docSearch.openModal();

    await expect(
      page.locator('#docsearch-recentConversations-item-0')
    ).toContainText('What is DocSearch?');
    await expect(docSearch.input).toHaveAttribute(
      'aria-activedescendant',
      'docsearch-recentConversations-item-0'
    );
    await docSearch.input.press('Enter');

    await docSearch.expectModalNotVisible();
    await expect(sidepanel.sidepanel).toHaveClass(/is-open/);
    await expect(sidepanel.sidepanel).toContainText('What is DocSearch?');
    await expect(sidepanel.sidepanel).toContainText('A search widget.');
    // The stored transcript is restored, not asked again.
    expect(askAiMock.requests).toHaveLength(0);
  });
});

test.describe('Hybrid on mobile', () => {
  // `defaultBrowserType` can't be set per describe; the project is Chromium.
  const { defaultBrowserType: _defaultBrowserType, ...pixel7 } =
    devices['Pixel 7'];
  test.use(pixel7);

  test('Ask AI stays in the modal', async ({
    docSearch,
    sidepanel,
    page,
    askAiMock,
  }) => {
    await docSearch.goto('/hybrid');
    await docSearch.openModal();
    await docSearch.typeQueryMatching();
    await docSearch.expectAskAiItemActive();
    await docSearch.input.press('Enter');

    await expect(page.locator('.DocSearch-AskAiScreen')).toBeVisible();
    await expect(
      page.locator('.DocSearch-AskAiScreen-Message--assistant')
    ).toContainText(ASK_AI_ANSWER);
    await expect(sidepanel.sidepanel).not.toHaveClass(/is-open/);
    expect(askAiMock.requests).toHaveLength(1);
  });
});
