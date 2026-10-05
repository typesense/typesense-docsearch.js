import { createAutocomplete } from '@algolia/autocomplete-core';
import React, { type JSX } from 'react';
import type {
  InitialAskAiMessage,
  OnAskAiToggle,
} from 'typesense-docsearch-core';

import type { AskAiScreenStateTranslations } from './AskAiScreenState';
import { AskAiScreenState } from './AskAiScreenState';
import type { AskAiSearchBoxTranslations } from './components/AskAiSearchBox';
import { AskAiSearchBox } from './components/AskAiSearchBox';
import type { FacetBarTranslations } from './components/FacetBar';
import { FacetBar } from './components/FacetBar';
import { ModalShell } from './components/ui/ModalShell';
import type { DocSearchAIProps, DocSearchAskAi } from './DocSearchAI';
import type { FooterTranslations } from './Footer';
import { Footer } from './Footer';
import { Hit } from './Hit';
import { useDocSearchFacets } from './hooks/useDocSearchFacets';
import { useSendItemClickEvent } from './hooks/useDocSearchInsights';
import { useInitialModalQuery } from './hooks/useInitialModalQuery';
import { useModalEnvironment } from './hooks/useModalEnvironment';
import { useModalRefs } from './hooks/useModalRefs';
import { useRefreshOnInitialQuery } from './hooks/useRefreshOnInitialQuery';
import { useSaveRecentSearch } from './hooks/useSaveRecentSearch';
import { useStoredDocSearches } from './hooks/useStoredDocSearches';
import type { NewConversationTranslations } from './NewConversationScreen';
import type {
  DocSearchState,
  InternalDocSearchHit,
  StoredAskAiMessage,
  StoredAskAiState,
  SuggestedQuestionHit,
} from './types';
import { type AskAiState } from './types/AskiAi';
import { useAskAi } from './useAskAi';
import { useSearchClient } from './useSearchClient';
import {
  identity,
  isModifierEvent,
  isQueryEmpty,
  noop,
  scrollTo as scrollToUtils,
  SOURCE_IDS,
} from './utils';
import {
  buildDummyAskAiHit,
  isAskAiPromptBlockingError,
  isThreadDepthError,
} from './utils/ai';
import {
  buildAskAiActionSources,
  buildRecentConversationSources,
} from './utils/createAskAiSources';
import {
  buildNoQuerySources,
  buildTypesenseQuerySources,
  type BuildQuerySourcesState,
} from './utils/createDocSearchSources';

export type DocSearchAskAiModalTranslations = AskAiScreenStateTranslations &
  Partial<{
    searchBox: AskAiSearchBoxTranslations;
    newConversation: NewConversationTranslations;
    footer: FooterTranslations;
    facets: FacetBarTranslations;
  }>;

export type DocSearchAskAiModalProps = DocSearchAIProps & {
  initialScrollY: number;
  onAskAiToggle: OnAskAiToggle;
  onClose?: () => void;
  isAskAiActive?: boolean;
  translations?: DocSearchAskAiModalTranslations;
  isHybridModeSupported?: boolean;
};

export function DocSearchAskAiModal({
  typesenseCollectionName,
  typesenseServerConfig,
  typesenseSearchParameters,
  askAi,
  maxResultsPerGroup,
  theme,
  onClose = noop,
  transformItems = identity,
  hitComponent = Hit,
  resultsFooterComponent = (): JSX.Element | null => null,
  navigator,
  initialScrollY = 0,
  transformSearchClient = identity,
  disableUserPersonalization = false,
  initialQuery: initialQueryFromProp = '',
  translations = {},
  getMissingResultsUrl,
  insights = false,
  onAskAiToggle,
  interceptAskAiEvent,
  isAskAiActive = false,
  recentSearchesLimit = 7,
  recentSearchesWithFavoritesLimit = 4,
  facets,
  isHybridModeSupported = false,
  footerAction,
  ...props
}: DocSearchAskAiModalProps): JSX.Element {
  const {
    footer: footerTranslations,
    searchBox: searchBoxTranslations,
    facets: facetBarTranslations,
    ...screenStateTranslations
  } = translations;
  const [state, setState] = React.useState<
    DocSearchState<InternalDocSearchHit>
  >({
    query: '',
    collections: [],
    completion: null,
    context: {},
    isOpen: false,
    activeItemId: null,
    status: 'idle',
  });

  // check if the instance is configured to handle ask ai
  const canHandleAskAi = Boolean(askAi);

  let placeholder =
    translations?.searchBox?.placeholderText ||
    props.placeholder ||
    'Search docs';

  if (canHandleAskAi) {
    placeholder =
      translations?.searchBox?.placeholderText ||
      'Search docs or ask AI a question';
  }

  if (isAskAiActive) {
    placeholder =
      translations?.searchBox?.placeholderTextAskAi ||
      'Ask another question...';
  }

  const { containerRef, modalRef, formElementRef, dropdownRef, inputRef } =
    useModalRefs();
  const promptBlockingErrorId = React.useId();
  const { initialQuery, initialQueryFromSelection } =
    useInitialModalQuery(initialQueryFromProp);

  const searchClient = useSearchClient(
    transformSearchClient,
    typesenseServerConfig
  );

  // `askAi` accepts a bare conversation model id as a shorthand for the full
  // config object.
  const askAiConfig: DocSearchAskAi = React.useMemo(
    () => (typeof askAi === 'object' ? askAi : { conversationModelId: askAi }),
    [askAi]
  );
  const [askAiState, setAskAiState] = React.useState<AskAiState>('initial');

  const defaultIndexName = typesenseCollectionName;

  const autocompleteRef =
    React.useRef<
      ReturnType<
        typeof createAutocomplete<
          InternalDocSearchHit,
          React.FormEvent<HTMLFormElement>,
          React.MouseEvent,
          React.KeyboardEvent
        >
      >
    >(undefined);

  const {
    visibleFacets,
    facetSelections,
    facetSelectionsRef,
    handleFacetSelectionChange,
    clearFacetSelections,
  } = useDocSearchFacets({
    facets,
    typesenseCollectionName,
    searchClient,
    onSelectionsChange: () => autocompleteRef.current?.refresh(),
  });

  const { favoriteSearches, recentSearches } = useStoredDocSearches({
    defaultIndexName,
    recentSearchesLimit,
    recentSearchesWithFavoritesLimit,
  });

  const [stoppedStream, setStoppedStream] = React.useState(false);

  const {
    chatId,
    messages,
    status,
    setMessages,
    sendMessage,
    stopAskAiStreaming,
    askAiError,
    conversations,
    startNewConversation,
    restoreConversation,
  } = useAskAi({
    typesenseServerConfig,
    storageKey: `__DOCSEARCH_ASKAI_CONVERSATIONS__${typesenseCollectionName}`,
    collection: askAiConfig.collection || typesenseCollectionName,
    conversationModelId: askAiConfig.conversationModelId,
    queryBy: askAiConfig.queryBy || 'embedding',
    excludeFields: askAiConfig.excludeFields || 'embedding',
    searchParameters: askAiConfig.searchParameters,
  });

  const suggestedQuestions: SuggestedQuestionHit[] = React.useMemo(() => {
    const staticQuestions = askAiConfig.suggestedQuestions ?? [];

    return staticQuestions.map((question, index) => ({
      objectID: `suggested-question-${index}`,
      question,
    }));
  }, [askAiConfig.suggestedQuestions]);

  const prevStatus = React.useRef(status);
  React.useEffect(() => {
    if (disableUserPersonalization) {
      return;
    }
    // if we just transitioned from "streaming" → "ready", persist
    if (prevStatus.current === 'streaming' && status === 'ready') {
      // if we stopped the stream, store it on the most recent message
      if (stoppedStream && messages.at(-1)) {
        messages.at(-1)!.metadata = {
          ...messages.at(-1)!.metadata,
          stopped: true,
        };
      }

      for (const part of messages[0].parts) {
        if (part.type === 'text') {
          conversations.add(buildDummyAskAiHit(part.text, messages, chatId));
        }
      }
    }
    prevStatus.current = status;
  }, [
    status,
    messages,
    conversations,
    disableUserPersonalization,
    stoppedStream,
    chatId,
  ]);

  const hasPromptBlockingError = React.useMemo(() => {
    return (
      status === 'error' &&
      isAskAiPromptBlockingError(askAiError as Error | undefined)
    );
  }, [status, askAiError]);
  const shouldBlockPrompt =
    hasPromptBlockingError &&
    (!isThreadDepthError(askAiError) ||
      messages.some((message) => message.role === 'assistant'));

  const promptBlockingChrome = React.useMemo(() => {
    if (
      !shouldBlockPrompt ||
      askAiState === 'new-conversation' ||
      askAiState === 'conversation-history'
    ) {
      return undefined;
    }

    return 'full' as const;
  }, [askAiState, shouldBlockPrompt]);

  const saveRecentSearch = useSaveRecentSearch({
    favoriteSearches,
    recentSearches,
    disableUserPersonalization,
  });
  const sendItemClickEvent = useSendItemClickEvent(state);

  const handleSelectAskAiQuestion = React.useCallback(
    (
      toggle: boolean,
      query: string,
      suggestedQuestion: SuggestedQuestionHit | undefined = undefined
    ) => {
      if (toggle) {
        const initialMessage: InitialAskAiMessage = {
          query,
          suggestedQuestionId: suggestedQuestion?.objectID,
        };

        if (interceptAskAiEvent?.(initialMessage)) {
          // Consumer handled it. Avoid *all* default Ask AI behavior.
          if (autocompleteRef.current) {
            autocompleteRef.current.setQuery('');
          }
          return;
        }
      }

      if (toggle && askAiState === 'new-conversation') {
        setAskAiState('initial');
      }

      onAskAiToggle(toggle, {
        query,
        suggestedQuestionId: suggestedQuestion?.objectID,
      });

      // If we're in hybrid mode, we don't need to send the message,
      // it will be handled by the Sidepanel.
      if (isHybridModeSupported) return;

      setStoppedStream(false);

      sendMessage(
        query,
        suggestedQuestion
          ? { suggestedQuestionId: suggestedQuestion.objectID }
          : undefined
      ).catch(noop);

      // clear the query
      if (autocompleteRef.current) {
        autocompleteRef.current.setQuery('');
      }
    },
    [
      askAiState,
      onAskAiToggle,
      isHybridModeSupported,
      sendMessage,
      interceptAskAiEvent,
    ]
  );

  if (!autocompleteRef.current) {
    autocompleteRef.current = createAutocomplete({
      id: 'docsearch',
      defaultActiveItemId: 0,
      openOnFocus: true,
      initialState: {
        query: initialQuery,
        context: {
          searchSuggestions: [],
        },
      },
      insights: Boolean(insights),
      navigator,
      onStateChange(changes) {
        setState(changes.state);
      },
      async getSources({ query, state: sourcesState, setContext, setStatus }) {
        if (isQueryEmpty(query)) {
          const noQuerySources = buildNoQuerySources({
            recentSearches,
            favoriteSearches,
            saveRecentSearch,
            onClose,
            disableUserPersonalization,
          });

          const recentConversationSource = canHandleAskAi
            ? buildRecentConversationSources({
                conversations,
                disableUserPersonalization,
                setMessages,
                onAskAiToggle,
              })
            : [];
          return [...recentConversationSource, ...noQuerySources];
        }

        const querySourcesState: BuildQuerySourcesState = {
          context: sourcesState.context,
        };

        const keywordSourcesPromise = buildTypesenseQuerySources({
          query,
          state: querySourcesState,
          setContext,
          setStatus,
          searchClient,
          typesenseCollectionName,
          typesenseSearchParameters,
          maxResultsPerGroup,
          transformItems,
          saveRecentSearch,
          onClose,
          facetSelections: facetSelectionsRef,
        });

        const askAiSources = canHandleAskAi
          ? buildAskAiActionSources({ query, handleSelectAskAiQuestion })
          : [];

        const keywordSources = await keywordSourcesPromise;

        // Combine keyword results (once resolved) with the Ask AI source
        return [...askAiSources, ...keywordSources];
      },
    });
  }

  const autocomplete = autocompleteRef.current;

  const { getEnvironmentProps, getRootProps, refresh } = autocomplete;

  useModalEnvironment({
    getEnvironmentProps,
    containerRef,
    dropdownRef,
    formElementRef,
    inputRef,
    initialScrollY,
    modalRef,
    theme,
  });

  React.useEffect(() => {
    if (dropdownRef.current && !isAskAiActive) {
      scrollToUtils(dropdownRef.current);
    }
  }, [state.query, isAskAiActive, dropdownRef]);

  // Follow the conversation: when a new user message is added, scroll to it
  const userMessageCount = messages.filter(
    (message) => message.role === 'user'
  ).length;

  // Auto-follow is pinned until the user scrolls up; scrolling back to the
  // bottom re-pins it
  const isPinnedToBottomRef = React.useRef(true);

  React.useEffect(() => {
    const el = dropdownRef.current;
    if (!el || !isAskAiActive) {
      return undefined;
    }
    const handleWheel = (event: WheelEvent): void => {
      if (event.deltaY < 0) {
        isPinnedToBottomRef.current = false;
      }
    };
    const handleTouchMove = (): void => {
      isPinnedToBottomRef.current = false;
    };
    const handleScroll = (): void => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
        isPinnedToBottomRef.current = true;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('scroll', handleScroll);
    };
  }, [isAskAiActive, dropdownRef]);

  React.useEffect(() => {
    if (!isAskAiActive || userMessageCount === 0 || !dropdownRef.current) {
      return;
    }
    isPinnedToBottomRef.current = true;
    const el = dropdownRef.current;
    // some test environments (like jsdom) don't implement element.scrollTo
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      // fallback for environments without scrollTo support
      el.scrollTop = el.scrollHeight;
    }
  }, [userMessageCount, isAskAiActive, dropdownRef]);

  // Keep the newest tokens in view while the answer streams in
  React.useEffect(() => {
    const el = dropdownRef.current;
    if (
      !isAskAiActive ||
      status !== 'streaming' ||
      messages.length === 0 ||
      !isPinnedToBottomRef.current ||
      !el
    ) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages, status, isAskAiActive, dropdownRef]);

  useRefreshOnInitialQuery({ initialQuery, inputRef, refresh });

  const hasCurrentMessages = messages.length > 0;
  const previousIsAskAiActive = React.useRef(isAskAiActive);

  // Refresh the autocomplete results when ask ai is toggled off
  // helps return to the previous ac state and start screen
  React.useEffect(() => {
    const wasAskAiActive = previousIsAskAiActive.current;
    previousIsAskAiActive.current = isAskAiActive;

    if (wasAskAiActive && !isAskAiActive) {
      autocomplete.refresh();

      // Reset only after leaving Ask AI, not when its first message arrives
      // before the parent toggle update commits.
      if (hasCurrentMessages) {
        startNewConversation();
      }
    }
  }, [isAskAiActive, autocomplete, startNewConversation, hasCurrentMessages]);

  // Track external state in order to manage internal askAiState
  React.useEffect(() => {
    setAskAiState('initial');
  }, [isAskAiActive, setAskAiState]);

  const onStopAskAiStreaming = async (): Promise<void> => {
    setStoppedStream(true);

    await stopAskAiStreaming();
  };

  const handleNewConversation = (): void => {
    startNewConversation();
    setAskAiState('new-conversation');
  };

  const handleViewConversationHistory = (): void => {
    setAskAiState('conversation-history');
  };

  const selectSuggestedQuestion = (
    suggestedQuestion: SuggestedQuestionHit
  ): void => {
    handleSelectAskAiQuestion(
      true,
      suggestedQuestion.question,
      suggestedQuestion
    );
  };

  // hide the dropdown on idle and no collections
  let showDocsearchDropdown = true;
  const hasCollections = state.collections.some(
    (collection) =>
      collection.source.sourceId !== SOURCE_IDS.askAI &&
      collection.items.length > 0
  );
  if (
    state.status === 'idle' &&
    hasCollections === false &&
    isQueryEmpty(state.query) &&
    !isAskAiActive
  ) {
    showDocsearchDropdown = false;
  }

  return (
    <ModalShell
      state={state}
      containerRef={containerRef}
      modalRef={modalRef}
      formElementRef={formElementRef}
      dropdownRef={dropdownRef}
      getRootProps={getRootProps}
      showDropdown={showDocsearchDropdown}
      searchBox={
        <AskAiSearchBox
          {...autocomplete}
          state={state}
          placeholder={placeholder || 'Search docs'}
          autoFocus={isQueryEmpty(initialQuery)}
          inputRef={inputRef}
          isFromSelection={
            Boolean(initialQuery) && initialQuery === initialQueryFromSelection
          }
          translations={searchBoxTranslations}
          isAskAiActive={isAskAiActive}
          askAiStatus={status}
          askAiError={askAiError}
          askAiState={askAiState}
          setAskAiState={setAskAiState}
          promptBlockingChrome={promptBlockingChrome}
          promptBlockingErrorId={promptBlockingErrorId}
          onClose={onClose}
          onAskAiToggle={onAskAiToggle}
          onAskAgain={(query) => {
            handleSelectAskAiQuestion(true, query);
          }}
          onStopAskAiStreaming={onStopAskAiStreaming}
          onNewConversation={handleNewConversation}
          onViewConversationHistory={handleViewConversationHistory}
        />
      }
      filterBar={
        !isAskAiActive && !isQueryEmpty(state.query) ? (
          <FacetBar
            facets={visibleFacets}
            selections={facetSelections}
            translations={facetBarTranslations}
            clearSelections={clearFacetSelections}
            onSelectionChange={handleFacetSelectionChange}
          />
        ) : null
      }
      screenState={
        <AskAiScreenState
          {...autocomplete}
          indexName={defaultIndexName}
          state={state}
          hitComponent={hitComponent}
          resultsFooterComponent={resultsFooterComponent}
          disableUserPersonalization={disableUserPersonalization}
          recentSearches={recentSearches}
          favoriteSearches={favoriteSearches}
          conversations={conversations}
          inputRef={inputRef}
          translations={screenStateTranslations}
          getMissingResultsUrl={getMissingResultsUrl}
          isAskAiActive={isAskAiActive}
          canHandleAskAi={canHandleAskAi}
          messages={messages}
          askAiError={askAiError}
          status={status}
          hasCollections={hasCollections}
          askAiState={askAiState}
          selectAskAiQuestion={handleSelectAskAiQuestion}
          suggestedQuestions={suggestedQuestions}
          selectSuggestedQuestion={selectSuggestedQuestion}
          resultBadgeKey={props.resultBadgeKey}
          promptBlockingErrorId={promptBlockingErrorId}
          onAskAiToggle={onAskAiToggle}
          onNewConversation={handleNewConversation}
          onItemClick={(item, event) => {
            if (item.type === 'askAI' && item.query) {
              if (item.anchor === 'stored' && 'messages' in item) {
                const hitMessages = item.messages as StoredAskAiMessage[];
                restoreConversation(
                  hitMessages,
                  (item as StoredAskAiState).chatId
                );
                const initialMessage: InitialAskAiMessage = {
                  query: item.query,
                  messageId: hitMessages[0].id,
                };

                if (interceptAskAiEvent?.(initialMessage)) {
                  if (autocompleteRef.current) {
                    autocompleteRef.current.setQuery('');
                  }
                  event.preventDefault();
                  return;
                }

                onAskAiToggle(true, initialMessage);
              } else {
                handleSelectAskAiQuestion(true, item.query);
              }
              setAskAiState('initial');
              event.preventDefault();
              return;
            }

            sendItemClickEvent(item);
            saveRecentSearch(item);
            if (!isModifierEvent(event)) {
              onClose();
            }
          }}
        />
      }
      footer={
        <Footer
          translations={footerTranslations}
          isAskAiActive={isAskAiActive}
          footerAction={footerAction}
        />
      }
      onClose={onClose}
    />
  );
}
