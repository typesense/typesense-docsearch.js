import { cleanup, renderHook } from '@testing-library/react';
import ApiCall from 'typesense/lib/Typesense/ApiCall';
import type { MultiSearchRequestSchema } from 'typesense/lib/Typesense/Types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchClient } from '../useSearchClient';
import { identity } from '../utils';

const typesenseServerConfig = {
  apiKey: 'test-key',
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
};

const request: MultiSearchRequestSchema<{ id: string }, string> = {
  collection: 'docs',
  q: 'search',
  query_by: 'content',
};

const response = {
  results: [
    {
      found: 0,
      hits: [],
      page: 1,
      search_time_ms: 1,
      request_params: { q: 'search', per_page: 20 },
    },
  ],
};

describe('useSearchClient caching', () => {
  beforeEach(() => {
    vi.spyOn(ApiCall.prototype, 'post').mockResolvedValue(response);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('deduplicates identical in-flight searches and reuses the completed response', async () => {
    let resolveRequest: (value: typeof response) => void = () => {};
    vi.mocked(ApiCall.prototype.post).mockReturnValueOnce(
      new Promise<typeof response>((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { result, rerender } = renderHook(() =>
      useSearchClient(identity, typesenseServerConfig)
    );

    const firstSearch = result.current.search({ requests: [request] });
    const secondSearch = result.current.search({ requests: [{ ...request }] });
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(1);

    resolveRequest(response);
    const responses = await Promise.all([firstSearch, secondSearch]);
    expect(responses[0]).toEqual(responses[1]);

    rerender();
    expect(await result.current.search({ requests: [request] })).toEqual(
      responses[0]
    );
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(1);
  });

  it('fetches new results when query, collection, or filters change', async () => {
    const { result } = renderHook(() =>
      useSearchClient(identity, typesenseServerConfig)
    );

    for (const parameters of [
      request,
      { ...request, q: 'another search' },
      { ...request, collection: 'guides' },
      { ...request, filter_by: 'language:=en' },
    ]) {
      await result.current.search({ requests: [parameters] });
    }

    await result.current.search({ requests: [request] });
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(4);
  });

  it.each([undefined, Infinity])(
    'does not expire cached results with a cache duration of %s',
    async (duration) => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
      const config = {
        ...typesenseServerConfig,
        cacheSearchResultsForSeconds: duration,
      };
      const { result, rerender } = renderHook(() =>
        useSearchClient(identity, config)
      );

      await result.current.search({ requests: [request] });
      now.mockReturnValue(1000 + 120 * 1000);
      await result.current.search({ requests: [request] });
      now.mockReturnValue(1000 + 365 * 24 * 60 * 60 * 1000);
      rerender();
      await result.current.search({ requests: [request] });

      expect(ApiCall.prototype.post).toHaveBeenCalledTimes(1);
    }
  );

  it('expires cached results after an explicitly configured duration', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const { result } = renderHook(() =>
      useSearchClient(identity, {
        ...typesenseServerConfig,
        cacheSearchResultsForSeconds: 5,
      })
    );

    await result.current.search({ requests: [request] });
    now.mockReturnValue(5999);
    await result.current.search({ requests: [request] });
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(1);

    now.mockReturnValue(6000);
    await result.current.search({ requests: [request] });
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(2);
  });

  it('allows caching to be explicitly disabled', async () => {
    const { result } = renderHook(() =>
      useSearchClient(identity, {
        ...typesenseServerConfig,
        cacheSearchResultsForSeconds: 0,
      })
    );

    await result.current.search({ requests: [request] });
    await result.current.search({ requests: [request] });

    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(2);
  });

  it('allows a failed search to be retried immediately', async () => {
    const error = new Error('Connection failed');
    vi.mocked(ApiCall.prototype.post).mockRejectedValueOnce(error);
    const { result } = renderHook(() =>
      useSearchClient(identity, typesenseServerConfig)
    );

    await expect(result.current.search({ requests: [request] })).rejects.toBe(
      error
    );
    await expect(
      result.current.search({ requests: [request] })
    ).resolves.toHaveProperty('results');
    expect(ApiCall.prototype.post).toHaveBeenCalledTimes(2);
  });
});
