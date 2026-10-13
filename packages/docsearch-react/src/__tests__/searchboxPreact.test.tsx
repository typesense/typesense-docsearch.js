import {
  createAutocomplete,
  type AutocompleteState,
} from '@algolia/autocomplete-core';
import { render, type VNode } from 'preact';
import { act } from 'preact/test-utils';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { SearchBoxForm } from '../components/ui/SearchBoxForm';
import type { InternalDocSearchHit } from '../types';

// The vanilla JS bundles render the shared React components using Preact.
vi.mock('react', async () => await import('preact/compat'));

describe('SearchBoxForm with Preact', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  it('preserves the input node and focus when the loading icon appears and disappears', () => {
    const inputRef = React.createRef<HTMLInputElement>();
    const autocomplete = createAutocomplete<
      InternalDocSearchHit,
      React.FormEvent,
      React.MouseEvent,
      React.KeyboardEvent
    >({});
    const renderForm = (
      status: AutocompleteState<InternalDocSearchHit>['status']
    ): void => {
      const form = (
        <SearchBoxForm
          {...autocomplete}
          state={{
            activeItemId: null,
            query: '',
            completion: null,
            collections: [],
            isOpen: false,
            status,
            context: {},
          }}
          autoFocus={false}
          inputRef={inputRef}
          isFromSelection={false}
          placeholder="Search docs"
          clearButtonTitle="Clear"
          clearButtonAriaLabel="Clear the query"
          closeButtonText="Close"
          closeButtonAriaLabel="Close"
          searchInputLabel="Search"
          onClose={vi.fn()}
        />
      );
      // JSX uses the mocked Preact runtime, while TS retains React's JSX types.
      act(() => render(form as unknown as VNode, container));
    };

    renderForm('idle');
    const input = inputRef.current!;
    input.focus();
    expect(input).toHaveFocus();

    for (const status of ['loading', 'stalled', 'idle'] as const) {
      renderForm(status);
      expect(
        Boolean(container.querySelector('.DocSearch-LoadingIndicator'))
      ).toBe(status === 'stalled');
      expect(container.querySelector('input')).toBe(input);
      expect(inputRef.current).toBe(input);
      expect(input).toHaveFocus();
    }
  });
});
