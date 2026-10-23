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

const searchParams = new URLSearchParams(window.location.search);

// `?collection=missing` points the widget at a collection that doesn't exist,
// for the error screen test.
export const collectionName =
  searchParams.get('collection') ?? TYPESENSE_COLLECTION;

// `?filter_by=…` sets an explicit `typesenseSearchParameters.filter_by`.
const filterBy = searchParams.get('filter_by');
export const typesenseSearchParameters = filterBy
  ? { filter_by: filterBy }
  : undefined;

// Ask AI streams are faked in the specs (`askAiMock` fixture), so the model id
// never reaches a real Typesense conversation model.
export const askAi = { conversationModelId: 'e2e-conversation-model' };

// `?version=…` preselects that version through `defaultValues`.
const defaultVersion = searchParams.get('version');
export const facets = [
  { key: 'language', label: 'Language' },
  {
    key: 'version',
    label: 'Version',
    defaultValues: defaultVersion ? [defaultVersion] : undefined,
  },
];
