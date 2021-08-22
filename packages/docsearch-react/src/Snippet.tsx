import { createElement } from 'react';

import { StoredDocSearchHit } from './types';

interface SnippetProps<TItem> {
  [prop: string]: unknown;
  hit: TItem;
  attribute: string;
  tagName?: string;
}

export function Snippet<TItem extends StoredDocSearchHit>({
  hit,
  attribute,
  tagName = 'span',
  ...rest
}: SnippetProps<TItem>) {
  return createElement(tagName, {
    ...rest,
    dangerouslySetInnerHTML: {
      __html:
        (hit._highlightResult
          ? hit._highlightResult[attribute]?.value
          : false) || hit[attribute],
    },
  });
}
