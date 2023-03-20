import { createElement } from 'react';

import type { StoredDocSearchHit } from './types';

interface SnippetProps<TItem> {
  hit: TItem;
  attribute: string;
  tagName?: string;
  [prop: string]: unknown;
}

export function Snippet<TItem extends StoredDocSearchHit>({
  hit,
  attribute,
  tagName = 'span',
  ...rest
}: SnippetProps<TItem>) {
  let displayValue = hit._highlightResult[attribute]?.value || hit[attribute];

  if (hit._snippetResult?.[attribute]?.value) {
    let snippetValue = hit._snippetResult[attribute]?.value;
    if (displayValue.substring(0, 20) !== snippetValue.substring(0, 20)) {
      snippetValue = `… ${snippetValue}`;
    }
    if (
      displayValue.substring(displayValue.length - 20, displayValue.length) !==
      snippetValue.substring(snippetValue.length - 20, snippetValue.length)
    ) {
      snippetValue = `${snippetValue} …`;
    }

    displayValue = snippetValue;
  }

  return createElement(tagName, {
    ...rest,
    dangerouslySetInnerHTML: {
      __html: displayValue,
    },
  });
}
