import React, { render } from 'preact/compat';
import type { DocSearchProps as DocSearchComponentProps } from 'typesense-docsearch-react';
import { DocSearch } from 'typesense-docsearch-react';

function getHTMLElement(
  value: HTMLElement | string,
  environment: DocSearchProps['environment'] = window
): HTMLElement {
  if (typeof value === 'string') {
    return environment.document.querySelector<HTMLElement>(value)!;
  }

  return value;
}

interface DocSearchProps extends DocSearchComponentProps {
  container: HTMLElement | string;
  environment?: typeof window;
}

export function docsearch(props: DocSearchProps) {
  render(
    <DocSearch {...props} />,
    getHTMLElement(props.container, props.environment)
  );
}
