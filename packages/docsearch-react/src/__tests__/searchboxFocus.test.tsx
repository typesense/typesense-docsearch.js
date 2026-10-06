import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import ApiCall from 'typesense/lib/Typesense/ApiCall';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocSearchAskAiModal } from '../DocSearchAskAiModal';
import { DocSearchModal } from '../DocSearchModal';

const typesenseServerConfig = {
  apiKey: 'test-key',
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
};

describe.each([
  { name: 'keyword modal', Component: DocSearchModal },
  { name: 'Ask AI modal', Component: DocSearchAskAiModal },
])('search input focus in $name', ({ Component }) => {
  beforeEach(() => {
    vi.spyOn(ApiCall.prototype, 'post').mockResolvedValue({
      results: [
        {
          found: 0,
          hits: [],
          page: 1,
          search_time_ms: 1,
          request_params: { q: 'search', per_page: 20 },
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('reuses cached responses on clicks or refocus, including when there are no results', async () => {
    render(
      <Component
        typesenseCollectionName="docs"
        typesenseServerConfig={typesenseServerConfig}
        initialScrollY={0}
        askAi={{ conversationModelId: 'test-model' }}
        onAskAiToggle={vi.fn()}
      />
    );

    const input = screen.getByRole('searchbox');
    expect(ApiCall.prototype.post).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.input(input, { target: { value: 'search' } });
      await Promise.resolve();
    });
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(input);
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.blur(input);
      fireEvent.focus(input);
      fireEvent.click(input);
      await Promise.resolve();
    });

    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/No results found for/)).toBeDefined();

    await act(async () => {
      fireEvent.input(input, { target: { value: 'another search' } });
      await Promise.resolve();
    });
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(2);
  });

  it('fetches the initial query only once', async () => {
    await act(async () => {
      render(
        <Component
          typesenseCollectionName="docs"
          typesenseServerConfig={typesenseServerConfig}
          initialScrollY={0}
          initialQuery="search"
          askAi={{ conversationModelId: 'test-model' }}
          onAskAiToggle={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(1);
  });
});
