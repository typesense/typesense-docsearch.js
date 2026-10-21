// Shared by the Playwright global setup (Node) and the test app (Vite).
// Port 8109 rather than Typesense's default 8108 so a local server on 8108
// isn't picked up by mistake.
export const TYPESENSE_PORT = 8109;
export const TYPESENSE_API_KEY = 'xyz';
export const TYPESENSE_COLLECTION = 'docsearch';
