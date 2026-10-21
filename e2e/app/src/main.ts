import 'typesense-docsearch-css/dist/style.css';
import 'typesense-docsearch-css/dist/sidepanel.css';

// The vanilla JS wrappers ship their own renderer, so they load on their own
// route instead of inside the React tree.
if (window.location.pathname === '/js') {
  await import('./vanilla');
} else {
  await import('./react');
}
