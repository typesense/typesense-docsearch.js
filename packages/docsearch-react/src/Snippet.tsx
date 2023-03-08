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
  return createElement(tagName, {
    ...rest,
    dangerouslySetInnerHTML: {
      __html:
        (hit._snippetResult ? hit._snippetResult[attribute]?.value : false) ||
        hit[attribute],
    },
  });
}
