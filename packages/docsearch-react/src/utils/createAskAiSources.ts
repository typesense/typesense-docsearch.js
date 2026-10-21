import type { AutocompleteSource } from '@algolia/autocomplete-core';

import type {
  InternalDocSearchHit,
  StoredAskAiMessage,
  StoredAskAiState,
} from '../types';

import { SOURCE_IDS } from './collections';

const MAX_RECENT_CONVERSATIONS_DISPLAYED = 3;

const EMPTY_RESULT_CONTENT = {
  value: '',
  matchLevel: 'none',
  matchedWords: [],
} satisfies InternalDocSearchHit['_highlightResult']['content'];
const EMPTY_HIERARCHY_HIGHLIGHT_RESULT = {
  lvl0: EMPTY_RESULT_CONTENT,
  lvl1: EMPTY_RESULT_CONTENT,
  lvl2: EMPTY_RESULT_CONTENT,
  lvl3: EMPTY_RESULT_CONTENT,
  lvl4: EMPTY_RESULT_CONTENT,
  lvl5: EMPTY_RESULT_CONTENT,
  lvl6: EMPTY_RESULT_CONTENT,
} satisfies InternalDocSearchHit['_highlightResult']['hierarchy'];
const EMPTY_HIGHLIGHT_RESULT: InternalDocSearchHit['_highlightResult'] = {
  content: EMPTY_RESULT_CONTENT,
  hierarchy: EMPTY_HIERARCHY_HIGHLIGHT_RESULT,
  hierarchy_camel: [],
};
const EMPTY_SNIPPET_RESULT: InternalDocSearchHit['_snippetResult'] = {
  content: EMPTY_RESULT_CONTENT,
  hierarchy: EMPTY_HIERARCHY_HIGHLIGHT_RESULT,
  hierarchy_camel: [],
};

export function buildRecentConversationSources({
  conversations,
  disableUserPersonalization,
  handleSelectStoredConversation,
}: {
  conversations: { getAll: () => StoredAskAiState[] };
  disableUserPersonalization: boolean;
  handleSelectStoredConversation: (
    item: StoredAskAiState,
    event: KeyboardEvent | MouseEvent
  ) => void;
}): Array<
  AutocompleteSource<InternalDocSearchHit & { messages?: StoredAskAiMessage[] }>
> {
  return [
    {
      sourceId: SOURCE_IDS.recentConversations,
      getItems(): InternalDocSearchHit[] {
        if (disableUserPersonalization) {
          return [];
        }
        return (
          conversations.getAll() as unknown as InternalDocSearchHit[]
        ).slice(0, MAX_RECENT_CONVERSATIONS_DISPLAYED);
      },
      onSelect({ item, event }): void {
        if (item.type !== 'askAI') {
          return;
        }

        handleSelectStoredConversation(item, event);
      },
    },
  ];
}

function createAskAiHit({
  query,
  objectID,
  lvl0,
}: {
  query: string;
  objectID: string;
  lvl0: string;
}): InternalDocSearchHit {
  return {
    type: 'askAI',
    query,
    url_without_anchor: '',
    objectID,
    content: null,
    url: '',
    anchor: null,
    hierarchy: {
      lvl0,
      lvl1: query,
      lvl2: null,
      lvl3: null,
      lvl4: null,
      lvl5: null,
      lvl6: null,
    },
    _highlightResult: EMPTY_HIGHLIGHT_RESULT,
    _snippetResult: EMPTY_SNIPPET_RESULT,
    __docsearch_parent: null,
  };
}

export function buildAskAiActionSources({
  query,
  handleSelectAskAiQuestion,
}: {
  query: string;
  handleSelectAskAiQuestion: (toggle: boolean, query: string) => void;
}): Array<AutocompleteSource<InternalDocSearchHit>> {
  return [
    {
      sourceId: SOURCE_IDS.askAI,
      getItems(): InternalDocSearchHit[] {
        return [
          createAskAiHit({ query, objectID: 'ask-ai-button', lvl0: 'Ask AI' }),
        ];
      },
      onSelect({ item }): void {
        if (item.type === 'askAI' && item.query) {
          handleSelectAskAiQuestion(true, item.query);
        }
      },
    },
  ];
}
