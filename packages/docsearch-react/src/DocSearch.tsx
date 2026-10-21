import type {
  AutocompleteOptions,
  AutocompleteState,
} from '@algolia/autocomplete-core';
import type { SearchResponses } from 'algoliasearch/lite';
import React, { type JSX } from 'react';
import { createPortal } from 'react-dom';
import {
  DocSearch as DocSearchProvider,
  useDocSearch,
} from 'typesense-docsearch-core';
import type {
  DocSearchModalShortcuts,
  DocSearchRef,
} from 'typesense-docsearch-core';
import type { ConfigurationOptions as TypesenseConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import type {
  DocumentSchema,
  SearchParams as TypesenseSearchParams,
} from 'typesense/lib/Typesense/Documents';
import type { MultiSearchRequestSchema } from 'typesense/lib/Typesense/Types';

import { DocSearchButton } from './DocSearchButton';
import type { ButtonTranslations } from './DocSearchButton';
import { DocSearchModal } from './DocSearchModal';
import type { ModalTranslations } from './DocSearchModal';
import type {
  DocSearchHit,
  DocSearchTheme,
  InternalDocSearchHit,
  StoredDocSearchHit,
} from './types';

export type { DocSearchRef } from 'typesense-docsearch-core';

export type DocSearchTranslations = Partial<{
  button: ButtonTranslations;
  modal: ModalTranslations;
}>;

// The minimal implementation required for the Typesense client, when using the
// `transformSearchClient` option.
export type TypesenseDocsearchTransformClient = {
  search: <T extends DocumentSchema>(searchMethodParams: {
    requests: Array<MultiSearchRequestSchema<T, string>>;
  }) => Promise<SearchResponses<T>>;
};

export interface DocSearchFacet {
  key: string;
  label?: string;
}

export interface HitComponentProps {
  hit: InternalDocSearchHit | StoredDocSearchHit;
  children: React.ReactNode;
}

export interface ResultsFooterComponentProps {
  state: AutocompleteState<InternalDocSearchHit>;
}

export interface DocSearchProps {
  /** Typesense collection name to query. */
  typesenseCollectionName: string;
  /** Typesense server configuration for the client. */
  typesenseServerConfig: TypesenseConfigurationOptions;
  /** Additional Typesense search parameters to merge into each query. */
  typesenseSearchParameters?: TypesenseSearchParams<
    Record<string, unknown>,
    string
  >;
  /**
   * Facets to display as keyword-search filter controls. Values are read
   * dynamically from the configured Typesense collection. Several values can be
   * selected per facet: values of one facet are ORed, facets are ANDed. While
   * any value is selected, the generated `filter_by` replaces the one in
   * `typesenseSearchParameters`.
   *
   * @default [ ]
   */
  facets?: DocSearchFacet[];
  /** Theme overrides applied to the modal and related components. */
  theme?: DocSearchTheme;
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Maximum number of hits to display per source/group. */
  maxResultsPerGroup?: number;
  /**
   * Show the hierarchy breadcrumb next to each hit's title.
   *
   * @default false
   */
  showHitBreadcrumbs?: boolean;
  /** Hook to post-process hits before rendering. */
  transformItems?: (items: DocSearchHit[]) => DocSearchHit[];
  /** Custom component to render an individual hit. */
  hitComponent?: (props: HitComponentProps) => JSX.Element;
  /** Custom component rendered at the bottom of the results panel. */
  resultsFooterComponent?: (
    props: ResultsFooterComponentProps
  ) => JSX.Element | null;
  /**
   * A custom action that can be rendered in the Modal's footer before the
   * Algolia logo. The component will be rendered as a child of `<div
   * className="DocSearch-Footer-Action" />`.
   */
  footerAction?: React.ReactNode;
  /** Hook to wrap or modify the Typesense search client. */
  transformSearchClient?: (
    searchClient: TypesenseDocsearchTransformClient
  ) => TypesenseDocsearchTransformClient;
  /** Disable storage and usage of recent and favorite searches. */
  disableUserPersonalization?: boolean;
  /** Query string to prefill when opening the modal. */
  initialQuery?: string;
  /** Custom navigator for controlling link navigation. */
  navigator?: AutocompleteOptions<InternalDocSearchHit>['navigator'];
  /** Localized strings for the button and modal ui. */
  translations?: DocSearchTranslations;
  /** Builds a url to report missing results for a given query. */
  getMissingResultsUrl?: ({ query }: { query: string }) => string;
  /** Insights client integration options to send analytics events. */
  insights?: AutocompleteOptions<InternalDocSearchHit>['insights'];
  /**
   * The container element where the modal should be portaled to. Defaults to
   * document.body.
   */
  portalContainer?: DocumentFragment | Element;
  /**
   * Limit of how many recent searches should be saved/displayed..
   *
   * @default 7
   */
  recentSearchesLimit?: number;
  /**
   * Limit of how many recent searches should be saved/displayed when there are
   * favorited searches..
   *
   * @default 4
   */
  recentSearchesWithFavoritesLimit?: number;
  /**
   * Configuration for keyboard shortcuts. Allows enabling/disabling specific
   * shortcuts.
   *
   * @default `{ 'Ctrl/Cmd+K': true, '/': true }`
   */
  keyboardShortcuts?: DocSearchModalShortcuts;
  /**
   * The key used to render a custom badge for each hit. Key must match a
   * property returned in `searchParameters.attributesToRetrieve`.
   *
   * @example
   *   'version';
   *   'hierarchy.lvl1';
   *   'tags[2]';
   *
   * @default undefined
   */
  resultBadgeKey?: string;
}

function DocSearchComponent(
  props: DocSearchProps,
  ref: React.ForwardedRef<DocSearchRef>
): JSX.Element {
  return (
    <DocSearchProvider {...props} ref={ref}>
      <DocSearchInner {...props} />
    </DocSearchProvider>
  );
}

export const DocSearch = React.forwardRef(DocSearchComponent);

export function DocSearchInner(props: DocSearchProps): JSX.Element {
  const {
    searchButtonRef,
    keyboardShortcuts,
    isModalActive,
    initialQuery,
    openModal,
    closeModal,
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
          <DocSearchModal
            {...props}
            initialScrollY={window.scrollY}
            initialQuery={initialQuery}
            translations={props?.translations?.modal}
            onClose={closeModal}
          />,
          props.portalContainer ?? document.body
        )}
    </>
  );
}
