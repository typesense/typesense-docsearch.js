import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import React, { type JSX } from 'react';

export function Collapsible({
  ...props
}: CollapsiblePrimitive.Root.Props): JSX.Element {
  return <CollapsiblePrimitive.Root {...props} />;
}

function CollapsiblePanel({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props): JSX.Element {
  const cn = `DocSearch-Collapsible-Panel${className ? ` ${className}` : ''}`;
  return <CollapsiblePrimitive.Panel className={cn} {...props} />;
}

Collapsible.Panel = CollapsiblePanel;
