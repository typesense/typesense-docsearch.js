import {
  TYPESENSE_API_KEY,
  TYPESENSE_COLLECTION,
  TYPESENSE_PORT,
} from '../../setup/constants';

export const typesenseServerConfig = {
  apiKey: TYPESENSE_API_KEY,
  nodes: [
    { host: 'localhost', port: TYPESENSE_PORT, protocol: 'http' as const },
  ],
};

// `?collection=missing` points the widget at a collection that doesn't exist,
// for the error screen test.
export const collectionName =
  new URLSearchParams(window.location.search).get('collection') ??
  TYPESENSE_COLLECTION;

// Ask AI streams are faked in the specs (`askAiMock` fixture), so the model id
// never reaches a real Typesense conversation model.
export const askAi = { conversationModelId: 'e2e-conversation-model' };

export const facets = [
  { key: 'language', label: 'Language' },
  { key: 'version', label: 'Version' },
];
