// oxlint-disable max-classes-per-file react-hooks/rules-of-hooks
import AxeBuilder from '@axe-core/playwright';
import {
  test as base,
  expect,
  type Page,
  type Locator,
  type Request,
} from '@playwright/test';

// The fork's Ask AI streams `/multi_search?conversation_stream=true` as SSE
// (`useAskAi.ts`). Plain keyword searches lack that parameter, so they still
// reach the seeded Typesense server.
const ASK_AI_STREAM_ROUTE = '**/multi_search?*conversation_stream=true*';

export const ASK_AI_ANSWER = 'Saved answer';

const ASK_AI_STREAM_BODY = [
  { conversation_id: 'conv-1', message: 'Saved ' },
  { conversation_id: 'conv-1', message: 'answer' },
]
  .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
  .join('')
  .concat('data: [DONE]\n\n');

export class DocSearchPage {
  readonly page: Page;
  readonly searchButton: Locator;
  readonly modal: Locator;
  readonly input: Locator;
  readonly hits: Locator;
  readonly clearButton: Locator;
  readonly firstHit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchButton = page.locator('.DocSearch-Button');
    this.modal = page.locator('.DocSearch-Modal');
    this.input = page.locator('.DocSearch-Input');
    this.hits = page.locator('.DocSearch-Hits').first();
    this.clearButton = page.locator('.DocSearch-Clear');
    this.firstHit = page
      .locator('#docsearch-hits_docsearch_0-list .DocSearch-Hit a')
      .first();
  }

  /**
   * Routes of the test app (e2e/app): `/` mounts `DocSearchAI` with facets,
   * `/keyword` the keyword-only `DocSearch`, `/hybrid` the modal + Sidepanel
   * packages, `/js` the vanilla JS wrappers.
   */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForLoad(): Promise<void> {
    await expect(this.searchButton).toBeVisible({ timeout: 10000 });
  }

  async openModal(): Promise<void> {
    await this.searchButton.click();
    await this.expectModalVisibleAndFocused();
  }

  async closeModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.expectModalNotVisible();
  }

  async expectModalVisibleAndFocused(): Promise<void> {
    await expect(this.modal).toBeVisible({ timeout: 10000 });
    await expect(this.input).toBeFocused();
  }

  async expectModalNotVisible(): Promise<void> {
    await expect(this.page.locator('body')).not.toHaveClass(
      /DocSearch--active/
    );
    await expect(this.modal).not.toBeVisible();
  }

  async search(query: string): Promise<void> {
    await this.input.fill(query);
  }

  async typeQueryMatching(): Promise<void> {
    await this.search('g');
  }

  async typeQueryNotMatching(): Promise<void> {
    await this.search('zzz');
  }

  async clearSearch(): Promise<void> {
    await this.input.clear();
  }

  async clickFirstHit(): Promise<void> {
    await expect(this.hits).toBeVisible();
    await this.firstHit.click({ force: true });
  }

  async enableDarkMode(): Promise<void> {
    await this.page.locator('.ThemeToggle').click();
    await expect(this.page.locator('html[data-theme="dark"]')).toBeAttached();
  }

  /**
   * The Ask AI item joins the results once the Typesense search resolves; Enter
   * before then has no active item to select.
   */
  async expectAskAiItemActive(): Promise<void> {
    await expect(this.input).toHaveAttribute(
      'aria-activedescendant',
      'docsearch-askAI-item-0'
    );
  }

  async goToAskAi(): Promise<void> {
    await this.typeQueryMatching();
    await this.page.locator('#docsearch-askAI-item-0').click();
  }

  /** Picks `value` from the facet menu labelled `facetLabel`. */
  async selectFacet(facetLabel: string, value: string): Promise<void> {
    await this.modal
      .locator('.DocSearch-FacetBar')
      .getByRole('button', { name: facetLabel, exact: true })
      .click();
    await this.page
      .getByRole('menuitemradio', { name: value, exact: true })
      .click();
  }
}

export class SidepanelPage {
  readonly page: Page;
  readonly sidepanelButton: Locator;
  readonly sidepanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidepanelButton = page.locator('.DocSearch-SidepanelButton');
    this.sidepanel = page.locator('.DocSearch-Sidepanel-Container');
  }

  async waitForLoad(): Promise<void> {
    await expect(this.sidepanelButton).toBeVisible({ timeout: 10000 });
  }

  async openSidepanel(): Promise<void> {
    await this.sidepanelButton.click();
    await expect(this.sidepanel).toHaveClass(/is-open/, {
      timeout: 10000,
    });
  }
}

export type AskAiMock = {
  /** Ask AI requests the fake answered, in order. */
  requests: Request[];
};

export const test = base.extend<{
  docSearch: DocSearchPage;
  sidepanel: SidepanelPage;
  axe: () => AxeBuilder;
  askAiMock: AskAiMock;
  failOnPageError: void;
}>({
  docSearch: async ({ page }, use) => {
    const docSearch = new DocSearchPage(page);
    await use(docSearch);
  },
  sidepanel: async ({ page }, use) => {
    const sidepanel = new SidepanelPage(page);
    await use(sidepanel);
  },
  axe: async ({ page }, use) => {
    const makeBuilder = () =>
      new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22a',
        'wcag22aa',
      ]);
    await use(makeBuilder);
  },
  // Opt in by destructuring `askAiMock`; Ask AI needs a conversation model the
  // test server doesn't have.
  askAiMock: async ({ page }, use) => {
    const mock: AskAiMock = { requests: [] };
    await page.route(ASK_AI_STREAM_ROUTE, async (route) => {
      mock.requests.push(route.request());
      await route.fulfill({
        contentType: 'text/event-stream',
        body: ASK_AI_STREAM_BODY,
      });
    });
    await use(mock);
  },
  // Uncaught exceptions and unhandled rejections fail every test, which also
  // covers broken package entry points.
  failOnPageError: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));
      await use();
      expect(errors.map((error) => error.message)).toEqual([]);
    },
    { auto: true },
  ],
});

type AxeScanResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

function gatherA11yViolations(violations: AxeScanResults['violations']) {
  return violations.flatMap((v) => v.nodes);
}

export { expect, gatherA11yViolations };
