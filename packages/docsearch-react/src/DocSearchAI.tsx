import React, { type JSX } from 'react';
import { createPortal } from 'react-dom';
import {
  DocSearch as DocSearchProvider,
  useDocSearch,
} from 'typesense-docsearch-core';
import type {
  DocSearchRef,
  InitialAskAiMessage,
} from 'typesense-docsearch-core';

import type { DocSearchProps, DocSearchTranslations } from './DocSearch';
import {
  DocSearchAskAiModal,
  type DocSearchAskAiModalTranslations,
} from './DocSearchAskAiModal';
import { DocSearchButton } from './DocSearchButton';
import type { TypesenseAskAiSearchParameters } from './types/AskiAi';

export interface DocSearchAskAi {
  /** Typesense conversational model id. */
  conversationModelId: string;
  /**
   * Collection to query for conversational retrieval. Defaults to
   * `typesenseCollectionName`.
   */
  collection?: string;
  /**
   * Query field to use for conversational retrieval.
   *
   * @default 'embedding'
   */
  queryBy?: string;
  /**
   * Fields excluded from the conversational payload.
   *
   * @default 'embedding'
   */
  excludeFields?: string;
  /**
   * Additional Typesense search parameters for the conversational retrieval
   * request.
   */
  searchParameters?: TypesenseAskAiSearchParameters;
  /**
   * Static suggested questions shown in Ask AI entry points.
   *
   * TODO: Replace this with a Typesense-backed suggestions source instead of
   * shipping questions directly in frontend config.
   */
  suggestedQuestions?: string[];
}

export type DocSearchAITranslations = Partial<{
  button: DocSearchTranslations['button'];
  modal: DocSearchAskAiModalTranslations;
}>;

export interface DocSearchAIProps extends Omit<DocSearchProps, 'translations'> {
  /**
   * Configuration to enable ask ai mode. Pass a bare Typesense conversation
   * model id or a full config object.
   */
  askAi: DocSearchAskAi | string;
  /**
   * Intercept Ask AI requests (e.g. Submitting a prompt or selecting a
   * suggested question).
   *
   * Return `true` to prevent the default modal Ask AI flow (no toggle, no
   * sendMessage). Useful to route Ask AI into a different UI (e.g.
   * `typesense-docsearch-sidepanel-js`) without flicker.
   */
  interceptAskAiEvent?: (initialMessage: InitialAskAiMessage) => boolean | void;
  translations?: DocSearchAITranslations;
}

function DocSearchAIComponent(
  props: DocSearchAIProps,
  ref: React.ForwardedRef<DocSearchRef>
): JSX.Element {
  return (
    <DocSearchProvider {...props} ref={ref}>
      <DocSearchAIInner {...props} />
    </DocSearchProvider>
  );
}

export const DocSearchAI = React.forwardRef(DocSearchAIComponent);

export function DocSearchAIInner(props: DocSearchAIProps): JSX.Element {
  const {
    searchButtonRef,
    keyboardShortcuts,
    isModalActive,
    isAskAiActive,
    initialQuery,
    onAskAiToggle,
    openModal,
    closeModal,
    isHybridModeSupported,
  } = useDocSearch();

  return (
    <>
      <DocSearchButton
        keyboardShortcuts={keyboardShortcuts}
        ref={searchButtonRef}
        translations={props.translations?.button}
        onClick={openModal}
      />
      {isModalActive &&
        createPortal(
          <DocSearchAskAiModal
            {...props}
            initialScrollY={window.scrollY}
            initialQuery={initialQuery}
            translations={props?.translations?.modal}
            isAskAiActive={isAskAiActive}
            isHybridModeSupported={isHybridModeSupported}
            onAskAiToggle={onAskAiToggle}
            onClose={closeModal}
          />,
          props.portalContainer ?? document.body
        )}
    </>
  );
}
