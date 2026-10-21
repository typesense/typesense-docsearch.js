import type { Locator } from '@playwright/test';

import { test, expect, ASK_AI_ANSWER } from './fixtures';

// algolia/docsearch#3059: Enter that confirms an IME conversion must not send
// an Ask AI prompt. `page.keyboard` can't set `isComposing`, so dispatch the
// keydown directly. keyCode 229 is what Safari reports instead.
const COMPOSING_ENTER_EVENTS = [
  { key: 'Enter', isComposing: true },
  { key: 'Enter', keyCode: 229 },
];

async function pressComposingEnter(field: Locator): Promise<void> {
  for (const init of COMPOSING_ENTER_EVENTS) {
    await field.dispatchEvent('keydown', init);
  }
}

test('Composing Enter does not send a follow-up from the modal', async ({
  docSearch,
  page,
  askAiMock,
}) => {
  await docSearch.goto();
  await docSearch.openModal();
  await docSearch.goToAskAi();
  await expect(
    page.locator('.DocSearch-AskAiScreen-Message--assistant')
  ).toContainText(ASK_AI_ANSWER);

  await docSearch.input.fill('follow-up');
  await pressComposingEnter(docSearch.input);
  await expect(docSearch.input).toHaveValue('follow-up');
  expect(askAiMock.requests).toHaveLength(1);

  await docSearch.input.press('Enter');
  await expect(page.locator('.DocSearch-AskAiScreen-Query')).toHaveText([
    'g',
    'follow-up',
  ]);
  expect(askAiMock.requests).toHaveLength(2);
});

test('Composing Enter does not send a prompt from the Sidepanel', async ({
  docSearch,
  sidepanel,
  askAiMock,
}) => {
  await docSearch.goto('/hybrid');
  await sidepanel.openSidepanel();
  const prompt = sidepanel.sidepanel.locator('textarea');

  await prompt.fill('My question');
  await pressComposingEnter(prompt);
  await expect(prompt).toHaveValue('My question');
  expect(askAiMock.requests).toHaveLength(0);

  await prompt.press('Enter');
  await expect(sidepanel.sidepanel).toContainText(ASK_AI_ANSWER);
  expect(askAiMock.requests).toHaveLength(1);
});
