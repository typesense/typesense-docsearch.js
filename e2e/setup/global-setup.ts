import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import {
  TYPESENSE_API_KEY,
  TYPESENSE_COLLECTION,
  TYPESENSE_PORT,
} from './constants';

const TYPESENSE_IMAGE = 'typesense/typesense:30.2';
const CONTAINER_NAME = 'docsearch-e2e-typesense';
const TYPESENSE_URL = `http://localhost:${TYPESENSE_PORT}`;
const HEALTH_TIMEOUT_MS = 60_000;

// Mirrors the schema typesense-docsearch-scraper creates, minus `locale`.
const COLLECTION_SCHEMA = {
  name: TYPESENSE_COLLECTION,
  fields: [
    { name: 'anchor', type: 'string', optional: true },
    { name: 'content', type: 'string', optional: true },
    { name: 'url', type: 'string', facet: true },
    {
      name: 'url_without_anchor',
      type: 'string',
      facet: true,
      optional: true,
    },
    { name: 'version', type: 'string[]', facet: true, optional: true },
    ...[0, 1, 2, 3, 4, 5, 6].map((level) => ({
      name: `hierarchy.lvl${level}`,
      type: 'string',
      facet: true,
      optional: true,
    })),
    { name: 'type', type: 'string', facet: true, optional: true },
    { name: 'language', type: 'string', facet: true, optional: true },
    { name: 'item_priority', type: 'int64' },
  ],
  default_sorting_field: 'item_priority',
  token_separators: ['_', '-'],
};

async function isHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${TYPESENSE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isHealthy()) {
      return;
    }

    await sleep(250);
  }

  throw new Error(
    `Typesense did not become healthy on ${TYPESENSE_URL} within ${HEALTH_TIMEOUT_MS}ms.`
  );
}

function docker(args: string[]): void {
  execFileSync('docker', args, { stdio: 'inherit' });
}

/**
 * Starts a throwaway Typesense container unless one already answers on the test
 * port. Returns a teardown that stops the container only when this run started
 * it.
 */
async function startTypesense(): Promise<(() => void) | undefined> {
  if (await isHealthy()) {
    return undefined;
  }

  // A container left behind by an interrupted run would hold the name.
  execFileSync('docker', ['rm', '--force', CONTAINER_NAME], {
    stdio: 'ignore',
  });
  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    CONTAINER_NAME,
    '--publish',
    `${TYPESENSE_PORT}:8108`,
    TYPESENSE_IMAGE,
    '--data-dir',
    '/tmp',
    `--api-key=${TYPESENSE_API_KEY}`,
    '--enable-cors',
  ]);
  await waitForHealth();

  return (): void => docker(['stop', CONTAINER_NAME]);
}

async function typesenseRequest(
  method: string,
  path: string,
  body?: string,
  contentType = 'application/json'
): Promise<Response> {
  return await fetch(`${TYPESENSE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': contentType,
      'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY,
    },
    body,
  });
}

async function seed(): Promise<void> {
  const deleteResponse = await typesenseRequest(
    'DELETE',
    `/collections/${TYPESENSE_COLLECTION}`
  );
  if (!deleteResponse.ok && deleteResponse.status !== 404) {
    throw new Error(
      `Failed to drop collection: ${await deleteResponse.text()}`
    );
  }

  const createResponse = await typesenseRequest(
    'POST',
    '/collections',
    JSON.stringify(COLLECTION_SCHEMA)
  );
  if (!createResponse.ok) {
    throw new Error(
      `Failed to create collection: ${await createResponse.text()}`
    );
  }

  const documents = readFileSync(
    new URL('./docs.jsonl', import.meta.url),
    'utf-8'
  );
  const importResponse = await typesenseRequest(
    'POST',
    `/collections/${TYPESENSE_COLLECTION}/documents/import?action=create`,
    documents,
    'text/plain'
  );
  const failures = (await importResponse.text())
    .split('\n')
    .filter((line) => !line.includes('"success":true'));
  if (!importResponse.ok || failures.length > 0) {
    throw new Error(`Failed to import documents:\n${failures.join('\n')}`);
  }
}

export default async function globalSetup(): Promise<(() => void) | undefined> {
  const stopTypesense = await startTypesense();
  await seed();

  return stopTypesense;
}
